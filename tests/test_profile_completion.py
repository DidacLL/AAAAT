from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.agent_access import submit_agent_task_result, task_capability
from aaaat.agent_work import claim_agent_work, claim_next_agent_work
from aaaat.assistance_service import create_profile_completion_task
from aaaat.db import connect, ensure_workspace_database, profile_variables, set_profile_variable
from aaaat.integration_readiness import integration_readiness
from aaaat.task_runner import TaskRunner
from aaaat.tasks import get_task
from aaaat.workspace_config import save_workspace_settings


class ProfileCompletionTaskTests(unittest.TestCase):
    def test_profile_completion_uses_complete_bounded_work_and_preserves_existing_values(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            ensure_workspace_database(storage)
            with connect(storage) as conn:
                set_profile_variable(conn, "profile.display_name", "Existing Name")
            create_profile_completion_task(storage)

            with connect(storage) as conn:
                work = claim_next_agent_work(conn)
                capability = work["task"]["task_capability"]
                self.assertEqual(work["purpose"], "professional_profile_completion")
                self.assertIn(
                    "profile.display_name",
                    work["input_context"]["protected_fields"],
                )
                self.assertIn(
                    "profile.summary.default",
                    work["input_context"]["missing_fields"],
                )
                serialized = json.dumps(work)
                for forbidden in (
                    "application_id",
                    "profile_id",
                    "storage_path",
                    str(storage),
                ):
                    self.assertNotIn(forbidden, serialized)

                completed = submit_agent_task_result(
                    conn,
                    capability,
                    json.dumps(
                        {
                            "variables": {
                                "profile.display_name": "Replacement",
                                "profile.summary.default": (
                                    "Reliable local-software engineer."
                                ),
                            }
                        }
                    ),
                    agent_name="fake-model",
                    agent_runtime="test-runtime",
                )
                self.assertEqual(
                    completed["profile_update"]["updated"],
                    ["profile.summary.default"],
                )
                self.assertEqual(
                    completed["profile_update"]["skipped"],
                    ["profile.display_name"],
                )
                values = profile_variables(conn)
                self.assertEqual(values["profile.display_name"], "Existing Name")
                self.assertEqual(
                    values["profile.summary.default"],
                    "Reliable local-software engineer.",
                )

    def test_profile_completion_rejects_unknown_profile_authority(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            ensure_workspace_database(storage)
            task = create_profile_completion_task(storage)
            with connect(storage) as conn:
                task = claim_agent_work(conn, str(task["id"]))
                capability = task_capability(conn, task)
                with self.assertRaisesRegex(ValueError, "not permitted"):
                    submit_agent_task_result(
                        conn,
                        capability,
                        json.dumps(
                            {"variables": {"profile.internal_id": "forbidden"}}
                        ),
                    )

    def test_invalid_structured_profile_value_keeps_capability_for_corrected_retry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            ensure_workspace_database(storage)
            task = create_profile_completion_task(storage)
            with connect(storage) as conn:
                task = claim_agent_work(conn, str(task["id"]))
                capability = task_capability(conn, task)
                with self.assertRaisesRegex(ValueError, "bounded text: profile.links"):
                    submit_agent_task_result(
                        conn,
                        capability,
                        json.dumps(
                            {
                                "variables": {
                                    "profile.links": ["https://example.test"],
                                    "profile.projects": [{"name": "Example"}],
                                }
                            }
                        ),
                    )
                self.assertEqual(get_task(conn, str(task["id"]))["state"], "claimed")

                completed = submit_agent_task_result(
                    conn,
                    capability,
                    json.dumps(
                        {
                            "variables": {
                                "profile.links": "Portfolio: https://example.test",
                                "profile.projects": "Example: bounded local project.",
                            }
                        }
                    ),
                )
                values = profile_variables(conn)

            self.assertEqual(completed["state"], "completed")
            self.assertEqual(values["profile.links"], "Portfolio: https://example.test")
            self.assertEqual(values["profile.projects"], "Example: bounded local project.")

    def test_local_readiness_does_not_execute_or_certify_the_external_host(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            ensure_workspace_database(storage)
            save_workspace_settings(
                storage,
                integration_method_id="user_command",
                integration_settings={
                    "argv": ["local-runtime-connector", "--fixed"],
                    "timeout_seconds": 30,
                },
            )
            with patch(
                "aaaat.integration_setup.integration_health",
                return_value={"status": "ready", "message": "Local command found."},
            ) as health:
                readiness = integration_readiness(storage)
            self.assertEqual(readiness["status"], "ready")
            self.assertEqual(readiness["method_id"], "user_command")
            health.assert_called_once()
            serialized = json.dumps(readiness)
            for forbidden in (
                "challenge_nonce",
                "certification",
                "storage_path",
                str(storage),
            ):
                self.assertNotIn(forbidden, serialized)

    def test_runner_emits_transient_status_events(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            ensure_workspace_database(storage)
            task = create_profile_completion_task(storage)
            save_workspace_settings(
                storage,
                integration_method_id="user_command",
                integration_settings={
                    "argv": ["fake"],
                    "timeout_seconds": 30,
                },
            )
            events: list[dict] = []
            runner = TaskRunner(storage, on_progress=events.append)
            with patch.object(
                runner,
                "_execute_method",
                return_value=(
                    json.dumps(
                        {
                            "variables": {
                                "profile.summary.default": "Completed"
                            }
                        }
                    ),
                    {"agent_runtime": "fake"},
                ),
            ):
                runner.run(str(task["id"]))

            phases = [event["phase"] for event in events]
            self.assertEqual(
                phases,
                [
                    "preparing_context",
                    "invoking_runtime",
                    "validating_result",
                    "applying_result",
                    "completed",
                ],
            )
            self.assertEqual(
                [event["sequence"] for event in events],
                [1, 2, 3, 4, 5],
            )
            self.assertEqual(events[-1]["percent"], 100)


if __name__ == "__main__":
    unittest.main()
