import tempfile
import unittest

from aaaat.db import connect, create_application, create_raw_offer_intake, init_db, list_raw_intake, update_application, upsert_glossary_term
from aaaat.payload import dashboard_payload
from aaaat.review_queue import review_queue


class ReviewQueueTests(unittest.TestCase):
    def test_review_summary_includes_missing_fields_and_keyword_definitions_then_shrinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Queue Co", role="Engineer", keywords=["Unexplained"])
                summary = review_queue(dashboard_payload(conn), app["id"])
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
                summary = review_queue(dashboard_payload(conn), app["id"])

        self.assertEqual(summary, [])

    def test_raw_offer_intake_creates_placeholder_candidature_and_missing_information_summary(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_raw_offer_intake(conn, "Raw offer text for a backend role.", "user")
                intake = list_raw_intake(conn, app["id"])
                summary = review_queue(dashboard_payload(conn), app["id"])

        self.assertEqual(app["company"], "Pending extraction")
        self.assertEqual(app["role"], "Pending role")
        self.assertEqual(app["status"], "active")
        self.assertEqual(intake[0]["created_by"], "user")
        self.assertIn("raw_offer_extraction", {item["category"] for item in summary})
        self.assertIn("company", {item["field"] for item in summary})


if __name__ == "__main__":
    unittest.main()
