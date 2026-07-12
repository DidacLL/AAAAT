import importlib.util
import tempfile
import unittest

from aaaat.dashboard_views import dashboard_view_model, normalize_view, render_dashboard_view
from aaaat.db import connect, create_application, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode, can_show_raw_intake, can_write


JINJA_AVAILABLE = importlib.util.find_spec("jinja2") is not None


class DashboardViewNormalizationTests(unittest.TestCase):
    def test_known_views_are_preserved_and_unknown_views_fall_back_safely(self):
        for view in ("welcomeView", "userView", "smartView", "detailedView"):
            self.assertEqual(normalize_view(view), view)
        self.assertEqual(normalize_view("unknown"), "welcomeView")
        self.assertEqual(normalize_view(None), "welcomeView")


@unittest.skipUnless(JINJA_AVAILABLE, "Jinja2 is not installed")
class LegacyBrowserRendererBehaviorTests(unittest.TestCase):
    """Minimal compatibility coverage for the non-canonical browser renderer."""

    def make_payload(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(
                conn,
                company="Renderer Co",
                role="Engineer",
                notes="Private note",
                company_research="Private research",
                keywords=["Python"],
            )
            payload = dashboard_payload(conn, include_raw=True)
        return payload, app

    def test_each_known_view_renders_without_error(self):
        payload, app = self.make_payload()
        for view in ("welcomeView", "userView", "smartView", "detailedView"):
            with self.subTest(view=view):
                html = render_dashboard_view(
                    payload,
                    Mode.FULL,
                    view=view,
                    selected_application_id=app["id"],
                )
                self.assertIsInstance(html, str)
                self.assertGreater(len(html), 100)

    def test_selected_candidature_data_reaches_operational_views(self):
        payload, app = self.make_payload()
        for view in ("smartView", "detailedView"):
            with self.subTest(view=view):
                html = render_dashboard_view(
                    payload,
                    Mode.FULL,
                    view=view,
                    selected_application_id=app["id"],
                )
                self.assertIn("Renderer Co", html)
                self.assertIn("Engineer", html)

    def test_read_only_model_preserves_mode_and_central_policy_disables_access(self):
        payload, app = self.make_payload()
        model = dashboard_view_model(
            payload,
            Mode.READ_ONLY,
            view="detailedView",
            selected_application_id=app["id"],
        )

        self.assertEqual(model["mode"], Mode.READ_ONLY)
        self.assertFalse(can_write(model["mode"]))
        self.assertFalse(can_show_raw_intake(model["mode"]))

    def test_read_only_render_does_not_expose_human_mutation_routes(self):
        payload, app = self.make_payload()
        html = render_dashboard_view(
            payload,
            Mode.READ_ONLY,
            view="detailedView",
            selected_application_id=app["id"],
        )
        self.assertNotIn("/dashboard/actions/", html)


if __name__ == "__main__":
    unittest.main()
