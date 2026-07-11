import tempfile
import unittest

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.db import connect, create_application, init_db, set_profile_variable
from aaaat.desktop_view_projection import build_desktop_view_projection
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


class DesktopViewProjectionTests(unittest.TestCase):
    def payload(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(
                conn,
                company="Projection Co",
                role="Engineer",
                notes="Call note",
                keywords=["Python"],
            )
            set_profile_variable(conn, "profile.display_name", "Ada")
            payload = dashboard_payload(conn, include_raw=True)
        return payload, app

    def test_smart_builds_only_smart_runtime_sections(self):
        payload, app = self.payload()
        projection = build_desktop_view_projection(
            payload,
            Mode.FULL,
            view="smart",
            selected_application_id=app["id"],
        )
        self.assertIn("smart", projection)
        self.assertIn("glossary", projection)
        self.assertNotIn("user", projection)
        self.assertNotIn("detailed", projection)
        self.assertNotIn("modules", projection)

    def test_detailed_builds_required_selected_record_sections_only(self):
        payload, app = self.payload()
        projection = build_desktop_view_projection(
            payload,
            Mode.FULL,
            view="detailed",
            selected_application_id=app["id"],
        )
        self.assertIn("detailed", projection)
        self.assertIn("smart", projection)
        self.assertNotIn("user", projection)
        self.assertNotIn("welcome", projection)
        self.assertEqual(projection["detailed"]["selected_row"]["ref"], app["id"])

    def test_user_build_does_not_depend_on_generic_module_registry(self):
        payload, _app = self.payload()
        projection = build_desktop_view_projection(payload, Mode.FULL, view="user")
        self.assertIn("user", projection)
        self.assertEqual(
            projection["user"]["workspace_modules"],
            ["profile_summary", "career_summary", "template_summary", "settings_summary"],
        )
        self.assertNotIn("smart", projection)
        self.assertNotIn("modules", projection)

    def test_empty_storage_keeps_current_wx_overview_compatible(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                payload = dashboard_payload(conn, include_raw=True)
        projection = build_desktop_view_projection(
            payload,
            Mode.FULL,
            view="welcome",
            layout_state=DashboardLayoutState.default(),
        )
        self.assertEqual(projection["view_state"]["current_view"], "welcome")
        self.assertIn("welcome", projection)
        self.assertIn("smart", projection)
        self.assertEqual(projection["smart"]["candidature_summaries"], [])

    def test_read_only_permissions_remain_central(self):
        payload, app = self.payload()
        projection = build_desktop_view_projection(
            payload,
            Mode.READ_ONLY,
            view="smart",
            selected_application_id=app["id"],
        )
        self.assertFalse(projection["permissions"]["can_write"])
        self.assertFalse(projection["permissions"]["can_show_raw_intake"])


if __name__ == "__main__":
    unittest.main()
