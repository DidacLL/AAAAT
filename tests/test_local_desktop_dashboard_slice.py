import inspect
import sys
import tempfile
import tomllib
import unittest
from pathlib import Path

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_contains_private_values
from aaaat.dashboard_modules import default_module_registry, modules_for_view, validate_module_registry
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import add_raw_intake, connect, create_application, init_db, list_applications, list_raw_intake, set_profile_variable
from aaaat.demo_seed import seed
from aaaat.payload import dashboard_payload
from aaaat.profile_facts import create_profile_fact
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
            add_raw_intake(conn, app["id"], "Literal offer text with responsibilities, requirements, interview process, Python, RAG, Docker, and source clues." * 8, created_by="test")
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

    def test_user_projection_exposes_existing_local_profile_context(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "profile.display_name", "Ada Lovelace")
                set_profile_variable(conn, "profile.email", "ada@example.test")
                create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Python backend",
                    body="Builds local-first backend tooling.",
                    tags=["python", "backend"],
                    visibility="professional",
                    exposure="summarized",
                    use_for_cv=True,
                    use_for_cover_letter=True,
                    use_for_agent_context=True,
                    use_for_dashboard=True,
                    source="user",
                )
                payload = dashboard_payload(conn, include_raw=True)

        projection = build_dashboard_projection(payload, Mode.FULL, view="user")
        user = projection["user"]

        self.assertEqual(projection["view_state"]["current_view"], "user")
        self.assertIn("Ada Lovelace", [item["value"] for item in user["profile_variables"]])
        self.assertTrue(any(item["title"] == "Python backend" for item in user["profile_facts"]))
        self.assertGreaterEqual(user["profile_summary"]["variable_count"], 2)
        self.assertIn("profile_summary", user["workspace_modules"])

    def test_projection_respects_read_only_permissions(self):
        payload, app = self.payload()

        projection = build_dashboard_projection(payload, Mode.READ_ONLY, view="smart", selected_application_id=app["id"])

        self.assertFalse(projection["permissions"]["can_write"])
        self.assertFalse(projection["permissions"]["allow_dashboard_actions"])
        self.assertFalse(projection["permissions"]["can_show_raw_intake"])

    def test_projection_is_toolkit_neutral(self):
        self.payload()

        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))


