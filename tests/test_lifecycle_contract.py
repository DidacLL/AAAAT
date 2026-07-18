from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from aaaat.agent_access import (
    build_agent_work_item,
    submit_agent_task_result,
    task_capability,
)
from aaaat.agent_work import claim_agent_work, claim_next_agent_work
from aaaat.assisted_profile import profile_completion_context
from aaaat.candidature_lifecycle import queue_lifecycle_task
from aaaat.candidatures import create_candidature, get_candidature
from aaaat.db import connect, ensure_workspace_database
from aaaat.portable_task_bundle import export_candidature_task_bundle
from aaaat.privacy import set_variable
from aaaat.result_ingestion import ingest_task_result
from aaaat.tasks import create_task, get_task, list_tasks
from aaaat.ui_desktop.services import DesktopCommandService


class LifecycleContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.storage = Path(self.temporary.name) / "private"
        ensure_workspace_database(self.storage)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def _candidature(self, **fields):
        with connect(self.storage) as conn:
            return create_candidature(
                conn,
                company=fields.pop("company", "Example Co"),
                role=fields.pop("role", "Backend Engineer"),
                raw_offer=fields.pop(
                    "raw_offer",
                    "Example Co seeks a backend engineer.",
                ),
                **fields,
            )

    def test_desktop_creation_and_actions_use_canonical_lifecycle_specs(self) -> None:
        service = DesktopCommandService(self.storage)
        created = service.create_offer_first_candidature(
            "Example Co seeks a backend engineer.",
            company="Example Co",
            role="Backend Engineer",
        )
        assert created is not None
        with connect(self.storage) as conn:
            tasks = list_tasks(conn, application_id=created["id"])
        self.assertEqual(tasks, [])

        strategy = service.queue_candidature_action(
            created["id"],
            "regenerate_strategy",
        )
        self.assertEqual(strategy["task_type"], "field_inference")
        self.assertEqual(strategy["context_hint"], "candidature:strategy")
        self.assertEqual(strategy["state"], "blocked")

        service.update_candidature_fields(
            created["id"],
            {"candidature_evaluation": "Strong fit"},
        )
        with connect(self.storage) as conn:
            refreshed = get_task(conn, strategy["id"])
        self.assertEqual(refreshed["state"], "queued")

    def test_lifecycle_work_packets_include_required_context_and_narrow_fields(self) -> None:
        with connect(self.storage) as conn:
            set_variable(conn, "profile.skills", "Python and SQLite", exposure="raw")
            candidature = create_candidature(
                conn,
                company="Example Co",
                role="Backend Engineer",
                raw_offer="Example Co seeks a Python engineer.",
                candidature_evaluation="Strong fit",
                role_strategy="Lead with reliable local systems.",
            )
            evaluation = queue_lifecycle_task(conn, candidature["id"], "evaluate")
            cv = queue_lifecycle_task(conn, candidature["id"], "cv")
            evaluation = claim_agent_work(conn, str(evaluation["id"]))
            cv = claim_agent_work(conn, str(cv["id"]))
            evaluation_work = build_agent_work_item(conn, evaluation)
            cv_work = build_agent_work_item(conn, cv)

        self.assertEqual(
            set(evaluation_work["input_context"]["allowed_fields"]),
            {"candidature_evaluation", "strengths", "risks_to_avoid", "valuation"},
        )
        self.assertIn(
            "profile.skills",
            evaluation_work["input_context"]["profile_context"]["variables"],
        )
        self.assertEqual(
            cv_work["input_context"]["candidature_evaluation"],
            "Strong fit",
        )
        self.assertEqual(
            cv_work["input_context"]["role_strategy"],
            "Lead with reliable local systems.",
        )

    def test_task_specific_schema_rejects_unrelated_fields(self) -> None:
        with connect(self.storage) as conn:
            candidature = create_candidature(
                conn,
                company="Example Co",
                role="Engineer",
            )
            task = queue_lifecycle_task(conn, candidature["id"], "evaluate")
            task = claim_agent_work(conn, str(task["id"]))
            capability = task_capability(conn, task)
            with self.assertRaisesRegex(ValueError, "unsupported candidature fields"):
                submit_agent_task_result(
                    conn,
                    capability,
                    json.dumps({"fields": {"role_strategy": "Wrong contract"}}),
                )

    def test_single_field_refresh_is_exact_and_authorized_by_the_desktop_action(self) -> None:
        service = DesktopCommandService(self.storage)
        created = service.create_offer_first_candidature(
            "Original offer",
            company="Old Company",
            role="Engineer",
        )
        assert created is not None
        task = service.queue_candidature_action(created["id"], "field:company")
        with connect(self.storage) as conn:
            task = claim_agent_work(conn, str(task["id"]))
            work = build_agent_work_item(conn, task)
            self.assertEqual(work["input_context"]["allowed_fields"], ["company"])
            submit_agent_task_result(
                conn,
                task_capability(conn, task),
                json.dumps(
                    {
                        "fields": {"company": "New Company"},
                        "replace_existing": False,
                    }
                ),
            )
            updated = get_candidature(conn, created["id"])
        self.assertEqual(updated["company"], "New Company")

    def test_blocked_task_cannot_accept_results(self) -> None:
        with connect(self.storage) as conn:
            candidature = create_candidature(
                conn,
                company="Example Co",
                role="Engineer",
            )
            task = queue_lifecycle_task(conn, candidature["id"], "cv")
            self.assertEqual(task["state"], "blocked")
            with self.assertRaisesRegex(ValueError, "only for claimed work"):
                task_capability(conn, task)

    def test_ingestion_releases_downstream_work_for_every_transport(self) -> None:
        with connect(self.storage) as conn:
            candidature = create_candidature(
                conn,
                company="Example Co",
                role="Engineer",
            )
            evaluation = queue_lifecycle_task(conn, candidature["id"], "evaluate")
            strategy = queue_lifecycle_task(conn, candidature["id"], "strategy")
            self.assertEqual(strategy["state"], "blocked")
            evaluation = claim_agent_work(conn, str(evaluation["id"]))
            capability = task_capability(conn, evaluation)
            outcome = ingest_task_result(
                conn,
                capability,
                {
                    "fields": {
                        "candidature_evaluation": "Strong fit",
                        "strengths": "Relevant experience",
                        "risks_to_avoid": "Do not overstate scale",
                        "valuation": 82,
                    }
                },
                provenance={"agent_runtime": "paired-test"},
            )
            released = get_task(conn, strategy["id"])

        self.assertGreaterEqual(outcome["released_work"], 1)
        self.assertEqual(released["state"], "queued")

    def test_portable_export_claims_only_ready_work(self) -> None:
        candidature = self._candidature()
        with connect(self.storage) as conn:
            ready = queue_lifecycle_task(conn, candidature["id"], "evaluate")
            blocked = queue_lifecycle_task(conn, candidature["id"], "cv")
        bundle_path = Path(self.temporary.name) / "work.aaaat-task"
        outcome = export_candidature_task_bundle(
            self.storage,
            candidature["id"],
            bundle_path,
        )
        self.assertEqual(outcome["task_count"], 1)
        with zipfile.ZipFile(bundle_path) as archive:
            work = json.loads(archive.read("work-items.json"))["work_items"]
        self.assertEqual(work[0]["purpose"], "candidature_fit_evaluation")
        with connect(self.storage) as conn:
            self.assertEqual(get_task(conn, ready["id"])["state"], "claimed")
            self.assertEqual(get_task(conn, blocked["id"])["state"], "blocked")

    def test_latest_explicit_desktop_request_is_claimed_before_background_work(self) -> None:
        with connect(self.storage) as conn:
            create_task(
                conn,
                "company_research",
                "Older background work",
                priority="high",
                context_hint="candidature:company_research",
                created_by="system",
            )
            create_task(
                conn,
                "field_inference",
                "User requested refresh",
                priority="normal",
                context_hint="candidature:refresh",
                created_by="desktop_action",
            )
            claimed = claim_next_agent_work(conn)
        self.assertEqual(claimed["task"]["title"], "User requested refresh")

    def test_profile_completion_does_not_disclose_existing_raw_values(self) -> None:
        with connect(self.storage) as conn:
            set_variable(
                conn,
                "profile.display_name",
                "Private Name",
                exposure="raw",
            )
            context = profile_completion_context(conn)
        serialized = json.dumps(context)
        self.assertNotIn("current_fields", context)
        self.assertNotIn("Private Name", serialized)
        self.assertIn("profile.display_name", context["protected_fields"])

    def test_selected_candidature_can_render_local_cv_and_cover_letter(self) -> None:
        service = DesktopCommandService(self.storage)
        service.update_profile_variables(
            {
                "profile.display_name": "Alex Example",
                "profile.email": "alex@example.invalid",
                "profile.summary.default": (
                    "Backend engineer focused on reliable local tools."
                ),
            }
        )
        created = service.create_offer_first_candidature(
            "Example Co seeks a backend engineer.",
            company="Example Co",
            role="Backend Engineer",
        )
        assert created is not None
        service.update_candidature_fields(
            created["id"],
            {
                "candidature_evaluation": "Strong fit",
                "role_strategy": "Lead with reliability.",
                "cv_material": "Emphasize Python, SQLite and local-first systems.",
                "cover_letter_material": (
                    "The role matches my experience building reliable local software."
                ),
            },
        )
        cv = service.render_candidature_artifact(created["id"], "cv")
        letter = service.render_candidature_artifact(created["id"], "cover_letter")
        self.assertTrue(Path(cv["path"]).is_file())
        self.assertTrue(Path(letter["path"]).is_file())
        self.assertEqual(
            {
                item["artifact_type"]
                for item in service.list_candidature_artifacts(created["id"])
            },
            {"cv", "cover_letter"},
        )


if __name__ == "__main__":
    unittest.main()
