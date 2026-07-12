import tempfile
import unittest

from aaaat.dashboard import render_dashboard
from aaaat.db import connect, create_application, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode, can_show_raw_intake, can_write


class DashboardModeTests(unittest.TestCase):
    def test_security_policy_distinguishes_full_read_only_and_static_modes(self):
        self.assertTrue(can_write(Mode.FULL))
        self.assertFalse(can_write(Mode.READ_ONLY))
        self.assertFalse(can_write(Mode.STATIC_DEMO))
        self.assertTrue(can_show_raw_intake(Mode.FULL))
        self.assertFalse(can_show_raw_intake(Mode.READ_ONLY))
        self.assertFalse(can_show_raw_intake(Mode.STATIC_DEMO))

    def test_renderer_handles_complete_and_sparse_payloads(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_application(conn, company="Complete Co", role="Engineer", keywords=["Python"])
                payload = dashboard_payload(conn)

        full_html = render_dashboard(payload, Mode.FULL)
        read_only_html = render_dashboard(payload, Mode.READ_ONLY)
        self.assertIn("Complete Co", full_html)
        self.assertIn("Complete Co", read_only_html)
        self.assertGreater(len(full_html), 100)
        self.assertGreater(len(read_only_html), 100)

        sparse_payload = {
            "applications": [{
                "id": "app_sparse",
                "company": "Sparse Co",
                "role": "Sparse Role",
                "status": "draft",
                "priority": "normal",
                "next_action": "",
                "keywords": [],
                "artifacts": [],
            }],
            "glossary": [],
            "profile_variables": {},
            "missing_profile_variables": ["profile.display_name"],
        }
        sparse_html = render_dashboard(sparse_payload, Mode.FULL)
        self.assertIn("Sparse Co", sparse_html)
        self.assertIn("Sparse Role", sparse_html)

    def test_read_only_render_has_no_dashboard_mutation_endpoints(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Safe Co", role="Engineer")
                payload = dashboard_payload(conn)

        html = render_dashboard(payload, Mode.READ_ONLY, app["id"])
        self.assertNotIn("/dashboard/actions/", html)


if __name__ == "__main__":
    unittest.main()
