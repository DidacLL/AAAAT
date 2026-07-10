from __future__ import annotations

from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.security import Mode

from .card_state import CenterCardState
from .services import DesktopCommandService
from .smart_view import DEFAULT_CENTER_NOTES_HEIGHT, DEFAULT_FOCUS_LEFT, DEFAULT_FOCUS_RIGHT, DEFAULT_WINDOW_SIZE, SmartViewMixin

RIGHT_MODULES = ["keywords", "artifacts"]


class DesktopDashboardFrame(SmartViewMixin, wx.Frame):
    """Top-level wx desktop frame for the approved Smart View."""

    def __init__(
        self,
        *,
        storage_path: str,
        mode: Mode,
        projection: dict[str, Any],
        layout_state: DashboardLayoutState,
        layout_path: str | Path,
        command_service: DesktopCommandService | None = None,
    ) -> None:
        super().__init__(None, title="AAAAT — Smart View", size=DEFAULT_WINDOW_SIZE)
        self.storage_path = storage_path
        self.mode = Mode(mode)
        self.projection = projection
        self.layout_state = layout_state
        self.layout_path = Path(layout_path)
        self.command_service = command_service or DesktopCommandService(storage_path)
        self.selected_ref = layout_state.selected_candidature_ref
        self.selected_keyword = layout_state.selected_keyword
        self.search_query = ""
        self.expanded_overview_ref: str | None = None
        self.center_card_state = CenterCardState.default()
        self._focus_layout_applied = False
        self.focus_left_width = int(layout_state.pane_layout.get("smart", {}).get("left", DEFAULT_FOCUS_LEFT))
        saved_right = int(layout_state.pane_layout.get("smart", {}).get("right", DEFAULT_FOCUS_RIGHT))
        self.focus_right_width = min(saved_right, 240)
        self._list_refs: list[str] = []
        self._overview_card_refs: list[str] = []

        self._init_smart_view_helpers()
        self._build_menu()
        self._build_shell()
        self._bind_shell_events()
        self._show_overview() if not self.selected_ref else self._show_focus()
        self._refresh_all()

    def _build_menu(self) -> None:
        menu_bar = wx.MenuBar()
        file_menu = wx.Menu()
        self.new_candidature_item = file_menu.Append(wx.ID_NEW, "New…")
        self.profile_item = file_menu.Append(wx.ID_ANY, "Profile…")
        file_menu.AppendSeparator()
        self.reset_layout_item = file_menu.Append(wx.ID_ANY, "Reset layout")
        file_menu.AppendSeparator()
        file_menu.Append(wx.ID_EXIT, "Close")
        menu_bar.Append(file_menu, "File")
        self.SetMenuBar(menu_bar)

    def _build_shell(self) -> None:
        self.root = wx.Panel(self)
        self.root_sizer = wx.BoxSizer(wx.VERTICAL)
        self.root.SetSizer(self.root_sizer)
        self._build_toolbar()
        self._build_overview_surface()
        self._build_focus_surface()

    def _build_toolbar(self) -> None:
        self.toolbar = wx.Panel(self.root)
        toolbar_sizer = wx.BoxSizer(wx.HORIZONTAL)
        self.toolbar.SetSizer(toolbar_sizer)
        self.title = wx.StaticText(self.toolbar, label="AAAAT")
        self.title.SetFont(self.title.GetFont().Bold().Larger())
        self.mode_chip = wx.StaticText(self.toolbar, label="read-only" if self.mode == Mode.READ_ONLY else "local")
        self.overview_button = wx.Button(self.toolbar, label="List", size=(62, -1))
        self.reset_button = wx.Button(self.toolbar, label="Reset", size=(68, -1))
        self.new_button = wx.Button(self.toolbar, label="+", size=(40, -1))
        self.profile_button = wx.Button(self.toolbar, label="Me", size=(48, -1))
        toolbar_sizer.Add(self.title, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        toolbar_sizer.AddStretchSpacer(1)
        for control in (self.mode_chip, self.overview_button, self.reset_button, self.new_button, self.profile_button):
            toolbar_sizer.Add(control, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
        self.root_sizer.Add(self.toolbar, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 4)

    def _build_overview_surface(self) -> None:
        self.overview_panel = wx.Panel(self.root)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.overview_panel.SetSizer(sizer)
        self.overview_search = wx.SearchCtrl(self.overview_panel, style=wx.TE_PROCESS_ENTER)
        self.overview_search.ShowSearchButton(True)
        self.overview_search.ShowCancelButton(True)
        sizer.Add(self.overview_search, 0, wx.BOTTOM | wx.EXPAND, 8)
        self.overview_scroll = wx.ScrolledWindow(self.overview_panel)
        self.overview_scroll.SetScrollRate(12, 12)
        self.overview_cards_sizer = wx.WrapSizer(wx.HORIZONTAL)
        self.overview_scroll.SetSizer(self.overview_cards_sizer)
        sizer.Add(self.overview_scroll, 1, wx.EXPAND)
        self.root_sizer.Add(self.overview_panel, 1, wx.ALL | wx.EXPAND, 6)

    def _build_focus_surface(self) -> None:
        self.focus_panel = wx.Panel(self.root)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.focus_panel.SetSizer(sizer)
        self.focus_splitter = wx.SplitterWindow(self.focus_panel, style=wx.SP_LIVE_UPDATE)
        self.focus_splitter.SetMinimumPaneSize(150)
        self.nav_panel = wx.Panel(self.focus_splitter)
        self.content_splitter = wx.SplitterWindow(self.focus_splitter, style=wx.SP_LIVE_UPDATE)
        self.content_splitter.SetMinimumPaneSize(160)
        self.center_panel = wx.Panel(self.content_splitter)
        self.right_scroll = wx.ScrolledWindow(self.content_splitter)
        self.right_scroll.SetScrollRate(8, 12)
        self.focus_splitter.SplitVertically(self.nav_panel, self.content_splitter, self.focus_left_width)
        initial_center_width = DEFAULT_WINDOW_SIZE[0] - self.focus_left_width - self.focus_right_width
        self.content_splitter.SplitVertically(self.center_panel, self.right_scroll, max(640, initial_center_width))
        sizer.Add(self.focus_splitter, 1, wx.EXPAND)
        self.root_sizer.Add(self.focus_panel, 1, wx.ALL | wx.EXPAND, 6)

        self._build_nav_panel()
        self._build_center_panel()
        self.right_sizer = wx.BoxSizer(wx.VERTICAL)
        self.right_scroll.SetSizer(self.right_sizer)

    def _build_nav_panel(self) -> None:
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.nav_panel.SetSizer(sizer)
        self.nav_search = wx.SearchCtrl(self.nav_panel, style=wx.TE_PROCESS_ENTER)
        self.nav_search.ShowSearchButton(True)
        self.nav_search.ShowCancelButton(True)
        self.nav_list = wx.ListBox(self.nav_panel)
        self.expand_list_button = wx.Button(self.nav_panel, label="Expand")
        sizer.Add(self.nav_search, 0, wx.ALL | wx.EXPAND, 4)
        sizer.Add(self.nav_list, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)
        sizer.Add(self.expand_list_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)

    def _build_center_panel(self) -> None:
        panel_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_panel.SetSizer(panel_sizer)
        self.center_splitter = wx.SplitterWindow(self.center_panel, style=wx.SP_LIVE_UPDATE)
        self.center_splitter.SetMinimumPaneSize(110)
        self.center_body_scroll = wx.ScrolledWindow(self.center_splitter)
        self.center_body_scroll.SetScrollRate(8, 12)
        self.center_notes_panel = wx.Panel(self.center_splitter, style=wx.BORDER_SIMPLE)
        self.center_splitter.SplitHorizontally(
            self.center_body_scroll,
            self.center_notes_panel,
            DEFAULT_WINDOW_SIZE[1] - DEFAULT_CENTER_NOTES_HEIGHT - 90,
        )
        self.center_splitter.SetSashGravity(0.78)
        panel_sizer.Add(self.center_splitter, 1, wx.EXPAND)

        self.center_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_body_scroll.SetSizer(self.center_sizer)
        self.center_notes_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_notes_panel.SetSizer(self.center_notes_sizer)
        self.center_scroll = self.center_body_scroll
