import inspect
import sys
import tempfile
import tomllib
import unittest
from pathlib import Path

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_contains_private_values
from aaaat.dashboard_modules import default_module_registry, modules_for_view, validate_module_registry
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import add_raw_intake, connect, create_application, init_db, list_applications, list_raw_intake
from aaaat.demo_seed import seed
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
            add_raw_intake(conn, app["id"], "Literal offer text with responsibilities, requirements, interview process, and source clues." * 8, created_by="test")
            payload = dashboard_payload(conn, include_raw=True)
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

    def test_smart_projection_exposes_literal_source_text(self):
        payload, app = self.payload()

        projection = build_dashboard_projection(payload, Mode.FULL, view="smart", selected_application_id=app["id"])
        detail = projection["smart"]["selected_candidature_detail"]
        source = projection["smart"]["source_text"]

        self.assertIn("Literal offer text", detail["source_text"])
        self.assertIn("Literal offer text", source["body"])
        self.assertTrue(source["has_raw"])
        self.assertGreater(source["length"], 200)
        self.assertIn("source_text", [module["id"] for module in projection["smart"]["context_modules"]])

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

    def test_smart_defaults_give_right_context_less_space(self):
        state = DashboardLayoutState.default()

        self.assertLess(state.pane_layout["smart"]["right"], state.pane_layout["detailed"]["right"])
        self.assertLessEqual(state.pane_layout["smart"]["left"], 220)
        self.assertLessEqual(state.pane_layout["smart"]["right"], 220)


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
        self.assertEqual(pyproject["project"]["scripts"]["aaaat-seed-desktop-demo"], "aaaat.demo_seed:main")
        self.assertIn("wxPython", pyproject["project"]["optional-dependencies"]["desktop"])
        self.assertIn("aaaat.ui_desktop", pyproject["tool"]["setuptools"]["packages"])

    def test_wx_code_is_isolated_to_desktop_adapter(self):
        from aaaat.ui_desktop import app as desktop_app

        app_source = inspect.getsource(desktop_app)
        self.assertIn("import wx", app_source)
        self.assertIn("inside this function", app_source)

    def test_smart_view_source_has_overview_and_focus_modes(self):
        source = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")

        self.assertIn("overview", source)
        self.assertIn("_candidature_card", source)
        self.assertIn("_show_focus", source)
        self.assertIn("CollapsiblePane", source)
        self.assertIn("Reset layout", source)
        self.assertIn("DEFAULT_FOCUS_RIGHT = 210", source)
        self.assertIn("overview_cards_sizer", source)
        self.assertIn("wx.WrapSizer(wx.HORIZONTAL)", source)
        self.assertIn("_bind_card_click", source)
        self.assertIn("_on_card_click", source)
        self.assertIn("expanded_overview_ref", source)
        self.assertIn("EXPANDED_CARD_SIZE", source)
        self.assertIn("Click again to open Smart View", source)
        self.assertIn("_add_source_reader", source)
        self.assertIn("Literal offer/source text", source)
        self.assertIn("wx.TE_READONLY", source)
        self.assertIn("Freeze()", source)
        self.assertNotIn("center_grid = wx.FlexGridSizer", source)
        self.assertNotIn("_overview_cards_sizer", source)


class LocalDesktopDashboardSeedTests(unittest.TestCase):
    def test_seed_creates_many_mostly_complete_candidatures(self):
        with tempfile.TemporaryDirectory() as tmp:
            summary = seed(tmp, count=18, reset=True)
            with connect(tmp) as conn:
                apps = list_applications(conn)
                raw = list_raw_intake(conn, apps[0]["id"])

        self.assertEqual(summary["total"], 18)
        self.assertEqual(summary["created"], 18)
        self.assertEqual(len(apps), 18)
        self.assertTrue(any(app["pitch"] for app in apps))
        self.assertTrue(any(app["call_signals"] for app in apps))
        self.assertTrue(any(app["keywords"] for app in apps))
        self.assertTrue(raw)
        self.assertGreater(len(raw[0]["content"]), 1000)
        self.assertIn("About the role", raw[0]["content"])

    def test_seed_is_idempotent_without_reset(self):
        with tempfile.TemporaryDirectory() as tmp:
            first = seed(tmp, count=3, reset=True)
            second = seed(tmp, count=3)
            with connect(tmp) as conn:
                apps = list_applications(conn)
                raw = [list_raw_intake(conn, app["id"]) for app in apps]

        self.assertEqual(first["created"], 3)
        self.assertEqual(second["updated"], 3)
        self.assertEqual(len(apps), 3)
        self.assertTrue(all(len(items) == 1 for items in raw))


class LocalDesktopDashboardRuntimeBoundaryTests(unittest.TestCase):
    def test_agent_runtime_does_not_import_desktop_ui_or_projection(self):
        from aaaat.server_fastapi import create_agent_app

        source = inspect.getsource(create_agent_app)

        self.assertNotIn("ui_desktop", source)
        self.assertNotIn("dashboard_projection", source)
        self.assertNotIn("DashboardLayoutState", source)


if __name__ == "__main__":
    unittest.main()
