from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.security import can_write

from .candidature_right_panel import CandidatureDetailBodyPanel, CandidatureOptionsPanel
from .detail_columns import available_column_ids, column_title, normalize_visible_columns
from .detail_table import DetailTable

DEFAULT_DETAILED_FRAME_WIDTH = 1280
DEFAULT_DETAILED_LEFT = 330
DEFAULT_DETAILED_RIGHT = 300


class DetailedViewMixin:
    """Detailed View: candidature list/table, central field body, right options rail."""

    def _build_detailed_surface(self) -> None:
        self.detailed_panel = wx.Panel(self.view_book)
        sizer = wx.BoxSizer(wx.VERTICAL)
        self.detailed_panel.SetSizer(sizer)

        toolbar = wx.BoxSizer(wx.HORIZONTAL)
        label = wx.StaticText(self.detailed_panel, label="Detailed View")
        label.SetFont(label.GetFont().Bold().Larger())
        self.detailed_search = wx.SearchCtrl(self.detailed_panel, style=wx.TE_PROCESS_ENTER)
        self.detailed_search.ShowSearchButton(True)
        self.detailed_search.ShowCancelButton(True)
        self.detailed_columns_button = wx.Button(self.detailed_panel, label="Columns…", size=(92, -1))
        toolbar.Add(label, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        toolbar.Add(self.detailed_search, 1, wx.ALL | wx.EXPAND, 6)
        toolbar.Add(self.detailed_columns_button, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        sizer.Add(toolbar, 0, wx.EXPAND)

        self.detailed_splitter = wx.SplitterWindow(self.detailed_panel, style=wx.SP_LIVE_UPDATE)
        self.detailed_splitter.SetMinimumPaneSize(260)
        self.detail_table = DetailTable(self.detailed_splitter, on_select=self._select_detailed_ref)
        self.detailed_body_splitter = wx.SplitterWindow(self.detailed_splitter, style=wx.SP_LIVE_UPDATE)
        self.detailed_body_splitter.SetMinimumPaneSize(280)
        self.detail_body_panel = CandidatureDetailBodyPanel(
            self.detailed_body_splitter,
            on_save=self._save_candidature_panel_edits,
            on_action=self._on_candidature_panel_action,
            on_keyword_select=self._select_detailed_keyword,
        )
        self.detail_options_panel = CandidatureOptionsPanel(
            self.detailed_body_splitter,
            on_action=self._on_candidature_panel_action,
            on_delete=self._delete_candidature_from_panel,
            on_open_smart=self._open_selected_in_smart,
            on_keyword_select=self._select_detailed_keyword,
        )

        saved_left = int(self.layout_state.pane_layout.get("detailed", {}).get("left", DEFAULT_DETAILED_LEFT))
        saved_right = int(self.layout_state.pane_layout.get("detailed", {}).get("right", DEFAULT_DETAILED_RIGHT))
        left_width = max(260, min(saved_left, 430))
        center_width = max(560, DEFAULT_DETAILED_FRAME_WIDTH - left_width - max(260, min(saved_right, 380)))
        self.detailed_splitter.SplitVertically(self.detail_table, self.detailed_body_splitter, left_width)
        self.detailed_body_splitter.SplitVertically(self.detail_body_panel, self.detail_options_panel, center_width)
        sizer.Add(self.detailed_splitter, 1, wx.EXPAND)
        self.view_book.AddPage(self.detailed_panel, "Detailed")

    def _bind_detailed_events(self) -> None:
        self.detailed_search.Bind(wx.EVT_SEARCHCTRL_SEARCH_BTN, self._on_detailed_search)
        self.detailed_search.Bind(wx.EVT_TEXT_ENTER, self._on_detailed_search)
        self.detailed_search.Bind(wx.EVT_SEARCHCTRL_CANCEL_BTN, self._on_clear_detailed_search)
        self.detailed_columns_button.Bind(wx.EVT_BUTTON, self._on_choose_detailed_columns)

    def _show_detailed(self) -> None:
        self.current_view = "detailed"
        self.layout_state.selected_view = "detailed"
        self._sync_view_tab()

    def _go_detailed(self) -> None:
        self._show_detailed()
        self._refresh_current_if_needed()

    def _refresh_detailed_view(self) -> None:
        self.detailed_panel.Freeze()
        try:
            detailed = self.projection.get("detailed") or {}
            if self.detailed_search.GetValue() != self.search_query:
                self.detailed_search.SetValue(self.search_query)
            visible_columns = self._visible_detailed_columns(detailed)
            self.detail_table.render(detailed, selected_ref=self.selected_ref, visible_columns=visible_columns)
            self.detail_body_panel.render(self.projection, can_edit=can_write(self.mode))
            self.detail_options_panel.render(self.projection, can_edit=can_write(self.mode), view_name="detailed")
            self.detailed_panel.Layout()
        finally:
            self.detailed_panel.Thaw()

    def _visible_detailed_columns(self, detailed: dict[str, Any]) -> list[str]:
        available_columns = [column for column in detailed.get("available_columns") or [] if isinstance(column, dict)]
        configured = self.layout_state.detailed_columns.get("visible") or detailed.get("visible_columns") or []
        return normalize_visible_columns(available_columns, configured)

    def _on_choose_detailed_columns(self, _event: wx.CommandEvent) -> None:
        detailed = self.projection.get("detailed") or {}
        available_columns = [column for column in detailed.get("available_columns") or [] if isinstance(column, dict)]
        ids = available_column_ids(available_columns)
        if not ids:
            return
        current = set(self._visible_detailed_columns(detailed))
        choices = [column_title(available_columns, column_id) for column_id in ids]
        dialog = wx.MultiChoiceDialog(self.detailed_panel, "Choose visible Detailed View columns", "Detailed View columns", choices)
        try:
            dialog.SetSelections([index for index, column_id in enumerate(ids) if column_id in current])
            if dialog.ShowModal() != wx.ID_OK:
                return
            selected = [ids[index] for index in dialog.GetSelections()]
        finally:
            dialog.Destroy()
        if not selected:
            return
        self.layout_state.detailed_columns["visible"] = selected
        self.layout_state.detailed_columns["order"] = selected
        self.layout_state.save(self.layout_path)
        self._rendered_view_keys.pop("detailed", None)
        self._reload_projection()
        self._refresh_detailed_view()
        self._mark_current_view_rendered()

    def _select_detailed_ref(self, ref: str) -> None:
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self._reload_projection()
        self._refresh_detailed_view()
        self._mark_current_view_rendered()

    def _select_detailed_keyword(self, term: str) -> None:
        self.selected_keyword = term
        self.layout_state.selected_keyword = term
        self._reload_projection()
        self.detail_options_panel.render(self.projection, can_edit=can_write(self.mode), view_name="detailed")
        self.SetStatusText(f"Keyword: {term}")
        self._mark_current_view_rendered()

    def _open_selected_in_smart(self) -> None:
        if not self.selected_ref:
            return
        self.current_view = "smart"
        self.layout_state.selected_view = "smart"
        self._show_focus()
        self._refresh_current_if_needed()

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
