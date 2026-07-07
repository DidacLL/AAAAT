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
        self.assertIn("data-app-row", full)
        self.assertIn("data-selected-app", full)
        self.assertIn("data-inline-field='next_action'", full)
        self.assertIn("data-inspector-tab='raw'", full)
        self.assertIn("data-write-control", full)
        self.assertIn("data-raw-offer-entry", full)
        self.assertNotIn("Create Application", full)
        self.assertNotIn("Manual field editing", full)

        read_only = render_dashboard(payload, Mode.READ_ONLY)
        self.assertIn("data-app-row", read_only)
        self.assertIn("data-selected-app", read_only)
        self.assertNotIn("data-inspector-tab='raw'", read_only)
        self.assertNotIn("data-write-control", read_only)
        self.assertNotIn("data-inline-field", read_only)
        self.assertNotIn("data-raw-offer-entry", read_only)

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
        self.assertIn("Sparse Role", html)
        self.assertIn("Add next action", html)
        self.assertIn("data-app-row", html)
        self.assertIn("data-selected-app", html)
        self.assertIn("data-inline-field='pitch'", html)
        self.assertIn("profile.display_name", html)
        self.assertNotIn("Create Application", html)
        self.assertNotIn("Manual field editing", html)

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

        html = render_dashboard(payload, Mode.FULL, app["id"], "Python", "keyword")

        self.assertIn("Focused Co", html)
        self.assertIn("Platform Engineer", html)
        self.assertIn("data-app-row", html)
        self.assertIn("data-selected-app", html)
        self.assertIn("data-keyword='Python'", html)
        self.assertIn("Programming language.", html)
        self.assertIn("Context: Focused Co / Platform Engineer", html)
        for tab in ["keyword", "company", "notes", "queue", "artifacts", "raw"]:
            self.assertIn(f"data-inspector-tab='{tab}'", html)
        self.assertIn("data-inline-field='next_action'", html)
        self.assertNotIn("Verbose form answers", html)
        self.assertNotIn("Manual field editing", html)

        company_html = render_dashboard(payload, Mode.FULL, app["id"], "Python", "company")
        self.assertIn("target='_blank' rel='noopener noreferrer'", company_html)

        read_only = render_dashboard(payload, Mode.READ_ONLY, app["id"], "Python", "company")
        self.assertNotIn("data-inspector-tab='raw'", read_only)
        self.assertNotIn("data-write-control", read_only)
        self.assertNotIn("data-inline-field", read_only)


if __name__ == "__main__":
    unittest.main()
