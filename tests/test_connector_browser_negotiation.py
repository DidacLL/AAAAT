from __future__ import annotations

import io
import json
import struct
import tempfile
import unittest

from aaaat.assistance_service import external_host_instructions
from aaaat.browser_companion import PROTOCOL, VERSION, dispatch_native_message, run_native_host
from aaaat.db import connect, init_db
from aaaat.runtime_conformance import validate_runtime_proposal
from aaaat.tasks import create_task


class BrowserWrapperTests(unittest.TestCase):
    def test_external_host_instructions_keep_direction_and_authority_clear(self) -> None:
        lowered = external_host_instructions("unused").lower()
        self.assertIn("external host initiates every call", lowered)
        self.assertIn("existing bounded task queue", lowered)
        self.assertIn("mcp", lowered)
        self.assertIn("http", lowered)
        self.assertIn("canonical result-ingestion", lowered)
        for forbidden in ("install connector", "generated package", "provider catalogue", "launch an llm"):
            self.assertNotIn(forbidden, lowered)

    def test_runtime_proposal_is_advisory_and_bounded_for_advanced_command(self) -> None:
        proposal = validate_runtime_proposal({
            "conformance_nonce": "nonce",
            "runtime_name": "User-owned command",
            "model_name": "Externally selected",
            "supports_structured_json": True,
            "supports_research": False,
            "recommended_timeout_seconds": 120,
        }, "nonce")
        self.assertEqual(proposal["runtime_name"], "User-owned command")
        self.assertEqual(proposal["recommended_timeout_seconds"], 120)
        with self.assertRaisesRegex(ValueError, "forbidden"):
            validate_runtime_proposal({"conformance_nonce": "nonce", "runtime_name": "x", "model_name": "y", "command": "rm -rf /"}, "nonce")

    def test_browser_native_host_exposes_only_bounded_task_operations(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_task(conn, "profile_completion", "Complete profile")
            next_response = dispatch_native_message(tmp, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "next_task"})
            self.assertEqual(next_response["status"], "ready")
            task = next_response["task"]
            self.assertTrue(task["task_handle"].startswith("taskh_"))
            self.assertNotIn("application_id", json.dumps(task))
            context_response = dispatch_native_message(tmp, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "task_context", "task_handle": task["task_handle"]})
            self.assertEqual(context_response["status"], "ready")
            serialized = json.dumps(context_response)
            for forbidden in ("storage_path", "database_path", "application_id"):
                self.assertNotIn(forbidden, serialized)
            unsupported = dispatch_native_message(tmp, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "list_applications"})
            self.assertEqual(unsupported, {"status": "error", "error": "unsupported_action"})

    def test_native_host_uses_browser_length_prefixed_messages(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            request = json.dumps({"protocol": PROTOCOL, "protocol_version": VERSION, "action": "next_task"}).encode("utf-8")
            source = io.BytesIO(struct.pack("<I", len(request)) + request)
            target = io.BytesIO()
            self.assertEqual(run_native_host(tmp, source, target), 0)
            target.seek(0)
            size = struct.unpack("<I", target.read(4))[0]
            response = json.loads(target.read(size).decode("utf-8"))
            self.assertEqual(response["status"], "empty")


if __name__ == "__main__":
    unittest.main()
