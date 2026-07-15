from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.agent_access import next_agent_work_item, submit_agent_task_result, task_capability
from aaaat.assistance_service import create_profile_completion_task
from aaaat.db import connect, init_db, profile_variables, set_profile_variable
from aaaat.runtime_conformance import bootstrap_manifest, read_conformance_state, run_configured_runtime_conformance
from aaaat.task_runner import TaskRunner
from aaaat.workspace_config import save_workspace_settings


class ProfileCompletionTaskTests(unittest.TestCase):
    def test_profile_completion_uses_complete_bounded_work_and_preserves_existing_values(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            with connect(storage) as conn:
                set_profile_variable(conn, "profile.display_name", "Existing Name")
            task = create_profile_completion_task(storage)

            with connect(storage) as conn:
                work = next_agent_work_item(conn)
                capability = work["task"]["task_capability"]
                self.assertEqual(work["purpose"], "professional_profile_completion")
                self.assertIn("profile.display_name", work["input_context"]["protected_fields"])
                self.assertIn("profile.summary.default", work["input_context"]["missing_fields"])
                serialized = json.dumps(work)
                for forbidden in ("application_id", "profile_id", "storage_path", str(storage)):
                    self.assertNotIn(forbidden, serialized)

                completed = submit_agent_task_result(
                    conn,
                    capability,
                    json.dumps({
                        "variables": {
                            "profile.display_name": "Replacement",
                            "profile.summary.default": "Reliable local-software engineer.",
                        }
                    }),
                    agent_name="fake-model",
                    agent_runtime="test-runtime",
                )
                self.assertEqual(completed["profile_update"]["updated"], ["profile.summary.default"])
                self.assertEqual(completed["profile_update"]["skipped"], ["profile.display_name"])
                values = profile_variables(conn)
                self.assertEqual(values["profile.display_name"], "Existing Name")
                self.assertEqual(values["profile.summary.default"], "Reliable local-software engineer.")

    def test_profile_completion_rejects_unknown_profile_authority(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            task = create_profile_completion_task(storage)
            with connect(storage) as conn:
                capability = task_capability(conn, task)
                with self.assertRaisesRegex(ValueError, "not permitted"):
                    submit_agent_task_result(
                        conn,
                        capability,
                        json.dumps({"variables": {"profile.internal_id": "forbidden"}}),
                    )


class RuntimeConformanceTests(unittest.TestCase):
    def test_bootstrap_manifest_contains_only_bounded_runtime_primitives(self) -> None:
        manifest = bootstrap_manifest(
            "argv_custom_command",
            {"argv": ["local-runtime-connector", "--fixed"], "timeout_seconds": 30},
        )
        self.assertEqual(manifest["protocol"], "aaaat.runtime-bootstrap")
        self.assertTrue(manifest["verification"]["claims_are_advisory_until_verified"])
        serialized = json.dumps(manifest)
        for forbidden in ("api_key", "token", "password", "storage_path"):
            self.assertNotIn(forbidden, serialized)

    def test_conformance_requires_exact_challenge_echo_and_persists_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            save_workspace_settings(
                storage,
                automatic_preparation=[],
                local_agent_adapter_id="argv_custom_command",
                local_agent_adapter_settings={
                    "argv": ["local-runtime-connector", "--fixed"],
                    "timeout_seconds": 30,
                },
            )

            def fake_execute(_runner: TaskRunner, _adapter_id: str, _settings: dict, context: dict):
                nonce = context["input_context"]["challenge_nonce"]
                return json.dumps({"conformance_nonce": nonce, "status": "ready", "runtime_name": "fake", "model_name": "fixture"}), {
                    "agent_runtime": "fake-runtime"
                }

            with patch("aaaat.runtime_conformance.adapter_health", return_value={"status": "ready", "message": "ok"}), patch.object(
                TaskRunner, "_execute_adapter", autospec=True, side_effect=fake_execute
            ):
                report = run_configured_runtime_conformance(storage)

            self.assertEqual(report["status"], "passed")
            self.assertEqual(report["self_description"]["runtime_name"], "fake")
            self.assertEqual(read_conformance_state(storage)["status"], "passed")

    def test_runner_emits_ordered_progress_phases(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            task = create_profile_completion_task(storage)
            save_workspace_settings(
                storage,
                automatic_preparation=[],
                local_agent_adapter_id="argv_custom_command",
                local_agent_adapter_settings={"argv": ["fake"], "timeout_seconds": 30},
            )
            events: list[dict] = []
            runner = TaskRunner(storage, on_progress=events.append)
            with patch.object(
                runner,
                "_execute_adapter",
                return_value=(json.dumps({"variables": {"profile.summary.default": "Completed"}}), {"agent_runtime": "fake"}),
            ):
                runner.run(str(task["id"]))

            phases = [event["phase"] for event in events]
            self.assertEqual(
                phases,
                ["preparing_context", "invoking_runtime", "validating_result", "applying_result", "completed"],
            )
            self.assertEqual([event["sequence"] for event in events], [1, 2, 3, 4, 5])
            self.assertEqual(events[-1]["percent"], 100)


if __name__ == "__main__":
    unittest.main()
