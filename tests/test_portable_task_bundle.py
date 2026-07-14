from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from aaaat.agent_access import task_handle
from aaaat.db import connect, create_application, init_db
from aaaat.portable_task_bundle import (
    export_candidature_task_bundle,
    import_candidature_result_bundle,
    write_result_bundle,
)
from aaaat.tasks import create_task, get_task


class PortableTaskBundleTests(unittest.TestCase):
    def test_one_archive_contains_all_bounded_tasks_without_internal_ids(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            with connect(storage) as conn:
                candidature = create_application(conn, company="Example", role="Engineer")
                first = create_task(
                    conn,
                    "company_research",
                    "Research company",
                    application_id=candidature["id"],
                    context_hint="candidature:company_research",
                )
                second = create_task(
                    conn,
                    "draft_cover_letter",
                    "Draft cover letter",
                    application_id=candidature["id"],
                    context_hint="artifact:cover_letter",
                )

            bundle = Path(tmp) / "candidature.aaaat-task"
            summary = export_candidature_task_bundle(storage, candidature["id"], bundle)
            self.assertEqual(summary["task_count"], 2)
            with zipfile.ZipFile(bundle) as archive:
                payload = json.loads(archive.read("tasks.json"))
            serialized = json.dumps(payload)
            self.assertIn(task_handle(first), serialized)
            self.assertIn(task_handle(second), serialized)
            self.assertNotIn(candidature["id"], serialized)
            for forbidden in ("application_id", "candidature_id", "storage_path", "artifact_id"):
                self.assertNotIn(forbidden, serialized)

    def test_result_sections_are_imported_independently(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            with connect(storage) as conn:
                candidature = create_application(conn, company="Example", role="Engineer")
                first = create_task(
                    conn,
                    "company_research",
                    "Research company",
                    application_id=candidature["id"],
                    context_hint="candidature:company_research",
                )
                second = create_task(
                    conn,
                    "draft_cover_letter",
                    "Draft cover letter",
                    application_id=candidature["id"],
                    context_hint="artifact:cover_letter",
                )

            result_bundle = Path(tmp) / "result.aaaat-result"
            write_result_bundle(
                result_bundle,
                [
                    {
                        "task_handle": task_handle(first),
                        "result": {"company_research": "Bounded research"},
                        "provenance": {"agent_runtime": "browser-chat"},
                    },
                    {
                        "task_handle": task_handle(second),
                        "result": {"application_id": "forbidden"},
                    },
                ],
            )
            outcome = import_candidature_result_bundle(storage, result_bundle)
            self.assertEqual(outcome["status"], "partial")
            self.assertEqual(len(outcome["accepted"]), 1)
            self.assertEqual(len(outcome["rejected"]), 1)
            with connect(storage) as conn:
                self.assertEqual(get_task(conn, first["id"])["state"], "completed")
                self.assertNotEqual(get_task(conn, second["id"])["state"], "completed")


if __name__ == "__main__":
    unittest.main()
