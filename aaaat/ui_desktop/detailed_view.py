from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

from .candidature_sidebar import CandidatureSidebar
from .detail_columns import available_column_ids, column_title, normalize_visible_columns
from .detail_panel import DetailPanel
from .detail_table import DetailTable

DEFAULT_DETAILED_LIST = 360
DEFAULT_DETAILED_SIDEBAR = 340


class DetailedViewMixin:
    """Detailed candidature workspace: list, dense record, shared context sidebar."""

    def _build_detailed_surface(self) -> None:
        self.detailed_panel = wx.Panel(self.view_book)
        root = wx.BoxSizer(wx.VERTICAL)
        self.detailed_panel.SetSizer(root)

        toolbar = wx.BoxSizer(wx.HORIZONTAL)
        self.detailed_search = wx.SearchCtrl(self.detailed_panel, style=wx.TE_PROCESS_ENTER)
        self.detailed_search.ShowSearchButton(True)
        self.detailed_search.ShowCancelButton(True)
        self.detailed_columns_button = wx.Button(self.detailed_panel, label="Columns…")
        toolbar.Add(self.detailed_search, 1, wx.ALL | wx.EXPAND, 4)
        toolbar.Add(self.detailed_columns_button, 0, wx.ALL, 4)
        root.Add(toolbar, 0, wx.EXPAND)

        self.detailed_splitter = wx.SplitterWindow(self.detailed_panel, style=wx.SP_LIVE_UPDATE)
        self.detailed_splitter.SetMinimumPaneSize(260)
        self.detail_table = DetailTable(self.detailed_splitter, on_select=self._select_detailed_ref)
        self.detailed_content_splitter = wx.SplitterWindow(self.detailed_splitter, style=wx.SP_LIVE_UPDATE)
        self.detailed_content_splitter.SetMinimumPaneSize(280)
        self.detail_panel = DetailPanel(
            self.detailed_content_splitter,
            on_save=self._save_detail_edits,
            on_delete=self._delete_selected_candidature,
            on_cancel=self._cancel_detail_edits,
            on_open_smart=self._open_selected_in_smart,
        )
        self.detailed_sidebar = CandidatureSidebar(
            self.detailed_content_splitter,
            on_run_action=self._run_candidature_action,
            on_apply_task=self._apply_task,
            on_reject_task=self._reject_task,
            on_open_artifact=self._open_artifact,
            on_register_artifact=self._register_artifact,
        )
        self.detailed_content_splitter.SplitVertically(self.detail_panel, self.detailed_sidebar, -DEFAULT_DETAILED_SIDEBAR)
        self.detailed_content_splitter.SetSashGravity(1.0)
        self.detailed_splitter.SplitVertically(self.detail_table, self.detailed_content_splitter, DEFAULT_DETAILED_LIST)
        self.detailed_splitter.SetSashGravity(0.0)
        root.Add(self.detailed_splitter, 1, wx.EXPAND)
        self.view_book.AddPage(self.detailed_panel, "Detailed")
        self.detailed_panel.Bind(wx.EVT_SIZE, self._on_detailed_size)

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
        detailed = self.projection.get("detailed") or {}
        self.detailed_panel.Freeze()
        try:
            if self.detailed_search.GetValue() != self.search_query:
                self.detailed_search.SetValue(self.search_query)
            visible_columns = self._visible_detailed_columns(detailed)
            self.detail_table.render(detailed, selected_ref=self.selected_ref, visible_columns=visible_columns)
            self.detail_panel.render(self.projection)
            self._refresh_sidebars()
            self._apply_detailed_layout()
            self.detailed_panel.Layout()
        finally:
            self.detailed_panel.Thaw()

    def _on_detailed_size(self, event: wx.SizeEvent) -> None:
        wx.CallAfter(self._apply_detailed_layout)
        event.Skip()

    def _apply_detailed_layout(self) -> None:
        width = int(self.detailed_panel.GetClientSize().GetWidth())
        if width <= 0:
            return
        list_width = max(300, min(420, round(width * 0.24)))
        sidebar_width = max(280, min(380, round(width * 0.23)))
        center_width = width - list_width - sidebar_width
        if center_width < 520:
            sidebar_width = max(240, sidebar_width - (520 - center_width))
            center_width = width - list_width - sidebar_width
        if self.detailed_splitter.IsSplit():
            self.detailed_splitter.SetSashPosition(list_width)
        if self.detailed_content_splitter.IsSplit():
            self.detailed_content_splitter.SetSashPosition(max(460, center_width))

    def _visible_detailed_columns(self, detailed: dict[str, Any]) -> list[str]:
        available = [column for column in detailed.get("available_columns") or [] if isinstance(column, dict)]
        configured = self.layout_state.detailed_columns.get("visible") or detailed.get("visible_columns") or []
        return normalize_visible_columns(available, configured)

    def _on_choose_detailed_columns(self, _event: wx.CommandEvent) -> None:
        detailed = self.projection.get("detailed") or {}
        available = [column for column in detailed.get("available_columns") or [] if isinstance(column, dict)]
        ids = available_column_ids(available)
        if not ids:
            return
        current = set(self._visible_detailed_columns(detailed))
        dialog = wx.MultiChoiceDialog(
            self.detailed_panel,
            "Choose visible columns",
            "Detailed View columns",
            [column_title(available, column_id) for column_id in ids],
        )
        try:
            dialog.SetSelections([index for index, column_id in enumerate(ids) if column_id in current])
            if dialog.ShowModal() != wx.ID_OK:
                return
            selected = [ids[index] for index in dialog.GetSelections()]
        finally:
            dialog.Destroy()
        self.layout_state.detailed_columns["visible"] = selected
        self._rendered_view_keys.pop("detailed", None)
        self._refresh_detailed_view()
        self._mark_current_view_rendered()

    def _select_detailed_ref(self, ref: str) -> None:
        if not ref or not self._confirm_pending_edits():
            return
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._refresh_detailed_view()
        self._mark_current_view_rendered()

    def _save_detail_edits(self, ref: str, changes: dict[str, str]) -> None:
        if not ref:
            return
        self.command_service.update_candidature_fields(ref, changes)
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._refresh_detailed_view()
        self._mark_current_view_rendered()

    def _delete_selected_candidature(self, ref: str) -> None:
        if not ref:
            return
        row = self._detailed_selected_row() or {}
        label = " ".join(part for part in (str(row.get("company") or ""), str(row.get("role") or "")) if part).strip() or "this candidature"
        confirmed = wx.MessageBox(
            f"Delete {label}?\n\nThis removes its local candidature data and related local records.",
            "Delete candidature",
            wx.YES_NO | wx.NO_DEFAULT | wx.ICON_WARNING,
            self.detailed_panel,
        )
        if confirmed != wx.YES:
            return
        self.command_service.delete_candidature(ref)
        self.selected_ref = None
        self.layout_state.selected_candidature_ref = None
        self._rendered_view_keys.clear()
        self._reload_projection()
        self._refresh_detailed_view()

    def _cancel_detail_edits(self) -> None:
        self._refresh_detailed_view()

    def _open_selected_in_smart(self) -> None:
        if not self.selected_ref or not self._confirm_pending_edits():
            return
        self._show_focus()
        self._rendered_view_keys.pop("smart", None)
        self._refresh_current_if_needed()

    def _on_detailed_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = self.detailed_search.GetValue()
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _on_clear_detailed_search(self, _event: wx.CommandEvent) -> None:
        self.search_query = ""
        self.detailed_search.SetValue("")
        self._rendered_view_keys.clear()
        self._refresh_all()

    def _detailed_selected_row(self) -> dict[str, Any] | None:
        row = self.projection.get("detailed", {}).get("selected_row")
        return row if isinstance(row, dict) and str(row.get("ref")) == str(self.selected_ref) else None
