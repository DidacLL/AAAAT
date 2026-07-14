from __future__ import annotations

import io
import json
import struct
import tempfile
import unittest
from pathlib import Path

from aaaat.browser_companion import PROTOCOL, VERSION, dispatch_native_message, run_native_host
from aaaat.connector_packages import connector_construction_prompt, install_connector_package, parse_connector_package, preview_connector_package
from aaaat.db import connect, init_db
from aaaat.runtime_conformance import validate_runtime_proposal
from aaaat.tasks import create_task


def _package() -> dict:
    return {
        "protocol": "aaaat.connector-package",
        "manifest": {"name": "test-connector", "entrypoint": "connector.py", "argv": ["connector.py"], "prompt_transport": "stdin", "result_transport": "stdout"},
        "files": {
            "connector.py": "#!/usr/bin/env python3\nimport json,sys\ntask=json.load(sys.stdin)\nprint(json.dumps({'result':'ok'}))\n",
            "README.md": "Generated connector test fixture.",
        },
    }


class ConnectorBrowserNegotiationTests(unittest.TestCase):
    def test_connector_package_is_previewed_and_installed_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            parsed = parse_connector_package(_package())
            preview = preview_connector_package(parsed)
            self.assertEqual(preview["manifest"]["name"], "test-connector")
            self.assertEqual({item["path"] for item in preview["files"]}, {"connector.py", "README.md"})
            installed = install_connector_package(tmp, parsed)
            self.assertEqual(installed["status"], "installed_disabled")
            self.assertTrue(Path(installed["directory"], "connector.py").is_file())
            self.assertTrue(installed["argv"][-1].endswith("connector.py"))

    def test_connector_package_rejects_traversal_and_forbidden_code(self) -> None:
        invalid = _package()
        invalid["files"] = {"../escape.py": "print('bad')"}
        with self.assertRaisesRegex(ValueError, "Unsafe connector path"):
            parse_connector_package(invalid)

        forbidden = _package()
        forbidden["files"]["connector.py"] = "import socket\ns=socket.socket();s.listen(3)\n"
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, "forbidden pattern"):
                install_connector_package(tmp, forbidden)

    def test_construction_prompt_contains_no_credentials_or_ports(self) -> None:
        lowered = connector_construction_prompt().lower()
        self.assertNotIn("api key", lowered)
        self.assertNotIn("bearer", lowered)
        self.assertIn("listening ports", lowered)
        self.assertIn("stdin", lowered)
        self.assertIn("stdout", lowered)

    def test_runtime_proposal_is_advisory_and_bounded(self) -> None:
        proposal = validate_runtime_proposal({
            "conformance_nonce": "nonce",
            "runtime_name": "Local Runtime",
            "model_name": "Model A",
            "supports_structured_json": True,
            "supports_research": False,
            "recommended_timeout_seconds": 120,
        }, "nonce")
        self.assertEqual(proposal["runtime_name"], "Local Runtime")
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
