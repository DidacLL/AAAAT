import sys
import tempfile
import unittest

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.db import connect, create_application, get_application, ensure_workspace_database


class DesktopStateAndRefreshContractTests(unittest.TestCase):
    def test_center_cards_can_change_independently_and_all_collapse(self):
        from aaaat.ui_desktop.card_state import DEFAULT_CENTER_CARD_STATES, CenterCardState

        state = CenterCardState.default()
        initial = {card_id: state.is_expanded(card_id) for card_id in DEFAULT_CENTER_CARD_STATES}
        first = next(iter(DEFAULT_CENTER_CARD_STATES))
        state.toggle(first)

        self.assertNotEqual(state.is_expanded(first), initial[first])
        for card_id in DEFAULT_CENTER_CARD_STATES:
            state.set_expanded(card_id, False)
        self.assertEqual(state.expanded_ids(), set())

    def test_cancel_contract_can_restore_projected_user_values_without_writes(self):
        from aaaat.ui_desktop.user_fields import collect_writable_user_changes

        projected = {"profile.display_name": "Ada", "profile.email": "ada@example.test"}
        edited = {"profile.display_name": "Ada Edited", "profile.email": "ada@example.test"}
        field_map = {
            "profile.display_name": "profile.display_name",
            "profile.email": "profile.email",
        }

        self.assertEqual(
            collect_writable_user_changes(projected, edited, field_map),
            {"profile.display_name": "Ada Edited"},
        )
        self.assertEqual(collect_writable_user_changes(projected, projected, field_map), {})

    def test_save_then_reload_returns_durable_candidature_state(self):
        from aaaat.ui_desktop.services import DesktopCommandService
        from aaaat.ui_desktop.app import build_desktop_projection

        with tempfile.TemporaryDirectory() as tmp:
            ensure_workspace_database(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Before", role="Engineer", notes="Old note")
            service = DesktopCommandService(tmp)
            service.update_candidature_fields(app["id"], {"company": "After", "notes": "New note"})

            state = DashboardLayoutState.default()
            state.selected_view = "detailed"
            state.selected_candidature_ref = app["id"]
            projection = build_desktop_projection(tmp, state)
            with connect(tmp) as conn:
                stored = get_application(conn, app["id"])

        self.assertEqual(stored["company"], "After")
        self.assertEqual(stored["notes"], "New note")
        self.assertEqual(projection["detailed"]["selected_row"]["company"], "After")
        self.assertEqual(projection["view_state"]["selected_candidature_ref"], app["id"])

    def test_core_desktop_modules_import_without_wx(self):
        from aaaat.ui_desktop import app
        from aaaat.ui_desktop import card_state, detail_columns, detail_fields, services, user_fields

        self.assertIsNotNone(app.build_desktop_projection)
        self.assertIsNotNone(card_state.CenterCardState)
        self.assertIsNotNone(detail_columns.normalize_visible_columns)
        self.assertIsNotNone(detail_fields.collect_writable_changes)
        self.assertIsNotNone(services.DesktopCommandService)
        self.assertIsNotNone(user_fields.collect_writable_user_changes)
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))


if __name__ == "__main__":
    unittest.main()
