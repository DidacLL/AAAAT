from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .detail_fields import collect_writable_changes, grouped_detail_fields
from .scrolling import bind_parent_wheel_scroll


class DetailPanel(wx.ScrolledWindow):
    """Dense selected-candidature display with explicit editing and durable drafts."""

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
        self._current_ref: str | None = None
        self._projection: dict[str, Any] = {}
        self._editing = False
        self._original_values: dict[str, str] = {}
        self._draft_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}
        self.Bind(wx.EVT_SIZE, self._on_size)

    def render(self, projection: dict[str, Any]) -> None:
        groups = grouped_detail_fields(projection)
        selected = projection.get("detailed", {}).get("selected_row") or {}
        ref = str(selected.get("ref") or "") or None
        if ref != self._current_ref:
            self._editing = False
            self._draft_values = {}
            self._original_values = {}
            self._field_storage_keys = {}
        elif not self._editing and not self._draft_values:
            self._original_values = {}
            self._field_storage_keys = {}
        self._current_ref = ref
        self._projection = projection
        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            self._controls = {}
            if not ref:
                self._add_empty()
                self._fit_width()
                return

            company = str(selected.get("company") or "Company")
            role = str(selected.get("role") or "Role")
            title = wx.StaticText(self, label=company)
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            subtitle = wx.StaticText(self, label=role)
            subtitle.SetFont(subtitle.GetFont().Bold().Larger())
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
            self.sizer.Add(subtitle, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
            self._add_actions()

            for group in groups:
                fields = list(group.get("fields") or [])
                if not fields:
                    continue
                if str(group.get("title")) in self.COMPACT_GROUPS:
                    self._add_compact_group(str(group.get("title")), fields)
                else:
                    self._add_long_group(str(group.get("title")), fields)
            self._fit_width()
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
            self._discard_draft()
        return True

    def _add_actions(self) -> None:
        actions = wx.WrapSizer(wx.HORIZONTAL)
        if self._editing:
            save = wx.Button(self, label="Save changes")
            cancel = wx.Button(self, label="Cancel")
            save.Bind(wx.EVT_BUTTON, self._on_save)
            cancel.Bind(wx.EVT_BUTTON, self._on_cancel)
            actions.Add(save, 0, wx.RIGHT | wx.BOTTOM, 6)
            actions.Add(cancel, 0, wx.RIGHT | wx.BOTTOM, 6)
        else:
            edit = wx.Button(self, label="Edit")
            edit.Bind(wx.EVT_BUTTON, self._on_edit)
            actions.Add(edit, 0, wx.RIGHT | wx.BOTTOM, 6)
        delete = wx.Button(self, label="Delete")
        open_smart = wx.Button(self, label="Open in Smart View")
        delete.Bind(wx.EVT_BUTTON, self._on_delete)
        open_smart.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_smart())
        actions.Add(delete, 0, wx.RIGHT | wx.BOTTOM, 6)
        actions.Add(open_smart, 0, wx.BOTTOM, 6)
        self.sizer.Add(actions, 0, wx.ALL | wx.EXPAND, 12)

    def _add_compact_group(self, title: str, fields: list[dict[str, Any]]) -> None:
        self._group_heading(title)
        grid = wx.FlexGridSizer(cols=3, vgap=10, hgap=16)
        for column in range(3):
            grid.AddGrowableCol(column, 1)
        for field in fields:
            grid.Add(self._field_panel(field, compact=True), 1, wx.EXPAND)
        while grid.GetItemCount() % 3:
            grid.Add((0, 0))
        self.sizer.Add(grid, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

    def _add_long_group(self, title: str, fields: list[dict[str, Any]]) -> None:
        self._group_heading(title)
        grid = wx.FlexGridSizer(cols=2, vgap=10, hgap=16)
        grid.AddGrowableCol(0, 1)
        grid.AddGrowableCol(1, 1)
        for field in fields:
            multiline = bool(field.get("multiline")) or len(str(field.get("value") or "")) > 180
            panel = self._field_panel(field, compact=not multiline)
            if multiline:
                self.sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)
            else:
                grid.Add(panel, 1, wx.EXPAND)
        if grid.GetItemCount():
            while grid.GetItemCount() % 2:
                grid.Add((0, 0))
            self.sizer.Add(grid, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

    def _group_heading(self, title: str) -> None:
        heading = wx.StaticText(self, label=title)
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)

    def _field_panel(self, field: dict[str, Any], *, compact: bool) -> wx.Panel:
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
        if storage_key and (self._editing or always_editable):
            multiline = bool(field.get("multiline")) or not compact
            editor = wx.TextCtrl(panel, value=current, style=wx.TE_MULTILINE if multiline else 0)
            if multiline:
                editor.SetMinSize((-1, 110 if key != "source_text" else 260))
            editor.Bind(wx.EVT_TEXT, lambda _event, field_key=key, control=editor: self._set_draft(field_key, control.GetValue()))
            if always_editable:
                editor.Bind(wx.EVT_KILL_FOCUS, self._on_notes_blur)
            self._controls[key] = editor
            sizer.Add(editor, 1 if multiline else 0, wx.EXPAND)
        else:
            body = wx.StaticText(panel, label=current or "—")
            sizer.Add(body, 0, wx.EXPAND)
        return panel

    def _set_draft(self, key: str, value: str) -> None:
        self._draft_values[key] = value

    def _capture_controls(self) -> None:
        for key, control in self._controls.items():
            self._draft_values[key] = control.GetValue()

    def _save_current(self) -> None:
        if not self._current_ref:
            return
        self._capture_controls()
        changes = collect_writable_changes(self._original_values, self._draft_values, self._field_storage_keys)
        self._original_values.update(self._draft_values)
        self._draft_values = {}
        self._editing = False
        if changes:
            self.on_save(self._current_ref, changes)
        else:
            self.render(self._projection)

    def _discard_draft(self) -> None:
        self._draft_values = {}
        self._editing = False

    def _on_edit(self, _event: wx.CommandEvent) -> None:
        self._editing = True
        self.render(self._projection)

    def _on_save(self, _event: wx.CommandEvent) -> None:
        self._save_current()

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        self._discard_draft()
        self.on_cancel()

    def _on_notes_blur(self, event: wx.FocusEvent) -> None:
        if self._current_ref:
            self._capture_controls()
            notes = self._draft_values.get("notes", self._original_values.get("notes", ""))
            if notes != self._original_values.get("notes", ""):
                self._original_values["notes"] = notes
                self._draft_values.pop("notes", None)
                self.on_save(self._current_ref, {"notes": notes})
        event.Skip()

    def _on_delete(self, _event: wx.CommandEvent) -> None:
        if self._current_ref and self.confirm_navigation():
            self.on_delete(self._current_ref)

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="No candidature selected")
        title.SetFont(title.GetFont().Bold().Larger())
        self.sizer.Add(title, 0, wx.ALL, 12)

    def _on_size(self, event: wx.SizeEvent) -> None:
        wx.CallAfter(self._fit_width)
        event.Skip()

    def _fit_width(self) -> None:
        width = max(1, self.GetClientSize().GetWidth())
        wrap = max(180, width - 36)
        for child in self.GetChildren():
            if isinstance(child, wx.StaticText):
                child.Wrap(wrap)
            elif isinstance(child, wx.Panel):
                for nested in child.GetChildren():
                    if isinstance(nested, wx.StaticText):
                        nested.Wrap(max(160, width // 2 - 36))
        self.Layout()
        self.FitInside()
        self.SetVirtualSize((width, max(self.GetClientSize().GetHeight(), self.GetVirtualSize().GetHeight())))
