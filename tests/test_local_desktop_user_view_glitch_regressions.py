from pathlib import Path
import unittest


class LocalDesktopUserViewGlitchRegressionTests(unittest.TestCase):
    def test_center_card_state_reset_restores_defaults(self):
        from aaaat.ui_desktop.card_state import DEFAULT_CENTER_CARD_STATES, CenterCardState

        state = CenterCardState.default()
        for card_id in DEFAULT_CENTER_CARD_STATES:
            state.set_expanded(card_id, not DEFAULT_CENTER_CARD_STATES[card_id])

        state.reset()

        self.assertEqual(state.expanded, DEFAULT_CENTER_CARD_STATES)
        self.assertTrue(state.is_expanded("call"))
        self.assertFalse(state.is_expanded("source"))

    def test_short_multiline_text_controls_do_not_trap_parent_scroll(self):
        scrolling = Path("aaaat/ui_desktop/scrolling.py").read_text(encoding="utf-8")

        self.assertIn("_window_can_scroll_vertically", scrolling)
        self.assertIn("GetScrollRange(wx.VERTICAL)", scrolling)
        self.assertIn("GetScrollThumb(wx.VERTICAL)", scrolling)
        self.assertIn("scroll_range > scroll_thumb > 0", scrolling)

    def test_view_buttons_are_toggle_buttons_and_synced_from_current_view(self):
        main_window = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")
        smart_view = Path("aaaat/ui_desktop/smart_view.py").read_text(encoding="utf-8")
        detailed_view = Path("aaaat/ui_desktop/detailed_view.py").read_text(encoding="utf-8")
        user_view = Path("aaaat/ui_desktop/user_view.py").read_text(encoding="utf-8")

        self.assertIn("wx.ToggleButton(self.toolbar, label=\"List\"", main_window)
        self.assertIn("wx.ToggleButton(self.toolbar, label=\"Detailed\"", main_window)
        self.assertIn("wx.ToggleButton(self.toolbar, label=\"User\"", main_window)
        self.assertIn("def _sync_view_buttons", smart_view)
        self.assertIn("button.SetValue(selected)", smart_view)
        self.assertIn("self._sync_view_buttons()", detailed_view)
        self.assertIn("self._sync_view_buttons()", user_view)

    def test_view_switches_defer_root_layout_to_single_refresh_pass(self):
        smart_view = Path("aaaat/ui_desktop/smart_view.py").read_text(encoding="utf-8")
        detailed_view = Path("aaaat/ui_desktop/detailed_view.py").read_text(encoding="utf-8")
        user_view = Path("aaaat/ui_desktop/user_view.py").read_text(encoding="utf-8")

        for source, method_name in (
            (smart_view, "def _show_overview"),
            (smart_view, "def _show_focus"),
            (detailed_view, "def _show_detailed"),
            (user_view, "def _show_user"),
        ):
            method_body = source[source.index(method_name) : source.index("\n    def ", source.index(method_name) + 1)]
            self.assertNotIn("root_sizer.Layout()", method_body)
            self.assertNotIn("self.Layout()", method_body)


if __name__ == "__main__":
    unittest.main()
