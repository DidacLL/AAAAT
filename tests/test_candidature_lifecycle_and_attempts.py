from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.agent_access import submit_agent_task_result, task_handle
from aaaat.background_worker import OwnedTaskWorker
from aaaat.candidature_lifecycle import ensure_lifecycle_tasks, lifecycle_plan
from aaaat.candidatures import create_candidature, update_candidature
from aaaat.db import connect, init_db
from aaaat.tasks import create_task, get_task, list_tasks, update_task


class CandidatureLifecycleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.storage = Path(self.temporary.name) / "private"
        init_db(self.storage)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_lifecycle_plan_covers_required_outcomes_and_capability_gate(self) -> None:
        with connect(self.storage) as conn:
            candidature = create_candidature(
                conn,
                company="ExampleCo",
                role="Engineer",
                raw_offer="ExampleCo seeks an engineer.",
                raw_application_form="Why this role?",
                include_field_inference_task=False,
                include_company_research_task=False,
                include_keyword_detection_task=False,
            )
            ref = str(candidature["id"])
            plan = lifecycle_plan(conn, ref, research_capable=False)
            self.assertEqual(
                {item["key"] for item in plan},
                {"extract", "evaluate", "strategy", "research", "recruiter", "interview", "forms", "cv", "cover_letter"},
            )
            research = next(item for item in plan if item["key"] == "research")
            self.assertEqual(research["state"], "unavailable")

            created = ensure_lifecycle_tasks(conn, ref, research_capable=True)
            self.assertEqual(len(created), 9)
            self.assertEqual(len(list_tasks(conn, application_id=ref)), 9)

    def test_blocked_tasks_become_new_planning_state_after_prerequisites_exist(self) -> None:
        with connect(self.storage) as conn:
            candidature = create_candidature(
                conn,
                company="ExampleCo",
                role="Engineer",
                raw_offer="Offer",
                include_field_inference_task=False,
                include_company_research_task=False,
                include_keyword_detection_task=False,
            )
            ref = str(candidature["id"])
            ensure_lifecycle_tasks(conn, ref, research_capable=False)
            blocked = [task for task in list_tasks(conn, application_id=ref) if task["state"] == "blocked"]
            self.assertTrue(blocked)
            update_candidature(conn, ref, candidature_evaluation="Strong fit", role_strategy="Lead with reliability")
            plan = lifecycle_plan(conn, ref, research_capable=False)
            self.assertTrue(any(item["key"] == "cv" for item in plan))

    def test_retry_creates_new_handle_and_rejects_late_old_result(self) -> None:
        with connect(self.storage) as conn:
            task = create_task(conn, "field_inference", "Evaluate", state="failed", context_hint="candidature:evaluation")
            old_id = str(task["id"])
            old_handle = task_handle(task)

        worker = OwnedTaskWorker(self.storage)
        with patch.object(worker, "submit") as submit:
            new_id = worker.retry(old_id)
            submit.assert_called_once_with(new_id)

        with connect(self.storage) as conn:
            old = get_task(conn, old_id)
            new = get_task(conn, new_id)
            self.assertEqual(old["state"], "cancelled")
            self.assertEqual(new["state"], "queued")
            self.assertNotEqual(task_handle(new), old_handle)
            with self.assertRaisesRegex(ValueError, "not accepting results"):
                submit_agent_task_result(conn, old_handle, '{"fields":{"valuation":"late"}}')

    def test_completed_task_rejects_duplicate_submission(self) -> None:
        with connect(self.storage) as conn:
            task = create_task(conn, "field_inference", "Extract", state="queued")
            handle = task_handle(task)
            update_task(conn, str(task["id"]), state="completed")
            with self.assertRaisesRegex(ValueError, "not accepting results"):
                submit_agent_task_result(conn, handle, '{"fields":{}}')


if __name__ == "__main__":
    unittest.main()
