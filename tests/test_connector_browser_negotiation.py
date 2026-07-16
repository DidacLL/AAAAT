from __future__ import annotations

import io
import json
import os
import struct
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.assistance_service import export_browser_companion_package, external_host_instructions
from aaaat.browser_companion import PROTOCOL, VERSION, browser_extension_bundle, dispatch_native_message, native_host_manifest, run_native_host
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

    def test_browser_native_host_returns_one_complete_bounded_work_item(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_task(conn, "profile_completion", "Complete profile")
            next_response = dispatch_native_message(tmp, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "next_work"})
            self.assertEqual(next_response["status"], "ready")
            work = next_response["work"]
            capability = work["task"]["task_capability"]
            self.assertTrue(capability.startswith("taskcap_"))
            self.assertIn("input_context", work)
            self.assertIn("response_format", work)
            serialized = json.dumps(work)
            for forbidden in ("storage_path", "database_path", "application_id", "task_id"):
                self.assertNotIn(forbidden, serialized)
            unsupported = dispatch_native_message(tmp, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "task_context", "task_capability": capability})
            self.assertEqual(unsupported, {"status": "error", "error": "unsupported_action"})

    def test_browser_round_trip_reports_progress_then_submits_without_storage_leak(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                task = create_task(conn, "keyword_definition", "Define browser flow", context_hint="keyword:Browser", idempotent=False)
            claimed = dispatch_native_message(tmp, {"protocol": PROTOCOL, "protocol_version": VERSION, "action": "next_work"})
            capability = claimed["work"]["task"]["task_capability"]
            progressed = dispatch_native_message(tmp, {
                "protocol": PROTOCOL, "protocol_version": VERSION, "action": "report_progress",
                "task_capability": capability, "phase": "working", "message": "Using selected chat AI", "percent": 50,
            })
            self.assertEqual(progressed["progress"]["sequence"], 1)
            submitted = dispatch_native_message(tmp, {
                "protocol": PROTOCOL, "protocol_version": VERSION, "action": "submit_result",
                "task_capability": capability, "result": {"definition": "A browser-native flow."},
            })
            self.assertEqual(submitted["status"], "accepted")
            with connect(tmp) as conn:
                self.assertEqual(conn.execute("SELECT state FROM tasks WHERE id = ?", (task["id"],)).fetchone()[0], "completed")
            manifest = json.dumps(native_host_manifest(tmp, "browser-host"))
            self.assertNotIn(tmp, manifest)
            self.assertNotIn("storage", manifest.lower())
            popup = browser_extension_bundle()["popup.js"]
            self.assertIn("report_progress", popup)
            self.assertIn("submit_result", popup)

    @unittest.skipUnless(os.name == "nt", "Windows launcher behavior is validated on Windows")
    def test_exported_windows_browser_companion_has_a_runnable_native_host_launcher(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            with connect(storage) as conn:
                create_task(conn, "keyword_definition", "Launcher flow", context_hint="keyword:Launcher", idempotent=False)
            host = Path(tmp) / "test-browser-host.cmd"
            host.write_text(f'@echo off\r\n"{sys.executable}" -m aaaat.browser_companion\r\n', encoding="utf-8")
            target = export_browser_companion_package(storage, Path(tmp) / "companion", host)
            manifest = json.loads((target / "native-host-manifest.json").read_text(encoding="utf-8"))
            launcher = Path(manifest["path"])
            self.assertTrue(launcher.is_file())
            self.assertNotIn(str(storage), json.dumps(browser_extension_bundle()))
            request = json.dumps({"protocol": PROTOCOL, "protocol_version": VERSION, "action": "next_work"}).encode("utf-8")
            process = subprocess.Popen([str(launcher)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            assert process.stdin is not None and process.stdout is not None
            process.stdin.write(struct.pack("<I", len(request)) + request)
            process.stdin.flush()
            size = struct.unpack("<I", process.stdout.read(4))[0]
            response = json.loads(process.stdout.read(size).decode("utf-8"))
            process.stdin.close()
            process.wait(timeout=10)
            process.stdout.close()
            assert process.stderr is not None
            process.stderr.close()
            self.assertEqual(response["status"], "ready")

    def test_native_host_uses_browser_length_prefixed_messages(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            request = json.dumps({"protocol": PROTOCOL, "protocol_version": VERSION, "action": "next_work"}).encode("utf-8")
            source = io.BytesIO(struct.pack("<I", len(request)) + request)
            target = io.BytesIO()
            self.assertEqual(run_native_host(tmp, source, target), 0)
            target.seek(0)
            size = struct.unpack("<I", target.read(4))[0]
            response = json.loads(target.read(size).decode("utf-8"))
            self.assertEqual(response["status"], "empty")


if __name__ == "__main__":
    unittest.main()
