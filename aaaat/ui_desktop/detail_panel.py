from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .detail_fields import collect_writable_changes, grouped_detail_fields
from .scrolling import bind_parent_wheel_scroll


class DetailPanel(wx.ScrolledWindow):
    """Dense candidature display with explicit editing and durable local drafts."""

    COMPACT_GROUPS = {"Identity", "Logistics", "Workflow"}

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: Callable[[str, dict[str, str]], None],
        on_delete: Callable[[str], None],
        on_cancel: Callable[[], None],
        on_open_smart: Callable[[], None],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_save = on_save
        self.on_delete = on_delete
        self.on_cancel = on_cancel
        self.on_open_smart = on_open_smart
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)
        self._projection: dict[str, Any] = {}
        self._record: dict[str, Any] = {}
        self._current_ref: str | None = None
        self._editing = False
        self._original_values: dict[str, str] = {}
        self._draft_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}
        self.Bind(wx.EVT_SIZE, self._on_size)

    def render(self, projection: dict[str, Any], *, can_edit: bool, record: dict[str, Any] | None = None) -> None:
        resolved = dict(record or {})
        ref = str(resolved.get("id") or resolved.get("ref") or (projection.get("detailed", {}).get("selected_row") or {}).get("ref") or "") or None
        if ref != self._current_ref:
            self._current_ref = ref
            self._editing = False
            self._draft_values = {}
            self._original_values = {}
        self._projection = projection
        self._record = resolved
        groups = grouped_detail_fields(projection, resolved or None)

        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            self._controls = {}
            self._field_storage_keys = {}
            if not ref:
                self._add_empty()
                self._finish_layout()
                return
            company = str(resolved.get("company") or "Untitled Company")
            role = str(resolved.get("role") or "Untitled Role")
            title = wx.StaticText(self, label=company)
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            subtitle = wx.StaticText(self, label=role)
            subtitle.SetFont(subtitle.GetFont().Bold().Larger())
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
            self.sizer.Add(subtitle, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
            self._add_actions(can_edit)
            for group in groups:
                fields = list(group.get("fields") or [])
                if not fields:
                    continue
                if str(group.get("title")) in self.COMPACT_GROUPS:
                    self._add_compact_group(str(group.get("title")), fields, can_edit)
                else:
                    self._add_long_group(str(group.get("title")), fields, can_edit)
            self._finish_layout()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def has_unsaved_changes(self) -> bool:
        self._capture_controls()
        return any(
            self._draft_values.get(key, self._original_values.get(key, "")) != self._original_values.get(key, "")
            for key, storage_key in self._field_storage_keys.items()
            if storage_key
        )

    def confirm_navigation(self) -> bool:
        if not self.has_unsaved_changes():
            return True
        choice = wx.MessageBox(
            "Save changes before leaving this candidature?",
            "Unsaved candidature changes",
            wx.YES_NO | wx.CANCEL | wx.ICON_QUESTION,
            self,
        )
        if choice == wx.CANCEL:
            return False
        if choice == wx.YES:
            self._save_current()
        else:
            self._draft_values = {}
            self._editing = False
        return True

    def _add_actions(self, can_edit: bool) -> None:
        actions = wx.WrapSizer(wx.HORIZONTAL)
        if self._editing:
            save = wx.Button(self, label="Save changes")
            cancel = wx.Button(self, label="Cancel")
            save.Enable(can_edit)
            save.Bind(wx.EVT_BUTTON, self._on_save)
            cancel.Bind(wx.EVT_BUTTON, self._on_cancel)
            actions.Add(save, 0, wx.RIGHT | wx.BOTTOM, 6)
            actions.Add(cancel, 0, wx.RIGHT | wx.BOTTOM, 6)
        else:
            edit = wx.Button(self, label="Edit")
            save_notes = wx.Button(self, label="Save notes")
            edit.Enable(can_edit)
            save_notes.Enable(can_edit)
            edit.Bind(wx.EVT_BUTTON, self._on_edit)
            save_notes.Bind(wx.EVT_BUTTON, self._on_save)
            actions.Add(edit, 0, wx.RIGHT | wx.BOTTOM, 6)
            actions.Add(save_notes, 0, wx.RIGHT | wx.BOTTOM, 6)
        delete = wx.Button(self, label="Delete")
        delete.Enable(can_edit)
        delete.Bind(wx.EVT_BUTTON, self._on_delete)
        open_smart = wx.Button(self, label="Open in Smart View")
        open_smart.Bind(wx.EVT_BUTTON, self._on_open_smart)
        actions.Add(delete, 0, wx.RIGHT | wx.BOTTOM, 6)
        actions.Add(open_smart, 0, wx.BOTTOM, 6)
        self.sizer.Add(actions, 0, wx.ALL | wx.EXPAND, 12)

    def _add_compact_group(self, title: str, fields: list[dict[str, Any]], can_edit: bool) -> None:
        self._heading(title)
        grid = wx.FlexGridSizer(cols=3, vgap=10, hgap=16)
        for column in range(3):
            grid.AddGrowableCol(column, 1)
        for field in fields:
            grid.Add(self._field_panel(field, can_edit=can_edit, compact=True), 1, wx.EXPAND)
        while grid.GetItemCount() % 3:
            grid.Add((0, 0))
        self.sizer.Add(grid, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

    def _add_long_group(self, title: str, fields: list[dict[str, Any]], can_edit: bool) -> None:
        self._heading(title)
        grid = wx.FlexGridSizer(cols=2, vgap=10, hgap=16)
        grid.AddGrowableCol(0, 1)
        grid.AddGrowableCol(1, 1)
        for field in fields:
            multiline = bool(field.get("multiline")) or len(str(field.get("value") or "")) > 180
            panel = self._field_panel(field, can_edit=can_edit, compact=not multiline)
            if multiline:
                if grid.GetItemCount():
                    while grid.GetItemCount() % 2:
                        grid.Add((0, 0))
                    self.sizer.Add(grid, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)
                    grid = wx.FlexGridSizer(cols=2, vgap=10, hgap=16)
                    grid.AddGrowableCol(0, 1)
                    grid.AddGrowableCol(1, 1)
                self.sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)
            else:
                grid.Add(panel, 1, wx.EXPAND)
        if grid.GetItemCount():
            while grid.GetItemCount() % 2:
                grid.Add((0, 0))
            self.sizer.Add(grid, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

    def _heading(self, title: str) -> None:
        heading = wx.StaticText(self, label=title)
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)

    def _field_panel(self, field: dict[str, Any], *, can_edit: bool, compact: bool) -> wx.Panel:
        key = str(field.get("key") or "")
        label = str(field.get("label") or key)
        value = str(field.get("value") or "")
        storage_key = str(field.get("storage_key") or "") or None
        if key not in self._original_values:
            self._original_values[key] = value
        self._field_storage_keys[key] = storage_key
        current = self._draft_values.get(key, value)

        panel = wx.Panel(self)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        heading = wx.StaticText(panel, label=label)
        heading.SetFont(heading.GetFont().Bold())
        sizer.Add(heading, 0, wx.BOTTOM | wx.EXPAND, 3)

        always_editable = key == "notes"
        if storage_key and can_edit and (self._editing or always_editable):
            multiline = bool(field.get("multiline")) or not compact
            editor = wx.TextCtrl(panel, value=current, style=wx.TE_MULTILINE if multiline else 0)
            if multiline:
                editor.SetMinSize((-1, 250 if key == "source_text" else 110))
            editor.Bind(wx.EVT_TEXT, lambda _event, field_key=key, control=editor: self._draft_values.__setitem__(field_key, control.GetValue()))
            self._controls[key] = editor
            sizer.Add(editor, 1 if multiline else 0, wx.EXPAND)
        else:
            body = wx.StaticText(panel, label=current or "—")
            sizer.Add(body, 0, wx.EXPAND)
        return panel

    def _capture_controls(self) -> None:
        for key, control in self._controls.items():
            self._draft_values[key] = control.GetValue()

    def _save_current(self) -> None:
        if not self._current_ref:
            return
        self._capture_controls()
        changes = collect_writable_changes(self._original_values, self._draft_values, self._field_storage_keys)
        if changes:
            self.on_save(self._current_ref, changes)
            self._original_values.update(self._draft_values)
        self._draft_values = {}
        self._editing = False

    def _on_edit(self, _event: wx.CommandEvent) -> None:
        self._editing = True
        self.render(self._projection, can_edit=True, record=self._record)

    def _on_save(self, _event: wx.CommandEvent) -> None:
        self._save_current()

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        self._draft_values = {}
        self._editing = False
        self.on_cancel()

    def _on_open_smart(self, _event: wx.CommandEvent) -> None:
        if self.confirm_navigation():
            wx.CallAfter(self.on_open_smart)

    def _on_delete(self, _event: wx.CommandEvent) -> None:
        if self._current_ref and self.confirm_navigation():
            wx.CallAfter(self.on_delete, self._current_ref)

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="No candidature selected")
        title.SetFont(title.GetFont().Bold().Larger())
        self.sizer.Add(title, 0, wx.ALL, 12)

    def _finish_layout(self) -> None:
        self.Layout()
        self.FitInside()
        width = max(1, self.GetClientSize().GetWidth())
        height = max(self.GetClientSize().GetHeight(), self.GetVirtualSize().GetHeight())
        self.SetVirtualSize((width, height))

    def _on_size(self, event: wx.SizeEvent) -> None:
        wx.CallAfter(self._fit_width)
        event.Skip()

    def _fit_width(self) -> None:
        width = max(1, self.GetClientSize().GetWidth())
        for child in self.GetChildren():
            if isinstance(child, wx.StaticText):
                child.Wrap(max(180, width - 36))
            elif isinstance(child, wx.Panel):
                for nested in child.GetChildren():
                    if isinstance(nested, wx.StaticText):
                        nested.Wrap(max(150, width // 2 - 36))
        self._finish_layout()
