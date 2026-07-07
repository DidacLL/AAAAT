import importlib.util
import tempfile
import unittest

from aaaat.dashboard_views import normalize_view, render_dashboard_view
from aaaat.db import connect, create_application, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


JINJA_AVAILABLE = importlib.util.find_spec("jinja2") is not None


class DashboardViewHelpersTests(unittest.TestCase):
    def test_normalize_view_defaults_to_welcome(self):
        self.assertEqual(normalize_view("smartView"), "smartView")
        self.assertEqual(normalize_view("unknown"), "welcomeView")
        self.assertEqual(normalize_view(None), "welcomeView")


@unittest.skipUnless(JINJA_AVAILABLE, "Jinja2 is not installed")
class DashboardViewRenderTests(unittest.TestCase):
    def payload(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="View Co", role="Engineer", keywords=["ATS"], pitch="Call pitch")
            payload = dashboard_payload(conn)
        return payload, app

    def test_dashboard_views_keep_stable_hooks(self):
        payload, app = self.payload()
        html = render_dashboard_view(payload, Mode.FULL, view="detailedView", selected_application_id=app["id"])

        self.assertIn('data-dashboard-view="detailedView"', html)
        self.assertIn("data-app-row", html)
        self.assertIn("data-selected-app", html)
        self.assertIn('data-inline-field="next_action"', html)
        self.assertIn('data-inspector-tab="raw"', html)
        self.assertIn("data-write-control", html)
        self.assertIn("data-raw-offer-entry", html)
        self.assertIn('data-keyword="ATS"', html)

    def test_read_only_view_removes_write_and_raw_controls(self):
        payload, app = self.payload()
        html = render_dashboard_view(payload, Mode.READ_ONLY, view="detailedView", selected_application_id=app["id"])

        self.assertNotIn("data-write-control", html)
        self.assertNotIn('data-inspector-tab="raw"', html)
        self.assertNotIn("data-raw-offer-entry", html)

    def test_user_view_is_a_preset_not_a_duplicate_record(self):
        payload, app = self.payload()
        html = render_dashboard_view(payload, Mode.FULL, view="userView", selected_application_id=app["id"])

        self.assertIn('data-dashboard-view="userView"', html)
        self.assertIn("without storing a fork", html)


if __name__ == "__main__":
    unittest.main()
