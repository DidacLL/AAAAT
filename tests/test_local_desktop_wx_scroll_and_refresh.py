from pathlib import Path
import unittest


class LocalDesktopWxScrollAndRefreshTests(unittest.TestCase):
    def test_child_widgets_forward_wheel_events_to_parent_scrollers(self):
        scrolling = Path("aaaat/ui_desktop/scrolling.py").read_text(encoding="utf-8")
        smart_view = Path("aaaat/ui_desktop/smart_view.py").read_text(encoding="utf-8")
        overview = Path("aaaat/ui_desktop/overview_board.py").read_text(encoding="utf-8")
        detail_panel = Path("aaaat/ui_desktop/detail_panel.py").read_text(encoding="utf-8")

        self.assertIn("bind_parent_wheel_scroll", scrolling)
        self.assertIn("wx.EVT_MOUSEWHEEL", scrolling)
        self.assertIn("scrolled_parent.Scroll", scrolling)
        self.assertIn("wx.TextCtrl", scrolling)
        self.assertIn("wx.TE_MULTILINE", scrolling)
        self.assertIn("StopPropagation", scrolling)
        self.assertIn("bind_parent_wheel_scroll(self.center_scroll, self.center_scroll)", smart_view)
        self.assertIn("bind_parent_wheel_scroll(self.right_scroll, self.right_scroll)", smart_view)
        self.assertIn("bind_parent_wheel_scroll(self.overview_scroll, self.overview_scroll)", overview)
        self.assertIn("bind_parent_wheel_scroll(self, self)", detail_panel)

    def test_detailed_selection_refreshes_are_frozen_to_prevent_intermediate_paint(self):
        detailed_view = Path("aaaat/ui_desktop/detailed_view.py").read_text(encoding="utf-8")
        detail_table = Path("aaaat/ui_desktop/detail_table.py").read_text(encoding="utf-8")
        detail_panel = Path("aaaat/ui_desktop/detail_panel.py").read_text(encoding="utf-8")

        self.assertIn("self.detailed_panel.Freeze()", detailed_view)
        self.assertIn("self.detailed_panel.Thaw()", detailed_view)
        self.assertIn("self.Freeze()", detail_table)
        self.assertIn("self.Thaw()", detail_table)
        self.assertIn("self.Freeze()", detail_panel)
        self.assertIn("self.Thaw()", detail_panel)
        self.assertIn("_rendering = True", detail_table)
        self.assertIn("if self._rendering", detail_table)

    def test_shell_and_runtime_boundaries_stay_clear(self):
        main_window = Path("aaaat/ui_desktop/main_window.py").read_text(encoding="utf-8")
        projection = Path("aaaat/dashboard_projection.py").read_text(encoding="utf-8")

        self.assertNotIn("EVT_MOUSEWHEEL", main_window)
        self.assertNotIn("bind_parent_wheel_scroll", main_window)
        self.assertNotIn("Freeze()", main_window)
        self.assertNotIn("import wx", projection)
        self.assertFalse(Path("aaaat/ui_desktop/card_state_patch.py").exists())


if __name__ == "__main__":
    unittest.main()
