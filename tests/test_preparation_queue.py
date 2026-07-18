import tempfile
import unittest

from aaaat.db import connect, create_application, create_raw_offer_intake, ensure_workspace_database, list_raw_intake, update_application, upsert_glossary_term
from aaaat.payload import dashboard_payload
from aaaat.preparation_queue import preparation_queue


class PreparationQueueTests(unittest.TestCase):
    def test_review_summary_includes_missing_fields_and_keyword_definitions_then_shrinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            ensure_workspace_database(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Queue Co", role="Engineer", keywords=["Unexplained"])
                summary = preparation_queue(dashboard_payload(conn), app["id"])
                fields = {item["field"] for item in summary}
                categories = {item["category"] for item in summary}

                self.assertIn("missing_field", categories)
                self.assertIn("missing_keyword_definition", categories)
                self.assertIn("pitch", fields)
                self.assertIn("risks_to_avoid", fields)
                self.assertIn("smart_question", fields)
                self.assertIn("company_research", fields)
                self.assertIn("keyword:Unexplained", fields)

                update_application(
                    conn,
                    app["id"],
                    pitch="Short pitch",
                    risks_to_avoid="Avoid vague claims",
                    smart_question="What does success look like?",
                    company_research="Local company research",
                )
                upsert_glossary_term(conn, "Unexplained", "A keyword now explained.", "skill")
                summary = preparation_queue(dashboard_payload(conn), app["id"])

        self.assertEqual(summary, [])

    def test_raw_offer_intake_keeps_unknown_fields_empty_and_reports_missing_information(self):
        with tempfile.TemporaryDirectory() as tmp:
            ensure_workspace_database(tmp)
            with connect(tmp) as conn:
                app = create_raw_offer_intake(conn, "Raw offer text for a backend role.", "user")
                intake = list_raw_intake(conn, app["id"])
                summary = preparation_queue(dashboard_payload(conn), app["id"])

        self.assertEqual(app["company"], "")
        self.assertEqual(app["role"], "")
        self.assertEqual(app["status"], "active")
        self.assertEqual(intake[0]["created_by"], "user")
        self.assertIn("raw_offer_extraction", {item["category"] for item in summary})
        self.assertIn("company", {item["field"] for item in summary})


if __name__ == "__main__":
    unittest.main()
