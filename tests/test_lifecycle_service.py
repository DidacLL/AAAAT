from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from aaaat.candidatures import create_candidature
from aaaat.db import connect, init_db
from aaaat.lifecycle_service import candidature_lifecycle_snapshot, plan_candidature_lifecycle


class LifecycleServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.storage = Path(self.temporary.name) / "private"
        init_db(self.storage)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_plan_service_creates_full_nonresearch_lifecycle(self) -> None:
        with connect(self.storage) as conn:
            candidature = create_candidature(
                conn,
                company="ExampleCo",
                role="Engineer",
                raw_offer="Offer",
                raw_application_form="Why this role?",
                include_field_inference_task=False,
                include_company_research_task=False,
                include_keyword_detection_task=False,
            )
        snapshot = plan_candidature_lifecycle(self.storage, str(candidature["id"]))
        keys = {item["key"] for item in snapshot["plan"]}
        self.assertEqual(keys, {"extract", "evaluate", "strategy", "research", "recruiter", "interview", "forms", "cv", "cover_letter"})
        self.assertEqual(next(item for item in snapshot["plan"] if item["key"] == "research")["state"], "unavailable")
        self.assertEqual(len(snapshot["tasks"]), 8)

    def test_snapshot_does_not_create_tasks(self) -> None:
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
        snapshot = candidature_lifecycle_snapshot(self.storage, str(candidature["id"]))
        self.assertEqual(snapshot["tasks"], [])


if __name__ == "__main__":
    unittest.main()
