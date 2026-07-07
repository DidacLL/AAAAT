import tempfile
import unittest

from aaaat.dashboard import render_dashboard
from aaaat.db import connect, create_application, init_db, upsert_glossary_term
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


class DashboardModeTests(unittest.TestCase):
    def test_payload_and_mode_controls(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_application(conn, company="Demo Co", role="Engineer", keywords=["ATS"])
                payload = dashboard_payload(conn)

        self.assertTrue(payload["applications"])
        self.assertTrue(payload["glossary"])

        full = render_dashboard(payload, Mode.FULL)
        self.assertIn("Raw intake", full)
        self.assertIn("data-write-control", full)
        self.assertIn("Glossary", full)

        read_only = render_dashboard(payload, Mode.READ_ONLY)
        self.assertNotIn("Raw intake", read_only)
        self.assertNotIn("data-write-control", read_only)

    def test_sparse_application_renders_cleanly(self):
        payload = {
            "applications": [
                {
                    "id": "app_sparse",
                    "company": "Sparse Co",
                    "role": "Sparse Role",
                    "status": "draft",
                    "priority": "normal",
                    "next_action": "",
                    "keywords": [],
                    "artifacts": [],
                }
            ],
            "glossary": [],
            "profile_variables": {},
            "missing_profile_variables": ["profile.display_name"],
        }
        html = render_dashboard(payload, Mode.FULL)
        self.assertIn("Sparse Co", html)
        self.assertIn("Not set", html)
        self.assertIn("profile.display_name", html)
        self.assertNotIn("Create Application", html)

    def test_application_list_focused_view_keyword_and_tabs_are_structured(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(
                    conn,
                    company="Focused Co",
                    role="Platform Engineer",
                    keywords=["Python"],
                    notes="Private notes",
                    form_answers="Verbose form answers",
                    source_url="https://example.invalid/role",
                )
                upsert_glossary_term(conn, "Python", "Programming language.", "skill")
                payload = dashboard_payload(conn)

        html = render_dashboard(payload, Mode.FULL, app["id"], "Python", "recommendations")

        self.assertIn("Focused Co", html)
        self.assertIn("Platform Engineer", html)
        self.assertIn("data-keyword='Python'", html)
        self.assertIn("Programming language.", html)
        self.assertIn("data-tab-panel='recommendations'", html)
        self.assertIn("Company", html)
        self.assertIn("Notes", html)
        self.assertIn("Recommendations", html)
        self.assertIn("Artifacts", html)
        self.assertIn("Raw intake", html)
        self.assertNotIn("Verbose form answers", html)

        company_html = render_dashboard(payload, Mode.FULL, app["id"], "Python", "company")
        self.assertIn("target='_blank' rel='noopener noreferrer'", company_html)

        read_only = render_dashboard(payload, Mode.READ_ONLY, app["id"], "Python", "company")
        self.assertNotIn("Raw intake", read_only)


if __name__ == "__main__":
    unittest.main()
