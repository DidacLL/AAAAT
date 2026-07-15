from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.assistance_service import assistance_snapshot, save_integration, use_manual_integration
from aaaat.candidatures import create_candidature
from aaaat.db import connect, init_db
from aaaat.tasks import create_task, update_task


class AssistanceServiceTests(unittest.TestCase):
    def test_snapshot_exposes_presentation_state_and_task_permissions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            with connect(storage) as conn:
                candidature = create_candidature(conn, company="Example", role="Engineer")
                queued = create_task(conn, "field_inference", "Infer fields", application_id=candidature["id"])
                failed = create_task(conn, "company_research", "Research", application_id=candidature["id"], idempotent=False)
                update_task(conn, failed["id"], state="failed", notes="runtime failed")

            snapshot = assistance_snapshot(storage, include_advanced=True)
            self.assertIn("integration", snapshot)
            self.assertTrue(any(option["id"] == "argv_custom_command" for option in snapshot["options"]))
            self.assertTrue(any(option["id"] == "llama_cpp_cli" for option in snapshot["options"]))
            by_id = {item["id"]: item for item in snapshot["tasks"]}
            self.assertTrue(by_id[queued["id"]]["can_run"])
            self.assertTrue(by_id[queued["id"]]["can_cancel"])
            self.assertFalse(by_id[queued["id"]]["can_retry"])
            self.assertTrue(by_id[failed["id"]]["can_retry"])
            self.assertIn("runtime failed", by_id[failed["id"]]["notes"])

    def test_failed_health_check_does_not_replace_current_integration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            script = Path(tmp) / "connector.py"
            script.write_text("import json,sys; json.load(sys.stdin); print(json.dumps({'result':'ok'}))", encoding="utf-8")
            ready = save_integration(
                storage,
                "argv_custom_command",
                {"argv": [sys.executable, str(script)], "timeout_seconds": 10},
            )
            self.assertTrue(ready["saved"])

            failed = save_integration(
                storage,
                "llama_cpp_cli",
                {"executable": "missing-aaaat-runtime", "model_path": str(Path(tmp) / "missing.gguf")},
            )
            self.assertFalse(failed["saved"])
            current = assistance_snapshot(storage)["integration"]
            self.assertEqual(current["id"], "argv_custom_command")

            manual = use_manual_integration(storage)
            self.assertEqual(manual["id"], "manual_external_agent")


if __name__ == "__main__":
    unittest.main()
