from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .candidature_actions import add_candidature_actions
from .detail_fields import collect_writable_changes, grouped_detail_fields
from .scrolling import bind_parent_wheel_scroll

EditableSaveCallback = Callable[[str, dict[str, str]], None]
DeleteCallback = Callable[[str], None]


class DetailPanel(wx.ScrolledWindow):
    """Selected candidature details with explicit display and edit states."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: EditableSaveCallback,
        on_delete: DeleteCallback,
        on_cancel: Callable[[], None],
        on_open_smart: Callable[[], None],
        on_action: Callable[[str], None],
    ) -> None:
        super().__init__(parent)
        self.on_save = on_save
        self.on_delete = on_delete
        self.on_cancel = on_cancel
        self.on_open_smart = on_open_smart
        self.on_action = on_action
        self._current_ref: str | None = None
        self._original_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}
        self._editing = False
        self._projection: dict[str, Any] = {}
        self.SetScrollRate(8, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)

    def render(self, projection: dict[str, Any], *, can_edit: bool = True) -> None:
        self._projection = projection
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
            title = wx.StaticText(self, label=str(selected.get("company") or "Untitled Company"))
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            role = wx.StaticText(self, label=str(selected.get("role") or "Untitled Role"))
            role.SetFont(role.GetFont().Bold().Larger())
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
            self.sizer.Add(role, 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)

            self._add_actions()
            add_candidature_actions(self, self.sizer, self.on_action, compact=True)
            for group in grouped_detail_fields(projection):
                writable = [field for field in group.get("fields") or [] if field.get("storage_key")]
                if writable:
                    self._add_group(str(group.get("title") or "Details"), writable)

            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def _add_actions(self) -> None:
        actions = wx.BoxSizer(wx.HORIZONTAL)
        if self._editing:
            save = wx.Button(self, label="Save changes")
            cancel = wx.Button(self, label="Cancel")
            save.Bind(wx.EVT_BUTTON, self._on_save)
            cancel.Bind(wx.EVT_BUTTON, self._on_cancel)
            actions.Add(save, 0, wx.RIGHT, 6)
            actions.Add(cancel, 0, wx.RIGHT, 6)
        else:
            edit = wx.Button(self, label="Edit")
            edit.Bind(wx.EVT_BUTTON, self._on_edit)
            actions.Add(edit, 0, wx.RIGHT, 6)
        delete = wx.Button(self, label="Delete")
        open_smart = wx.Button(self, label="Open in Smart View")
        delete.Bind(wx.EVT_BUTTON, self._on_delete)
        open_smart.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_smart())
        actions.Add(delete, 0, wx.RIGHT, 6)
        actions.Add(open_smart, 0)
        self.sizer.Add(actions, 0, wx.ALL, 12)

    def _add_group(self, title: str, fields: list[dict[str, Any]]) -> None:
        heading = wx.StaticText(self, label=title)
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        for field in fields:
            key = str(field.get("key") or "")
            label = str(field.get("label") or key)
            value = str(field.get("value") or "")
            storage_key = str(field.get("storage_key") or "")
            self._field_storage_keys[key] = storage_key
            self._original_values[key] = value
            if self._editing:
                self._add_editor(key, label, value, multiline=bool(field.get("multiline")))
            else:
                self._add_value(label, value)

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="No candidature selected")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="Select a row to inspect a candidature.")
        self.sizer.Add(title, 0, wx.ALL, 12)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)

    def _add_value(self, label: str, value: str) -> None:
        heading = wx.StaticText(self, label=label)
        heading.SetFont(heading.GetFont().Bold())
        body = wx.StaticText(self, label=value or "—")
        body.Wrap(500)
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)

    def _add_editor(self, key: str, label: str, value: str, *, multiline: bool) -> None:
        heading = wx.StaticText(self, label=label)
        heading.SetFont(heading.GetFont().Bold())
        style = wx.TE_MULTILINE if multiline else 0
        editor = wx.TextCtrl(self, value=value, style=style)
        editor.SetMaxSize((560, -1))
        if multiline:
            height = 150 if key in {"company_research", "form_answers", "offer_snapshot"} else 92
            editor.SetMinSize((420, height))
        self._controls[key] = editor
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 12)
        self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)

    def _on_edit(self, _event: wx.CommandEvent) -> None:
        self._editing = True
        self.render(self._projection)

    def _on_save(self, _event: wx.CommandEvent) -> None:
        if not self._current_ref:
            return
        current_values = {key: control.GetValue() for key, control in self._controls.items()}
        changes = collect_writable_changes(self._original_values, current_values, self._field_storage_keys)
        if changes:
            self.on_save(self._current_ref, changes)
        self._editing = False

    def _on_delete(self, _event: wx.CommandEvent) -> None:
        if self._current_ref:
            self.on_delete(self._current_ref)

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        self._editing = False
        self.on_cancel()
