from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.agent_access import submit_agent_task_result, task_capability
from aaaat.agent_work import claim_agent_work
from aaaat.background_worker import OwnedTaskWorker
from aaaat.candidature_lifecycle import queue_lifecycle_task, release_ready_lifecycle_tasks
from aaaat.candidatures import create_candidature, update_candidature
from aaaat.db import connect, ensure_workspace_database
from aaaat.tasks import create_task, get_task, list_tasks, update_task


class CandidatureLifecycleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.storage = Path(self.temporary.name) / "private"
        ensure_workspace_database(self.storage)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_explicit_lifecycle_tasks_are_queued_without_a_planner(self) -> None:
        with connect(self.storage) as conn:
            candidature = create_candidature(
                conn,
                company="ExampleCo",
                role="Engineer",
                raw_offer="ExampleCo seeks an engineer.",
            )
            ref = str(candidature["id"])
            evaluation = queue_lifecycle_task(conn, ref, "evaluate")
            research = queue_lifecycle_task(conn, ref, "research")
            self.assertEqual(evaluation["state"], "queued")
            self.assertEqual(research["state"], "queued")
            self.assertEqual(len(list_tasks(conn, application_id=ref)), 2)

    def test_blocked_tasks_are_released_after_prerequisites_exist(self) -> None:
        with connect(self.storage) as conn:
            candidature = create_candidature(
                conn,
                company="ExampleCo",
                role="Engineer",
                raw_offer="Offer",
            )
            ref = str(candidature["id"])
            strategy = queue_lifecycle_task(conn, ref, "strategy")
            cv = queue_lifecycle_task(conn, ref, "cv")
            self.assertEqual(strategy["state"], "blocked")
            self.assertEqual(cv["state"], "blocked")
            update_candidature(conn, ref, candidature_evaluation="Strong fit")
            first = release_ready_lifecycle_tasks(conn, ref)
            self.assertEqual([item["id"] for item in first], [strategy["id"]])
            update_candidature(conn, ref, role_strategy="Lead with reliability")
            second = release_ready_lifecycle_tasks(conn, ref)
            self.assertEqual([item["id"] for item in second], [cv["id"]])

    def test_retry_creates_new_task_and_rejects_result_for_cancelled_task(self) -> None:
        with connect(self.storage) as conn:
            task = create_task(conn, "field_inference", "Evaluate", context_hint="candidature:evaluation")
            task = claim_agent_work(conn, str(task["id"]))
            old_id = str(task["id"])
            old_capability = task_capability(conn, task)
            update_task(conn, old_id, state="failed", notes="Runtime failed.")

        worker = OwnedTaskWorker(self.storage)
        with patch.object(worker, "submit") as submit:
            new_id = worker.retry(old_id)
            submit.assert_called_once_with(new_id)

        with connect(self.storage) as conn:
            old = get_task(conn, old_id)
            new = get_task(conn, new_id)
            self.assertEqual(old["state"], "cancelled")
            self.assertEqual(new["state"], "queued")
            with self.assertRaisesRegex(ValueError, "only for claimed work"):
                task_capability(conn, new)
            with self.assertRaises(KeyError):
                submit_agent_task_result(conn, old_capability, '{"fields":{"valuation":"late"}}')

    def test_completed_task_rejects_duplicate_submission(self) -> None:
        with connect(self.storage) as conn:
            task = create_task(conn, "field_inference", "Extract", state="queued")
            task = claim_agent_work(conn, str(task["id"]))
            capability = task_capability(conn, task)
            update_task(conn, str(task["id"]), state="completed")
            with self.assertRaises(KeyError):
                submit_agent_task_result(conn, capability, '{"fields":{}}')


if __name__ == "__main__":
    unittest.main()
