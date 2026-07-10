import inspect
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect, create_application, get_application, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


class LocalDesktopDetailedViewProjectionTests(unittest.TestCase):
    def payload(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            first = create_application(
                conn,
                company="Batch Co",
                role="Platform Engineer",
                status="applied",
                priority="high",
                next_action="Review artifacts",
                notes="Needs structured review",
                source="LinkedIn",
                location="Madrid",
                remote_mode="hybrid",
                pitch="Original pitch",
                keywords=["Python", "Kubernetes"],
            )
            second = create_application(
                conn,
                company="Review Labs",
                role="Backend Engineer",
                status="draft",
                priority="normal",
                next_action="Check form answers",
                notes="Candidate row two",
                source="Referral",
                location="Remote",
                remote_mode="remote",
                keywords=["FastAPI"],
            )
            payload = dashboard_payload(conn, include_raw=True)
        return payload, first, second, tmp.name

    def test_detailed_projection_exposes_rows_and_selected_row(self):
        payload, first, _second, _storage = self.payload()

        projection = build_dashboard_projection(payload, Mode.FULL, view="detailed", selected_application_id=first["id"])
        detailed = projection["detailed"]

        self.assertEqual(projection["view_state"]["current_view"], "detailed")
        self.assertEqual(len(detailed["rows"]), 2)
        self.assertEqual(detailed["selected_row"]["ref"], first["id"])
        self.assertEqual(detailed["selected_row"]["company"], "Batch Co")
        self.assertIn("company", [column["id"] for column in detailed["available_columns"]])
        self.assertIn("next_action", detailed["visible_columns"])
        self.assertIn("generate_cover_letter", [action["id"] for action in detailed["toolbox_actions"]])

    def test_desktop_projection_builder_can_open_detailed_without_wx(self):
        from aaaat.ui_desktop.app import build_desktop_projection

        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            state = DashboardLayoutState.default()
            state.selected_view = "detailed"
            projection = build_desktop_projection(tmp, Mode.FULL, state)

        self.assertEqual(projection["view_state"]["current_view"], "detailed")
        self.assertIn("detailed", projection)
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))

    def test_desktop_command_service_updates_supported_fields_only(self):
        from aaaat.ui_desktop.services import DesktopCommandService

        _payload, first, _second, storage = self.payload()
        service = DesktopCommandService(storage)

        service.update_candidature_fields(
            first["id"],
            {
                "company": "Batch Co Edited",
                "role": "Senior Platform Engineer",
                "notes": "Updated detail note",
                "pitch": "unsupported write should not pass detail boundary",
            },
        )
        with connect(storage) as conn:
            updated = get_application(conn, first["id"])

        self.assertEqual(updated["company"], "Batch Co Edited")
        self.assertEqual(updated["role"], "Senior Platform Engineer")
        self.assertEqual(updated["notes"], "Updated detail note")
        self.assertEqual(updated["pitch"], "Original pitch")

    def test_detail_columns_normalize_visible_columns_without_wx(self):
        from aaaat.ui_desktop.detail_columns import DEFAULT_DETAILED_VISIBLE_COLUMNS, column_title, normalize_visible_columns

        available = [
            {"id": "company", "title": "Company"},
            {"id": "role", "title": "Role"},
            {"id": "status", "title": "Status"},
            {"id": "priority", "title": "Priority"},
        ]

        self.assertEqual(normalize_visible_columns(available, ["role", "missing", "company"]), ["role", "company"])
        self.assertEqual(normalize_visible_columns(available, []), ["company", "role", "status", "priority"])
        self.assertEqual(column_title(available, "role"), "Role")
        self.assertIn("company", DEFAULT_DETAILED_VISIBLE_COLUMNS)
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))


