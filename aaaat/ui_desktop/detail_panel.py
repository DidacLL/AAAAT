from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .detail_fields import collect_writable_changes, grouped_detail_fields
from .scrolling import bind_parent_wheel_scroll

EditableSaveCallback = Callable[[str, dict[str, str]], None]
DeleteCallback = Callable[[str], None]


class DetailPanel(wx.ScrolledWindow):
    """Grouped full selected-candidature editor for the desktop Detailed View."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: EditableSaveCallback,
        on_delete: DeleteCallback,
        on_cancel: Callable[[], None],
        on_open_smart: Callable[[], None],
    ) -> None:
        super().__init__(parent)
        self.on_save = on_save
        self.on_delete = on_delete
        self.on_cancel = on_cancel
        self.on_open_smart = on_open_smart
        self._current_ref: str | None = None
        self._original_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}
        self.SetScrollRate(8, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)

    def render(self, projection: dict[str, Any], *, can_edit: bool) -> None:
        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            self._controls = {}
            self._original_values = {}
            self._field_storage_keys = {}
            detailed = projection.get("detailed") or {}
            selected = detailed.get("selected_row")
            if not selected:
                self._current_ref = None
                self._add_empty()
                self.Layout()
                self.FitInside()
                bind_parent_wheel_scroll(self, self)
                return

            self._current_ref = str(selected.get("ref") or "")
            title = wx.StaticText(self, label=str(selected.get("company") or "Company not set"))
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            role = wx.StaticText(self, label=str(selected.get("role") or "Role not set"))
            role.SetFont(role.GetFont().Bold().Larger())
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
            self.sizer.Add(role, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)

            self._add_actions(can_edit)
            for group in grouped_detail_fields(projection):
                self._add_group(group, can_edit=can_edit)

            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def _add_actions(self, can_edit: bool) -> None:
        actions = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(self, label="Save")
        cancel = wx.Button(self, label="Cancel/Revert")
        delete = wx.Button(self, label="Delete")
        open_smart = wx.Button(self, label="Open in Smart View")
        save.Enable(can_edit)
        cancel.Enable(can_edit)
        delete.Enable(can_edit)
        save.Bind(wx.EVT_BUTTON, self._on_save)
        cancel.Bind(wx.EVT_BUTTON, self._on_cancel)
        delete.Bind(wx.EVT_BUTTON, self._on_delete)
        open_smart.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_smart())
        for control in (save, cancel, delete, open_smart):
            actions.Add(control, 0, wx.ALL | wx.EXPAND, 4)
        self.sizer.Add(actions, 0, wx.ALL | wx.EXPAND, 6)

    def _add_group(self, group: dict[str, Any], *, can_edit: bool) -> None:
        heading = wx.StaticText(self, label=str(group.get("title") or "Detail"))
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        for field in group.get("fields") or []:
            key = str(field.get("key") or "")
            label = str(field.get("label") or key)
            value = str(field.get("value") or "")
            storage_key = field.get("storage_key")
            editable = bool(field.get("editable")) and bool(storage_key)
            self._field_storage_keys[key] = str(storage_key) if storage_key else None
            self._original_values[key] = value
            if editable:
                self._add_editor(key, label, value, multiline=bool(field.get("multiline")), can_edit=can_edit)
            else:
                reason = str(field.get("read_only_reason") or "Read-only")
                self._add_read_only_field(label, value, reason)

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="No candidature selected")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="Select a row to inspect and edit the complete supported candidature record.")
        body.Wrap(300)
        self.sizer.Add(title, 0, wx.ALL | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _add_editor(self, key: str, label: str, value: str, *, multiline: bool, can_edit: bool) -> None:
        heading = wx.StaticText(self, label=label)
        heading.SetFont(heading.GetFont().Bold())
        style = wx.TE_MULTILINE if multiline else 0
        editor = wx.TextCtrl(self, value=value, style=style)
        editor.Enable(can_edit)
        if multiline:
            height = 130 if key in {"source_text", "company_research", "form_answers", "offer_snapshot"} else 92
            editor.SetMinSize((-1, height))
        self._controls[key] = editor
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _add_read_only_field(self, label: str, value: str, reason: str) -> None:
        heading = wx.StaticText(self, label=f"{label} · read-only")
        heading.SetFont(heading.GetFont().Bold())
        body = wx.StaticText(self, label=value or "—")
        body.Wrap(310)
        hint = wx.StaticText(self, label=reason)
        hint.Wrap(310)
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.EXPAND, 10)
        self.sizer.Add(hint, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _on_save(self, _event: wx.CommandEvent) -> None:
        if not self._current_ref:
            return
        current_values = {key: control.GetValue() for key, control in self._controls.items()}
        changes = collect_writable_changes(self._original_values, current_values, self._field_storage_keys)
        if changes:
            self.on_save(self._current_ref, changes)

    def _on_delete(self, _event: wx.CommandEvent) -> None:
        if self._current_ref:
            self.on_delete(self._current_ref)

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        for key, control in self._controls.items():
            control.SetValue(self._original_values.get(key, ""))
        self.on_cancel()
