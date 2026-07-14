from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from aaaat.db import connect, create_application, init_db
from aaaat.upgrade import upgrade_storage


class UpgradeStorageTests(unittest.TestCase):
    def test_upgrade_adds_all_v1_compatibility_columns_and_preserves_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp)
            init_db(storage)
            with connect(storage) as conn:
                created = create_application(conn, company="Existing Co", role="Existing Role")

            first = upgrade_storage(storage)
            second = upgrade_storage(storage)

            self.assertEqual(first["schema_version"], "1")
            self.assertEqual(second["applications"], 1)
            with connect(storage) as conn:
                application = conn.execute(
                    "SELECT company, role FROM applications WHERE id = ?",
                    (created["id"],),
                ).fetchone()
                self.assertEqual(tuple(application), ("Existing Co", "Existing Role"))

                detail_columns = {
                    str(row["name"])
                    for row in conn.execute("PRAGMA table_info(candidature_details)").fetchall()
                }
                self.assertTrue(
                    {
                        "form_answers",
                        "candidature_evaluation",
                        "role_strategy",
                        "cv_material",
                        "cover_letter_material",
                        "recruiter_material",
                        "material_sent_notes",
                    }.issubset(detail_columns)
                )

                career_columns = {
                    str(row["name"])
                    for row in conn.execute("PRAGMA table_info(career_plans)").fetchall()
                }
                self.assertTrue(
                    {"target_markets", "target_roles", "source", "review_state"}.issubset(
                        career_columns
                    )
                )

                alias_columns = {
                    str(row["name"])
                    for row in conn.execute("PRAGMA table_info(keyword_aliases)").fetchall()
                }
                note_columns = {
                    str(row["name"])
                    for row in conn.execute("PRAGMA table_info(keyword_notes)").fetchall()
                }
                self.assertIn("created_at", alias_columns)
                self.assertIn("created_by", note_columns)


if __name__ == "__main__":
    unittest.main()
