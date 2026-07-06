import tempfile
import unittest

from aaaat.dashboard import render_dashboard
from aaaat.db import connect, create_application, init_db
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
        self.assertIn("No current artifacts", html)
        self.assertIn("profile.display_name", html)


if __name__ == "__main__":
    unittest.main()
