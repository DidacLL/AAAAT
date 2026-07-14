import tempfile
import unittest

from aaaat.candidatures import create_candidature
from aaaat.db import connect, init_db, list_applications, list_raw_intake
from aaaat.demo_seed import build_record, seed


class DemoSeedSafetyTests(unittest.TestCase):
    def test_reset_only_replaces_demo_seeded_candidatures(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            first_demo = build_record(0)
            with connect(tmp) as conn:
                user = create_candidature(
                    conn,
                    company="User company",
                    role="User role",
                    source_url=first_demo["source_url"],
                    raw_offer="A real user-created offer.",
                    created_by="user",
                    include_field_inference_task=False,
                    include_company_research_task=False,
                    include_keyword_detection_task=False,
                )

            seed(tmp, count=3, reset=True)
            seed(tmp, count=2, reset=True)

            with connect(tmp) as conn:
                applications = list_applications(conn)
                user_rows = [item for item in applications if item["id"] == user["id"]]
                demo_rows = [
                    item
                    for item in applications
                    if any(raw["created_by"] == "demo_seed" for raw in list_raw_intake(conn, item["id"]))
                ]

        self.assertEqual(len(user_rows), 1)
        self.assertEqual(user_rows[0]["company"], "User company")
        self.assertEqual(user_rows[0]["role"], "User role")
        self.assertEqual(len(demo_rows), 2)


if __name__ == "__main__":
    unittest.main()