class LocalDesktopUserViewFieldTests(unittest.TestCase):
    def projection(self):
        return {
            "user": {
                "profile_summary": {"variable_count": 2, "fact_count": 1, "ready_for_templates": False},
                "profile_variables": [
                    {"key": "profile.display_name", "value": "Ada Lovelace"},
                    {"key": "profile.email", "value": "ada@example.test"},
                    {"key": "profile.preference.tone", "value": "brief"},
                ],
                "profile_variable_records": [
                    {"key": "profile.display_name", "exposure": "placeholder", "updated_at": "2026-01-01T00:00:00+00:00"},
                ],
                "profile_facts": [
                    {
                        "fact_type": "skill",
                        "title": "Python backend",
                        "body": "Builds local-first backend tooling.",
                        "source": "user",
                        "review_state": "active",
                        "usage": {"cv": True, "cover_letter": True, "agent_context": True, "market_research": False, "dashboard": True},
                    }
                ],
                "template_summary": {"missing_profile_variables": ["profile.summary.default"]},
                "career_summary": {"configured": False, "note": "No dedicated local CareerPlan record is projected yet."},
                "settings_summary": {"storage_mode": "local", "privacy": "local-first"},
                "workspace_modules": ["profile_summary", "career_summary", "template_summary", "settings_summary"],
            }
        }

    def test_user_view_source_has_grouped_sections(self):
        from aaaat.ui_desktop.user_fields import FIELD_GROUPS, grouped_user_fields

        groups = grouped_user_fields(self.projection())

        self.assertEqual([group["title"] for group in groups], FIELD_GROUPS)
        for title in (
            "Identity",
            "Preferences",
            "Application defaults",
            "Profile facts",
            "Research/context",
            "Generated or derived context",
            "Raw/source/provenance",
        ):
            self.assertIn(title, [group["title"] for group in groups])

    def test_user_view_renders_useful_profile_values_and_facts(self):
        from aaaat.ui_desktop.user_fields import grouped_user_fields

        rendered = "\n".join(str(field["value"]) for group in grouped_user_fields(self.projection()) for field in group["fields"])

        self.assertIn("Ada Lovelace", rendered)
        self.assertIn("ada@example.test", rendered)
        self.assertIn("Python backend", rendered)
        self.assertIn("Template ready: no", rendered)

    def test_unsupported_or_read_only_user_fields_are_not_storage_updates(self):
        from aaaat.ui_desktop.user_fields import collect_writable_user_changes

        changes = collect_writable_user_changes(
            {"profile.display_name": "Ada", "raw_provenance": "old"},
            {"profile.display_name": "Ada L.", "raw_provenance": "new", "unsupported": "new"},
            {"profile.display_name": "profile.display_name", "raw_provenance": None, "unsupported": "profile.unsupported"},
        )

        self.assertEqual(changes, {"profile.display_name": "Ada L."})


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

    def test_dashboard_projection_builder_imports_without_wx(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                payload = dashboard_payload(conn, include_raw=True)

        projection = build_dashboard_projection(payload, Mode.FULL, view="smart")

        self.assertIn("smart", projection)
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))

    def test_pyproject_exposes_actual_desktop_launcher(self):
        pyproject = tomllib.loads(Path("pyproject.toml").read_text(encoding="utf-8"))

        self.assertEqual(pyproject["project"]["name"], "aaaat")
        self.assertEqual(pyproject["project"]["scripts"]["aaaat-desktop"], "aaaat.ui_desktop.app:main")
        self.assertEqual(pyproject["project"]["scripts"]["aaaat-seed-desktop-demo"], "aaaat.demo_seed:main")
        self.assertIn("wxPython", pyproject["project"]["optional-dependencies"]["desktop"])
        self.assertIn("aaaat.ui_desktop", pyproject["tool"]["setuptools"]["packages"])

    def test_smart_view_still_launches_through_aaaat_desktop(self):
        source = Path("aaaat/ui_desktop/app.py").read_text(encoding="utf-8")

        self.assertIn("def launch_desktop_dashboard", source)
        self.assertIn("DesktopDashboardFrame", source)
        self.assertIn("DesktopCommandService", source)
        self.assertIn('argparse.ArgumentParser(prog="aaaat-desktop")', source)

    def test_user_view_is_reachable_from_desktop_frame(self):
        main_window = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")
        smart_view = Path("aaaat/ui_desktop/smart_view.py").read_text(encoding="utf-8")
        user_view = Path("aaaat/ui_desktop/user_view.py").read_text(encoding="utf-8")

        self.assertIn("UserViewMixin", main_window)
        self.assertIn("_build_user_surface", main_window)
        self.assertIn("self.view_book", main_window)
        self.assertIn("self._go_user", smart_view)
        self.assertIn('self.current_view = "user"', user_view)

    def test_wx_imports_remain_isolated_to_desktop_ui_modules(self):
        allowed = {Path("aaaat/ui_desktop")}
        offenders = []
        for path in Path("aaaat").rglob("*.py"):
            source = path.read_text(encoding="utf-8")
            if "import wx" in source and not any(parent in path.parents for parent in allowed):
                offenders.append(str(path))

        self.assertEqual(offenders, [])

    def test_desktop_app_import_is_behavior_free_until_launch(self):
        from aaaat.ui_desktop import app as desktop_app

        app_source = inspect.getsource(desktop_app)
        self.assertIn("import wx", app_source)
        self.assertIn("inside this function", app_source)
        self.assertNotIn("card_state_patch", app_source)
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))

    def test_main_window_is_reduced_to_top_level_layout(self):
        source = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")

        self.assertIn("class DesktopDashboardFrame", source)
        self.assertIn("SmartViewMixin", source)
        self.assertIn("UserViewMixin", source)
        self.assertIn("_build_menu", source)
        self.assertIn("_build_shell", source)
        self.assertIn("center_notes_panel", source)
        self.assertIn("wx.WrapSizer(wx.HORIZONTAL)", source)
        self.assertLess(len(source.splitlines()), 235)
        self.assertNotIn("update_application", source)
        self.assertNotIn("apply_center_card_state_patch", source)

    def test_extracted_adapter_modules_hold_smart_view_behavior(self):
        smart_view = Path("aaaat/ui_desktop/smart_view.py").read_text(encoding="utf-8")
        overview = Path("aaaat/ui_desktop/overview_board.py").read_text(encoding="utf-8")
        center_cards = Path("aaaat/ui_desktop/center_cards.py").read_text(encoding="utf-8")
        keyword_pane = Path("aaaat/ui_desktop/keyword_pane.py").read_text(encoding="utf-8")
        notes_band = Path("aaaat/ui_desktop/notes_band.py").read_text(encoding="utf-8")
        links = Path("aaaat/ui_desktop/wx_html_links.py").read_text(encoding="utf-8")
        services = Path("aaaat/ui_desktop/services.py").read_text(encoding="utf-8")

        self.assertIn("_show_focus", smart_view)
        self.assertIn("_apply_focus_layout", smart_view)
        self.assertIn("total_width * 0.20", smart_view)
        self.assertIn("_refresh_right_context", smart_view)
        self.assertIn("command_service.save_note", smart_view)
        self.assertIn("Click again to open Smart View", overview)
        self.assertIn("EXPANDED_CARD_SIZE", overview)
        self.assertIn("_on_card_click", overview)
        self.assertIn("Literal offer/source text", center_cards)
        self.assertIn("CenterCardBuilder", center_cards)
        self.assertIn("StopPropagation", center_cards)
        self.assertIn("Keyword ·", keyword_pane)
        self.assertIn("definition", keyword_pane)
        self.assertIn("NotesBand", notes_band)
        self.assertIn("Save", notes_band)
        self.assertIn("kw:", links)
        self.assertIn("EVT_HTML_LINK_CLICKED", links)
        self.assertIn("update_application", services)
        self.assertNotIn("connect(", notes_band)

    def test_user_view_writes_go_through_desktop_command_service(self):
        user_view = Path("aaaat/ui_desktop/user_view.py").read_text(encoding="utf-8")
        user_panel = Path("aaaat/ui_desktop/user_panel.py").read_text(encoding="utf-8")
        services = Path("aaaat/ui_desktop/services.py").read_text(encoding="utf-8")

        self.assertIn("command_service.update_profile_variables", user_view)
        self.assertIn("collect_writable_user_changes", user_panel)
        self.assertIn("Cancel/Revert", user_panel)
        self.assertIn("update_profile_variables", services)
        self.assertIn("set_profile_variable", services)
        self.assertNotIn("connect(", user_panel)
        self.assertNotIn("update_application", user_panel)

    def test_card_state_patch_is_removed(self):
        app_source = Path("aaaat/ui_desktop/app.py").read_text(encoding="utf-8")
        smart_source = Path("aaaat/ui_desktop/smart_view.py").read_text(encoding="utf-8")
        main_source = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")

        self.assertFalse(Path("aaaat/ui_desktop/card_state_patch.py").exists())
        self.assertNotIn("apply_center_card_state_patch", app_source + smart_source + main_source)

    def test_center_card_state_is_explicit_and_independent(self):
        from aaaat.ui_desktop.card_state import CenterCardState

        state = CenterCardState.default()

        self.assertTrue(state.is_expanded("call"))
        self.assertFalse(state.is_expanded("source"))
        self.assertTrue(state.is_expanded("now"))
        state.toggle("call")
        self.assertFalse(state.is_expanded("call"))
        self.assertTrue(state.is_expanded("now"))
        state.toggle("source")
        self.assertTrue(state.is_expanded("source"))
        self.assertFalse(state.is_expanded("call"))

    def test_collapsing_all_center_cards_leaves_all_collapsed(self):
        from aaaat.ui_desktop.card_state import DEFAULT_CENTER_CARD_STATES, CenterCardState

        state = CenterCardState.default()
        for card_id in DEFAULT_CENTER_CARD_STATES:
            state.set_expanded(card_id, False)

        self.assertEqual(state.expanded_ids(), set())
        self.assertFalse(state.is_expanded("call", True))
        self.assertFalse(state.is_expanded("now", True))


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
