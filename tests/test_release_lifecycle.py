from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.agent_access import submit_agent_task_result, task_capability
from aaaat.agent_work import claim_agent_work
from aaaat.agent_actions import submit_agent_action
from aaaat.assistance_service import create_profile_completion_task
from aaaat.background_worker import OwnedTaskWorker
from aaaat.candidature_lifecycle import queue_lifecycle_task, release_ready_lifecycle_tasks
from aaaat.candidatures import create_candidature, get_candidature
from aaaat.db import connect, init_db, profile_variables
from aaaat.payload import dashboard_payload
from aaaat.integration_setup import integration_health
from aaaat.task_runner import TaskRunner
from aaaat.tasks import create_task, get_task, list_tasks, update_task
from aaaat.workspace_config import save_workspace_settings


class ReleaseLifecycleTests(unittest.TestCase):
    def test_deterministic_empty_store_release_lifecycle(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            storage = root / "private"
            init_db(storage)
            settings = {
                "argv": [sys.executable],
                "timeout_seconds": 10,
            }
            health = integration_health("user_command", settings)
            self.assertEqual(health["status"], "ready")
            save_workspace_settings(
                storage,
                integration_method_id="user_command",
                integration_settings=settings,
            )

            def fake_execution(method_id, _settings, packet):
                self.assertEqual(method_id, "user_command")
                task = packet.get("task") or {}
                task_type = task.get("task_type", "")
                hint = task.get("context_hint", "")
                if task_type == "profile_completion":
                    result = {"variables": {
                        "profile.display_name": "Alex Example",
                        "profile.email": "alex@example.invalid",
                        "profile.location": "Madrid",
                        "profile.summary.default": "Backend engineer focused on reliable local tooling.",
                    }}
                elif task_type == "company_research":
                    result = {"company_research": "ExampleCo builds reliable developer infrastructure."}
                elif task_type == "keyword_definition":
                    result = {"definition": "A deterministic lifecycle keyword.", "category": "technology"}
                elif task_type == "draft_form_responses":
                    result = {"form_answers": "I value reliable local software and careful delivery."}
                elif task_type == "draft_cv":
                    result = {"cv_positioning": "Lead with Python, SQLite and local-first systems."}
                elif task_type == "draft_cover_letter":
                    result = {"cover_letter_body": "I am applying because the role matches my local-first reliability experience."}
                elif hint == "call:recruiter":
                    result = {"fields": {"recruiter_material": "Discuss reliability, role scope, process and next steps."}}
                elif hint == "candidature:evaluation":
                    result = {"fields": {"candidature_evaluation": "Strong fit", "strengths": "Python and local systems", "valuation": 82, "risks_to_avoid": "Do not overstate scale."}}
                elif hint == "candidature:strategy":
                    result = {"fields": {"role_strategy": "Lead with reliability and local-first ownership.", "pitch": "Local-first backend specialist.", "smart_question": "How is reliability measured?", "call_signals": "Emphasize delivery discipline."}}
                elif hint == "call:interview":
                    result = {"fields": {"questions_to_ask": "How does the team validate reliability?", "strengths": "Python, SQLite and pragmatic architecture."}}
                else:
                    result = {"fields": {"company": "ExampleCo", "role": "Backend Engineer", "location": "Remote", "remote_mode": "remote", "tech_stack": "Python, SQLite", "keywords": ["Python", "SQLite"]}}
                return json.dumps(result), {"agent_runtime": "deterministic-test"}

            execution_patch = patch.object(TaskRunner, "_execute_method", side_effect=fake_execution)
            execution_patch.start()
            self.addCleanup(execution_patch.stop)

            profile_task = create_profile_completion_task(storage)
            TaskRunner(storage).run(str(profile_task["id"]))
            with connect(storage) as conn:
                profile = profile_variables(conn)
                self.assertEqual(profile["profile.display_name"], "Alex Example")
                self.assertEqual(profile["profile.email"], "alex@example.invalid")

                candidature = create_candidature(
                    conn,
                    company="ExampleCo",
                    role="Backend Engineer",
                    raw_offer=(
                        "ExampleCo seeks a Python backend engineer for reliable "
                        "local systems."
                    ),
                    raw_application_form="Why this role?",
                    status="active",
                    priority="normal",
                )
                candidature_ref = str(candidature["id"])
                for key in (
                    "extract",
                    "evaluate",
                    "strategy",
                    "research",
                    "recruiter",
                    "interview",
                    "forms",
                    "cv",
                    "cover_letter",
                ):
                    queue_lifecycle_task(
                        conn,
                        candidature_ref,
                        key,
                        created_by="release_test",
                        idempotent=True,
                    )

            runner = TaskRunner(storage)
            for _round in range(3):
                with connect(storage) as conn:
                    queued = [
                        task
                        for task in list_tasks(
                            conn,
                            application_id=candidature_ref,
                        )
                        if task["state"] == "queued"
                    ]
                for task in queued:
                    runner.run(str(task["id"]))
                with connect(storage) as conn:
                    release_ready_lifecycle_tasks(conn, candidature_ref)

            with connect(storage) as conn:
                tasks = list_tasks(conn, application_id=candidature_ref)
                self.assertTrue(
                    all(task["state"] == "completed" for task in tasks)
                )
                current = get_candidature(conn, candidature_ref)
                self.assertEqual(current["candidature_evaluation"], "Strong fit")
                for field in (
                    "role_strategy",
                    "company_research",
                    "form_answers",
                    "cv_material",
                    "cover_letter_material",
                    "recruiter_material",
                    "questions_to_ask",
                ):
                    self.assertTrue(current[field], field)

                completed = tasks[0]
                with self.assertRaisesRegex(ValueError, "only for claimed work"):
                    task_capability(conn, completed)

                failed = create_task(
                    conn,
                    "field_inference",
                    "Retry proof",
                    application_id=candidature_ref,
                    context_hint="candidature:evaluation",
                    idempotent=False,
                )
                failed = claim_agent_work(conn, str(failed["id"]))
                failed_capability = task_capability(conn, failed)
                failed = update_task(
                    conn,
                    str(failed["id"]),
                    state="failed",
                    notes="Deterministic failure",
                )

            worker = OwnedTaskWorker(storage)
            original_submit = worker.submit
            worker.submit = lambda _task_id: None  # type: ignore[method-assign]
            retry_id = worker.retry(str(failed["id"]))
            worker.submit = original_submit  # type: ignore[method-assign]
            with connect(storage) as conn:
                self.assertEqual(
                    get_task(conn, str(failed["id"]))["state"],
                    "cancelled",
                )
                retry_task = get_task(conn, retry_id)
                self.assertEqual(retry_task["state"], "queued")
                with self.assertRaisesRegex(ValueError, "only for claimed work"):
                    task_capability(conn, retry_task)
                with self.assertRaises(KeyError):
                    submit_agent_task_result(
                        conn,
                        failed_capability,
                        '{"fields":{"valuation":82}}',
                    )

                current = get_candidature(conn, candidature_ref)
                result = submit_agent_action(
                    conn,
                    {
                        "action": "create_candidature",
                        "payload": {
                            "source_material": {
                                "offer_text": "Rendered release proof."
                            },
                            "candidature": {
                                "company": "Rendered Example",
                                "role": "Backend Engineer",
                            },
                            "outputs": {
                                "cover_letter_body": current[
                                    "cover_letter_material"
                                ],
                                "cv_positioning": current["cv_material"],
                            },
                            "render": {
                                "cover_letter": True,
                                "cv": True,
                            },
                            "requested_tasks": [],
                        },
                    },
                    agent_name="deterministic",
                    agent_runtime="fake-adapter",
                    model_provider="deterministic",
                    storage_path=str(storage),
                )
                self.assertEqual(
                    result["rendered"],
                    {"cover_letter": True, "cv": True},
                )
                payload = dashboard_payload(conn)
                self.assertTrue(
                    any(
                        app["company"] == "ExampleCo"
                        for app in payload["applications"]
                    )
                )
                serialized = json.dumps(result)
                for forbidden in (
                    "application_id",
                    "candidature_id",
                    "artifact_id",
                    "storage_path",
                    str(storage),
                ):
                    self.assertNotIn(forbidden, serialized)


if __name__ == "__main__":
    unittest.main()
