from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.assistance_service import assistance_snapshot, save_integration, use_manual_integration
from aaaat.candidatures import create_candidature
from aaaat.db import connect, init_db
from aaaat.tasks import create_task, update_task


class AssistanceServiceTests(unittest.TestCase):
    def test_snapshot_exposes_provider_neutral_options_and_task_permissions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            with connect(storage) as conn:
                candidature = create_candidature(conn, company="Example", role="Engineer")
                queued = create_task(conn, "field_inference", "Infer fields", application_id=candidature["id"])
                failed = create_task(conn, "company_research", "Research", application_id=candidature["id"], idempotent=False)
                update_task(conn, failed["id"], state="failed", notes="runtime failed")
            snapshot = assistance_snapshot(storage, include_advanced=True)
            self.assertEqual(snapshot["connection"]["state"], "ready_to_connect")
            self.assertTrue(all(bool(option["advanced"]) or option["id"] == "no_ai_connection" for option in snapshot["options"]))
            self.assertEqual(
                {option["id"] for option in snapshot["options"]},
                {"no_ai_connection", "portable_bundle", "file_exchange", "user_command"},
            )
            by_id = {item["id"]: item for item in snapshot["tasks"]}
            self.assertFalse(by_id[queued["id"]]["can_run"])
            self.assertTrue(by_id[failed["id"]]["can_retry"])

    def test_failed_generic_command_health_does_not_replace_current_integration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            script = Path(tmp) / "connector.py"
            script.write_text("import json,sys; json.load(sys.stdin); print(json.dumps({'result':'ok'}))", encoding="utf-8")
            ready = save_integration(storage, "user_command", {"argv": [sys.executable, str(script)], "timeout_seconds": 10})
            self.assertTrue(ready["saved"])
            with patch("aaaat.integration_setup.integration_health", return_value={"status": "error", "message": "unavailable"}):
                failed = save_integration(storage, "user_command", {"argv": ["missing"]})
            self.assertFalse(failed["saved"])
            current = assistance_snapshot(storage)["integration"]
            self.assertEqual(current["id"], "user_command")
            manual = use_manual_integration(storage)
            self.assertEqual(manual["id"], "no_ai_connection")


if __name__ == "__main__":
    unittest.main()
