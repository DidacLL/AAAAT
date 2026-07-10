from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

from .detail_panel import DetailPanel
from .detail_table import DetailTable

DEFAULT_DETAILED_RIGHT = 340


class DetailedViewMixin:
    """Detailed View foundation for batch candidature review."""

    def _build_detailed_surface(self) -> None:
        self.detailed_panel = wx.Panel(self.root)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.detailed_panel.SetSizer(sizer)

        toolbar = wx.BoxSizer(wx.HORIZONTAL)
        label = wx.StaticText(self.detailed_panel, label="Detailed View")
        label.SetFont(label.GetFont().Bold().Larger())
        self.detailed_search = wx.SearchCtrl(self.detailed_panel, style=wx.TE_PROCESS_ENTER)
        self.detailed_search.ShowSearchButton(True)
        self.detailed_search.ShowCancelButton(True)
        toolbar.Add(label, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        toolbar.Add(self.detailed_search, 1, wx.ALL | wx.EXPAND, 6)
        sizer.Add(toolbar, 0, wx.EXPAND)

        self.detailed_splitter = wx.SplitterWindow(self.detailed_panel, style=wx.SP_LIVE_UPDATE)
        self.detailed_splitter.SetMinimumPaneSize(220)
        self.detail_table = DetailTable(self.detailed_splitter, on_select=self._select_detailed_ref)
        self.detail_panel = DetailPanel(self.detailed_splitter, on_open_smart=self._open_selected_in_smart)
        width = max(620, DEFAULT_WINDOW_SIZE[0] - int(self.layout_state.pane_layout.get("detailed", {}).get("right", DEFAULT_DETAILED_RIGHT)))
        self.detailed_splitter.SplitVertically(self.detail_table, self.detail_panel, width)
        sizer.Add(self.detailed_splitter, 1, wx.EXPAND)
        self.root_sizer.Add(self.detailed_panel, 1, wx.ALL | wx.EXPAND, 6)

    def _bind_detailed_events(self) -> None:
        self.detailed_search.Bind(wx.EVT_SEARCHCTRL_SEARCH_BTN, self._on_detailed_search)
        self.detailed_search.Bind(wx.EVT_TEXT_ENTER, self._on_detailed_search)
        self.detailed_search.Bind(wx.EVT_SEARCHCTRL_CANCEL_BTN, self._on_clear_detailed_search)

    def _show_detailed(self) -> None:
        self.current_view = "detailed"
        self.layout_state.selected_view = "detailed"
        self.overview_panel.Hide()
        self.focus_panel.Hide()
        self.detailed_panel.Show()
        self.root_sizer.Layout()
        self.Layout()

    def _go_detailed(self) -> None:
        self._show_detailed()
        self._refresh_all()

    def _refresh_detailed_view(self) -> None:
        detailed = self.projection.get("detailed") or {}
        if self.detailed_search.GetValue() != self.search_query:
            self.detailed_search.SetValue(self.search_query)
        self.detail_table.render(detailed, selected_ref=self.selected_ref)
        self.detail_panel.render(detailed)
        self.detailed_panel.Layout()

    def _select_detailed_ref(self, ref: str) -> None:
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self._reload_projection()
        self._refresh_detailed_view()

    def _open_selected_in_smart(self) -> None:
        if not self.selected_ref:
            return
        self.current_view = "smart"
        self.layout_state.selected_view = "smart"
        self._show_focus()
        self._refresh_all()

    def _on_detailed_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.detailed_search.GetValue()
        self._refresh_all()

    def _on_clear_detailed_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = ""
        self.detailed_search.SetValue("")
        self._refresh_all()

    def _detailed_selected_row(self) -> dict[str, Any] | None:
        row = (self.projection.get("detailed") or {}).get("selected_row")
        return row if isinstance(row, dict) else None
