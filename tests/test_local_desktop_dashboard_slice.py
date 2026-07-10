import inspect
import sys
import tempfile
import tomllib
import unittest
from pathlib import Path

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_contains_private_values
from aaaat.dashboard_modules import default_module_registry, modules_for_view, validate_module_registry
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect, create_application, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


class LocalDesktopDashboardProjectionTests(unittest.TestCase):
    def payload(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(
                conn,
                company="Desktop Co",
                role="Backend Engineer",
                status="meeting",
                priority="high",
                next_action="Prepare recruiter call",
                notes="Primary recruiter-call note",
                pitch="Compact pitch",
                smart_question="What does success look like?",
                risks_to_avoid="Do not overclaim frontend depth",
                prepare_first="Review backend projects",
                prepare_later="Read company blog",
                company_research="Local-first product context",
                form_answers="Draft form answer",
                keywords=["Python"],
            )
            payload = dashboard_payload(conn)
        return payload, app

    def test_projection_contains_four_desktop_view_sections(self):
        payload, app = self.payload()

        projection = build_dashboard_projection(payload, Mode.FULL, view="smart", selected_application_id=app["id"], selected_keyword="Python")

        self.assertEqual(set(["permissions", "view_state", "welcome", "user", "smart", "detailed", "glossary"]).issubset(projection), True)
        self.assertEqual(projection["view_state"]["current_view"], "smart")
        self.assertEqual(projection["view_state"]["selected_candidature_ref"], app["id"])
        self.assertTrue(projection["permissions"]["can_write"])
        self.assertFalse(projection["permissions"]["is_static_demo"])

    def test_smart_projection_uses_one_primary_note_field(self):
        payload, app = self.payload()

        projection = build_dashboard_projection(payload, Mode.FULL, view="smart", selected_application_id=app["id"])
        primary_note = projection["smart"]["primary_note"]

        self.assertEqual(primary_note["candidature_ref"], app["id"])
        self.assertEqual(primary_note["body"], "Primary recruiter-call note")
        self.assertEqual(primary_note["interaction_model"], "single_primary_note")
        self.assertTrue(primary_note["history_is_secondary"])
        self.assertIn("primary_note", [module["id"] for module in projection["smart"]["context_modules"]])

    def test_detailed_projection_is_rows_and_columns(self):
        payload, app = self.payload()

        projection = build_dashboard_projection(payload, Mode.FULL, view="detailed", selected_application_id=app["id"])
        detailed = projection["detailed"]

        self.assertGreaterEqual(len(detailed["rows"]), 1)
        self.assertEqual(detailed["rows"][0]["company"], "Desktop Co")
        self.assertIn("company", [column["id"] for column in detailed["available_columns"]])
        self.assertIn("artifacts_state", detailed["visible_columns"])
        self.assertEqual(detailed["selected_row"]["ref"], app["id"])
        self.assertIn("generate_cv", [action["id"] for action in detailed["toolbox_actions"]])

    def test_projection_respects_read_only_permissions(self):
        payload, app = self.payload()

        projection = build_dashboard_projection(payload, Mode.READ_ONLY, view="smart", selected_application_id=app["id"])

        self.assertFalse(projection["permissions"]["can_write"])
        self.assertFalse(projection["permissions"]["allow_dashboard_actions"])
        self.assertFalse(projection["permissions"]["can_show_raw_intake"])

    def test_projection_is_toolkit_neutral(self):
        self.payload()

        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))


class LocalDesktopDashboardLayoutTests(unittest.TestCase):
    def test_layout_state_round_trips_without_private_values(self):
        state = DashboardLayoutState.default()
        state.selected_candidature_ref = "app_123"
        state.selected_keyword = "Python"
        state.pane_layout["smart"] = {"left": 340, "right": 390}
        state.modules["smart"]["right_context"] = "keyword_context"

        restored = DashboardLayoutState.from_json(state.to_json())

        self.assertEqual(restored.selected_candidature_ref, "app_123")
        self.assertEqual(restored.selected_keyword, "Python")
        self.assertEqual(restored.pane_layout["smart"]["left"], 340)
        self.assertEqual(restored.modules["smart"]["right_context"], "keyword_context")
        self.assertFalse(layout_state_contains_private_values(restored))

    def test_layout_state_can_save_and_load(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = f"{tmp}/ui_state.json"
            state = DashboardLayoutState.default()
            state.selected_view = "detailed"
            state.save(path)

            loaded = DashboardLayoutState.load(path)

        self.assertEqual(loaded.selected_view, "detailed")


class LocalDesktopDashboardModuleRegistryTests(unittest.TestCase):
    def test_default_registry_is_valid_and_view_scoped(self):
        validate_module_registry()
        registry = default_module_registry()

        self.assertIn("primary_note", [module.module_id for module in registry])
        self.assertIn("primary_note", [module.module_id for module in modules_for_view("smart")])
        self.assertIn("detailed_table", [module.module_id for module in modules_for_view("detailed")])
        self.assertIn("profile_summary", [module.module_id for module in modules_for_view("user")])


class LocalDesktopDashboardAdapterTests(unittest.TestCase):
    def test_desktop_projection_builder_imports_without_wx(self):
        from aaaat.ui_desktop.app import build_desktop_projection

        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            projection = build_desktop_projection(tmp, Mode.FULL)

        self.assertIn("smart", projection)
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))

    def test_pyproject_exposes_optional_desktop_launcher(self):
        pyproject = tomllib.loads(Path("pyproject.toml").read_text(encoding="utf-8"))

        self.assertEqual(pyproject["project"]["scripts"]["aaaat-desktop"], "aaaat.ui_desktop.app:main")
        self.assertIn("wxPython", pyproject["project"]["optional-dependencies"]["desktop"])
        self.assertIn("aaaat.ui_desktop", pyproject["tool"]["setuptools"]["packages"])

    def test_wx_code_is_isolated_to_desktop_adapter(self):
        from aaaat.ui_desktop import app as desktop_app

        app_source = inspect.getsource(desktop_app)
        self.assertIn("import wx", app_source)
        self.assertIn("inside this function", app_source)


class LocalDesktopDashboardRuntimeBoundaryTests(unittest.TestCase):
    def test_agent_runtime_does_not_import_desktop_ui_or_projection(self):
        from aaaat.server_fastapi import create_agent_app

        source = inspect.getsource(create_agent_app)

        self.assertNotIn("ui_desktop", source)
        self.assertNotIn("dashboard_projection", source)
        self.assertNotIn("DashboardLayoutState", source)


if __name__ == "__main__":
    unittest.main()