class LocalDesktopDetailedViewAdapterTests(unittest.TestCase):
    def test_detailed_view_can_be_opened_from_desktop_frame(self):
        main_window = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")
        smart_view = Path("aaaat/ui_desktop/smart_view.py").read_text(encoding="utf-8")
        detailed_view = Path("aaaat/ui_desktop/detailed_view.py").read_text(encoding="utf-8")

        self.assertIn("DetailedViewMixin", main_window)
        self.assertIn("detailed_button", main_window)
        self.assertIn("_build_detailed_surface", main_window)
        self.assertIn("detailed_button.Bind", smart_view)
        self.assertIn("_go_detailed", smart_view)
        self.assertIn("_show_detailed", detailed_view)
        self.assertIn("_refresh_detailed_view", detailed_view)

    def test_detailed_view_uses_extracted_table_and_panel_modules(self):
        table = Path("aaaat/ui_desktop/detail_table.py").read_text(encoding="utf-8")
        panel = Path("aaaat/ui_desktop/detail_panel.py").read_text(encoding="utf-8")
        detailed_view = Path("aaaat/ui_desktop/detailed_view.py").read_text(encoding="utf-8")
        main_window = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")

        self.assertIn("class DetailTable", table)
        self.assertIn("wx.ListCtrl", table)
        self.assertIn("selected_ref", table)
        self.assertIn("visible_columns", table)
        self.assertIn("class DetailPanel", panel)
        self.assertIn("Open in Smart View", panel)
        self.assertIn("Review actions", panel)
        self.assertIn("DetailTable", detailed_view)
        self.assertIn("DetailPanel", detailed_view)
        self.assertNotIn("wx.ListCtrl", main_window)
        self.assertNotIn("Review actions", main_window)

    def test_column_hide_show_controls_are_present(self):
        detailed_view = Path("aaaat/ui_desktop/detailed_view.py").read_text(encoding="utf-8")
        table = Path("aaaat/ui_desktop/detail_table.py").read_text(encoding="utf-8")
        columns = Path("aaaat/ui_desktop/detail_columns.py").read_text(encoding="utf-8")

        self.assertIn("Columns…", detailed_view)
        self.assertIn("wx.MultiChoiceDialog", detailed_view)
        self.assertIn("_on_choose_detailed_columns", detailed_view)
        self.assertIn("layout_state.detailed_columns", detailed_view)
        self.assertIn("normalize_visible_columns", table)
        self.assertIn("DEFAULT_DETAILED_VISIBLE_COLUMNS", columns)

    def test_detail_panel_exposes_editable_fields_and_explicit_save_cancel(self):
        panel = Path("aaaat/ui_desktop/detail_panel.py").read_text(encoding="utf-8")

        for field in ("company", "role", "status", "priority", "location", "remote_mode", "source", "source_url", "next_action", "notes"):
            self.assertIn(field, panel)
        self.assertIn("Editable fields", panel)
        self.assertIn("Read-only context", panel)
        self.assertIn("Save", panel)
        self.assertIn("Cancel/Revert", panel)
        self.assertIn("_on_save", panel)
        self.assertIn("_on_cancel", panel)
        self.assertNotIn("update_application", panel)
        self.assertNotIn("connect(", panel)

    def test_detail_panel_save_uses_desktop_command_service_and_refresh_path(self):
        detailed_view = Path("aaaat/ui_desktop/detailed_view.py").read_text(encoding="utf-8")
        services = Path("aaaat/ui_desktop/services.py").read_text(encoding="utf-8")

        self.assertIn("command_service.update_candidature_fields", detailed_view)
        self.assertIn("_save_detail_edits", detailed_view)
        self.assertIn("_reload_projection()", detailed_view)
        self.assertIn("_refresh_detailed_view()", detailed_view)
        self.assertIn("update_candidature_fields", services)
        self.assertIn("SUPPORTED_DETAIL_EDIT_FIELDS", services)
        self.assertIn("update_application", services)

    def test_main_window_remains_top_level_shell_only(self):
        source = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")

        self.assertLess(len(source.splitlines()), 230)
        self.assertIn("_build_menu", source)
        self.assertIn("_build_toolbar", source)
        self.assertIn("_build_focus_surface", source)
        self.assertIn("_build_detailed_surface", source)
        self.assertNotIn("update_application", source)
        self.assertNotIn("build_dashboard_projection", source)
        self.assertNotIn("wx.ListCtrl", source)
        self.assertNotIn("MultiChoiceDialog", source)
        self.assertNotIn("EDITABLE_FIELDS", source)

    def test_smart_view_behavior_guards_remain_present(self):
        smart_view = Path("aaaat/ui_desktop/smart_view.py").read_text(encoding="utf-8")
        overview = Path("aaaat/ui_desktop/overview_board.py").read_text(encoding="utf-8")
        center_cards = Path("aaaat/ui_desktop/center_cards.py").read_text(encoding="utf-8")
        links = Path("aaaat/ui_desktop/wx_html_links.py").read_text(encoding="utf-8")

        self.assertIn("_show_focus", smart_view)
        self.assertIn("_apply_focus_layout", smart_view)
        self.assertIn("total_width * 0.20", smart_view)
        self.assertIn("_refresh_right_context", smart_view)
        self.assertIn("Click again to open Smart View", overview)
        self.assertIn("Literal offer/source text", center_cards)
        self.assertIn("kw:", links)
        self.assertFalse(Path("aaaat/ui_desktop/card_state_patch.py").exists())

    def test_projection_runtime_boundary_stays_toolkit_neutral(self):
        from aaaat.server_fastapi import create_agent_app

        agent_source = inspect.getsource(create_agent_app)
        projection_source = Path("aaaat/dashboard_projection.py").read_text(encoding="utf-8")

        self.assertNotIn("ui_desktop", agent_source)
        self.assertNotIn("dashboard_projection", agent_source)
        self.assertNotIn("DashboardLayoutState", agent_source)
        self.assertNotIn("import wx", projection_source)


if __name__ == "__main__":
    unittest.main()
