from __future__ import annotations

from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.security import Mode

from .card_state import CenterCardState
from .candidature_right_panel import CandidatureOptionsPanel
from .detailed_view import DetailedViewMixin
from .services import DesktopCommandService
from .smart_view import DEFAULT_CENTER_NOTES_HEIGHT, DEFAULT_FOCUS_LEFT, DEFAULT_FOCUS_RIGHT, DEFAULT_WINDOW_SIZE, SmartViewMixin
from .user_view import UserViewMixin


class DesktopDashboardFrame(UserViewMixin, DetailedViewMixin, SmartViewMixin, wx.Frame):
    """Top-level wx desktop frame for Smart, Detailed, and User desktop views."""

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
        super().__init__(None, title="AAAAT — Desktop", size=DEFAULT_WINDOW_SIZE)
        self.CreateStatusBar()
        self.SetStatusText("Ready")
        self.storage_path = storage_path
        self.mode = Mode(mode)
        self.projection = projection
        self.layout_state = layout_state
        self.layout_path = Path(layout_path)
        self.command_service = command_service or DesktopCommandService(storage_path)
        self.current_view = str(projection.get("view_state", {}).get("current_view") or layout_state.selected_view or "smart")
        if self.current_view not in {"smart", "detailed", "user"}:
            self.current_view = "smart"
        self.selected_ref = layout_state.selected_candidature_ref
        self.selected_keyword = layout_state.selected_keyword
        self.search_query = str(projection.get("view_state", {}).get("search_query") or "")
        self.expanded_overview_ref: str | None = None
        self.center_card_state = CenterCardState.default()
        self._focus_layout_applied = False
        self.focus_left_width = int(layout_state.pane_layout.get("smart", {}).get("left", DEFAULT_FOCUS_LEFT))
        self.focus_right_width = int(layout_state.pane_layout.get("smart", {}).get("right", DEFAULT_FOCUS_RIGHT))
        self._list_refs: list[str] = []
        self._overview_card_refs: list[str] = []
        self._rendered_view_keys: dict[str, tuple[Any, ...]] = {}

        self.Freeze()
        try:
            self._init_smart_view_helpers()
            self._build_menu()
            self._build_shell()
            self._bind_shell_events()
            self._show_initial_view()
            self._refresh_all()
        finally:
            self.Thaw()

    def _show_initial_view(self) -> None:
        if self.current_view == "user":
            self._show_user()
        elif self.current_view == "detailed":
            self._show_detailed()
        elif self.selected_ref:
            self._show_focus()
        else:
            self._show_overview()

    def _build_menu(self) -> None:
        menu_bar = wx.MenuBar()
        file_menu = wx.Menu()
        self.new_candidature_item = file_menu.Append(wx.ID_NEW, "New…")
        self.profile_item = file_menu.Append(wx.ID_ANY, "User/Profile")
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
        self._build_view_book()
        self._build_overview_surface()
        self._build_focus_surface()
        self._build_detailed_surface()
        self._build_user_surface()

    def _build_toolbar(self) -> None:
        self.toolbar = wx.Panel(self.root)
        toolbar_sizer = wx.BoxSizer(wx.HORIZONTAL)
        self.toolbar.SetSizer(toolbar_sizer)
        self.title = wx.StaticText(self.toolbar, label="AAAAT")
        self.title.SetFont(self.title.GetFont().Bold().Larger())
        self.mode_chip = wx.StaticText(self.toolbar, label="read-only" if self.mode == Mode.READ_ONLY else "local")
        self.reset_button = wx.Button(self.toolbar, label="Reset")
        self.new_button = wx.Button(self.toolbar, label="+")
        toolbar_sizer.Add(self.title, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        toolbar_sizer.AddStretchSpacer(1)
        for control in (self.mode_chip, self.reset_button, self.new_button):
            toolbar_sizer.Add(control, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)
        self.root_sizer.Add(self.toolbar, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 4)

    def _build_view_book(self) -> None:
        self.view_book = wx.Notebook(self.root, style=wx.NB_TOP)
        self.smart_panel = wx.Panel(self.view_book)
        self.smart_sizer = wx.BoxSizer(wx.VERTICAL)
        self.smart_panel.SetSizer(self.smart_sizer)
        self.view_book.AddPage(self.smart_panel, "List")
        self.root_sizer.Add(self.view_book, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)

    def _build_overview_surface(self) -> None:
        self.overview_panel = wx.Panel(self.smart_panel)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.overview_panel.SetSizer(sizer)
        self.overview_search = wx.SearchCtrl(self.overview_panel, style=wx.TE_PROCESS_ENTER)
        self.overview_search.ShowSearchButton(True)
        self.overview_search.ShowCancelButton(True)
        sizer.Add(self.overview_search, 0, wx.BOTTOM | wx.EXPAND, 8)
        self.overview_scroll = wx.ScrolledWindow(self.overview_panel, style=wx.VSCROLL)
        self.overview_scroll.SetScrollRate(0, 12)
        self.overview_cards_sizer = wx.WrapSizer(wx.HORIZONTAL)
        self.overview_scroll.SetSizer(self.overview_cards_sizer)
        sizer.Add(self.overview_scroll, 1, wx.EXPAND)
        self.smart_sizer.Add(self.overview_panel, 1, wx.ALL | wx.EXPAND, 6)

    def _build_focus_surface(self) -> None:
        self.focus_panel = wx.Panel(self.smart_panel)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.focus_panel.SetSizer(sizer)
        self.focus_splitter = wx.SplitterWindow(self.focus_panel, style=wx.SP_LIVE_UPDATE)
        self.focus_splitter.SetMinimumPaneSize(1)
        self.nav_panel = wx.Panel(self.focus_splitter)
        self.content_splitter = wx.SplitterWindow(self.focus_splitter, style=wx.SP_LIVE_UPDATE)
        self.content_splitter.SetMinimumPaneSize(1)
        self.center_panel = wx.Panel(self.content_splitter)
        self.smart_right_panel = CandidatureOptionsPanel(
            self.content_splitter,
            on_action=self._on_candidature_panel_action,
            on_delete=self._delete_candidature_from_panel,
            on_open_smart=lambda: None,
            on_keyword_select=lambda term: self._select_keyword(term, refresh_center=False),
        )
        initial_width = max(1, int(self.GetClientSize().GetWidth() or DEFAULT_WINDOW_SIZE[0]))
        initial_left = max(1, int(initial_width * 0.18))
        initial_center = max(1, int(initial_width * 0.64))
        self.focus_splitter.SplitVertically(self.nav_panel, self.content_splitter, initial_left)
        self.content_splitter.SplitVertically(self.center_panel, self.smart_right_panel, initial_center)
        sizer.Add(self.focus_splitter, 1, wx.EXPAND)
        self.smart_sizer.Add(self.focus_panel, 1, wx.ALL | wx.EXPAND, 6)

        self._build_nav_panel()
        self._build_center_panel()

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
        self.center_splitter.SetMinimumPaneSize(1)
        self.center_body_scroll = wx.ScrolledWindow(self.center_splitter, style=wx.VSCROLL)
        self.center_body_scroll.SetScrollRate(0, 12)
        self.center_notes_panel = wx.Panel(self.center_splitter, style=wx.BORDER_SIMPLE)
        self.center_splitter.SplitHorizontally(
            self.center_body_scroll,
            self.center_notes_panel,
            int(DEFAULT_WINDOW_SIZE[1] * 0.76),
        )
        self.center_splitter.SetSashGravity(0.78)
        panel_sizer.Add(self.center_splitter, 1, wx.EXPAND)

        self.center_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_body_scroll.SetSizer(self.center_sizer)
        self.center_notes_sizer = wx.BoxSizer(wx.VERTICAL)
        self.center_notes_panel.SetSizer(self.center_notes_sizer)
        self.center_scroll = self.center_body_scroll

    def _on_close(self, event: wx.CloseEvent) -> None:
        self.layout_state.selected_view = self.current_view
        self.layout_state.selected_candidature_ref = self.selected_ref
        self.layout_state.selected_keyword = self.selected_keyword
        self.layout_state.search_query = self.search_query
        if self.focus_splitter.IsSplit():
            self.layout_state.pane_layout.setdefault("smart", {})["left"] = self.focus_splitter.GetSashPosition()
        if self.content_splitter.IsSplit():
            total = max(1, self.content_splitter.GetClientSize().GetWidth())
            self.layout_state.pane_layout.setdefault("smart", {})["right"] = max(1, total - self.content_splitter.GetSashPosition())
        if hasattr(self, "detailed_splitter") and self.detailed_splitter.IsSplit():
            self.layout_state.pane_layout.setdefault("detailed", {})["left"] = max(1, self.detailed_splitter.GetSashPosition())
        if hasattr(self, "detailed_body_splitter") and self.detailed_body_splitter.IsSplit():
            total = max(1, self.detailed_body_splitter.GetClientSize().GetWidth())
            self.layout_state.pane_layout.setdefault("detailed", {})["right"] = max(1, total - self.detailed_body_splitter.GetSashPosition())
        self.layout_state.save(self.layout_path)
        event.Skip()
