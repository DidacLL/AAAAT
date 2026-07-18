from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .detail_columns import column_title, normalize_visible_columns


class DetailTable(wx.Panel):
    """Projected candidature rows for the desktop Detailed View."""

    def __init__(self, parent: wx.Window, *, on_select: Callable[[str], None]) -> None:
        super().__init__(parent)
        self.on_select = on_select
        self._refs: list[str] = []
        self._visible_columns: list[str] = []
        self._rendering = False

        sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(sizer)
        self.table = wx.ListCtrl(self, style=wx.LC_REPORT | wx.LC_SINGLE_SEL | wx.BORDER_SIMPLE)
        self.table.Bind(wx.EVT_LIST_ITEM_SELECTED, self._on_selected)
        sizer.Add(self.table, 1, wx.EXPAND)

    @property
    def selected_ref(self) -> str | None:
        index = self.table.GetFirstSelected()
        if 0 <= index < len(self._refs):
            return self._refs[index]
        return None

    @property
    def visible_columns(self) -> list[str]:
        return list(self._visible_columns)

    def render(self, detailed: dict[str, Any], *, selected_ref: str | None, visible_columns: list[str] | None = None) -> None:
        self._rendering = True
        self.Freeze()
        try:
            self.table.DeleteAllItems()
            self.table.DeleteAllColumns()
            self._refs = []

            available_columns = [column for column in detailed.get("available_columns") or [] if isinstance(column, dict)]
            visible = normalize_visible_columns(available_columns, visible_columns or detailed.get("column_order") or detailed.get("visible_columns"))
            self._visible_columns = visible
            for index, column_id in enumerate(visible):
                title = column_title(available_columns, column_id)
                self.table.InsertColumn(index, title)
                self.table.SetColumnWidth(index, 170 if column_id in {"company", "role", "next_action"} else 112)

            rows = self._filtered_rows(detailed)
            for row_index, row in enumerate(rows):
                ref = str(row.get("ref") or "")
                self._refs.append(ref)
                first = self._cell(row, visible[0]) if visible else ""
                item_index = self.table.InsertItem(row_index, first)
                for column_index, column_id in enumerate(visible[1:], start=1):
                    self.table.SetItem(item_index, column_index, self._cell(row, column_id))

            if selected_ref and str(selected_ref) in self._refs:
                selected_index = self._refs.index(str(selected_ref))
                self.table.Select(selected_index)
                self.table.Focus(selected_index)
        finally:
            self.Thaw()
            self._rendering = False

    def _filtered_rows(self, detailed: dict[str, Any]) -> list[dict[str, Any]]:
        rows = [row for row in detailed.get("rows") or [] if isinstance(row, dict)]
        query = str(detailed.get("search_query") or "").strip().lower()
        if not query:
            return rows
        result: list[dict[str, Any]] = []
        for row in rows:
            haystack = " ".join(self._cell(row, key) for key in row).lower()
            if query in haystack:
                result.append(row)
        return result

    def _cell(self, row: dict[str, Any], column_id: str) -> str:
        value = row.get(column_id)
        if isinstance(value, list):
            return " ".join(f"#{item}" for item in value if str(item).strip())
        return self._clip(value, 120)

    def _clip(self, value: Any, limit: int) -> str:
        text = " ".join(str(value or "").split())
        if len(text) <= limit:
            return text
        return text[: max(0, limit - 1)].rstrip() + "…"

    def _on_selected(self, event: wx.ListEvent) -> None:
        if self._rendering:
            return
        index = event.GetIndex()
        if 0 <= index < len(self._refs):
            self.on_select(self._refs[index])
