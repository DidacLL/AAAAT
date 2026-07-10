from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.security import can_write

from .detail_columns import available_column_ids, column_title, normalize_visible_columns
from .detail_panel import DetailPanel
from .detail_table import DetailTable

DEFAULT_DETAILED_FRAME_WIDTH = 1280
DEFAULT_DETAILED_RIGHT = 340


class DetailedViewMixin:
    """Detailed View foundation for batch candidature review."""

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
        self.detailed_splitter.SetMinimumPaneSize(220)
        self.detail_table = DetailTable(self.detailed_splitter, on_select=self._select_detailed_ref)
        self.detail_panel = DetailPanel(
            self.detailed_splitter,
            on_save=self._save_detail_edits,
            on_delete=self._delete_selected_candidature,
            on_cancel=self._cancel_detail_edits,
            on_open_smart=self._open_selected_in_smart,
        )
        width = max(620, DEFAULT_DETAILED_FRAME_WIDTH - int(self.layout_state.pane_layout.get("detailed", {}).get("right", DEFAULT_DETAILED_RIGHT)))
        self.detailed_splitter.SplitVertically(self.detail_table, self.detail_panel, width)
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
            self.detail_panel.render(self.projection, can_edit=can_write(self.mode))
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

    def _save_detail_edits(self, ref: str, changes: dict[str, str]) -> None:
        if not can_write(self.mode) or not ref:
            return
        self.command_service.update_candidature_fields(ref, changes)
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._refresh_detailed_view()
        self._mark_current_view_rendered()

    def _delete_selected_candidature(self, ref: str) -> None:
        if not can_write(self.mode) or not ref:
            return
        row = self._detailed_selected_row() or {}
        label = " ".join(part for part in (str(row.get("company") or ""), str(row.get("role") or "")) if part).strip() or ref
        confirmed = wx.MessageBox(
            f"Delete candidature '{label}'?\n\nThis removes the local candidature record and its local intake/notes/artifact rows.",
            "Delete candidature",
            wx.YES_NO | wx.NO_DEFAULT | wx.ICON_WARNING,
            self.detailed_panel,
        )
        if confirmed != wx.YES:
            return
        if not self.command_service.delete_candidature(ref):
            return
        self.selected_ref = None
        self.layout_state.selected_candidature_ref = None
        self._rendered_view_keys.clear()
        self._reload_projection()
        rows = (self.projection.get("detailed") or {}).get("rows") or []
        if rows:
            self.selected_ref = str(rows[0].get("ref") or "") or None
            self.layout_state.selected_candidature_ref = self.selected_ref
            self._reload_projection()
        self._refresh_detailed_view()
        self._mark_current_view_rendered()

    def _cancel_detail_edits(self) -> None:
        self._refresh_detailed_view()
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
