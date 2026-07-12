from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .scrolling import bind_parent_wheel_scroll
from .user_fields import collect_writable_user_changes, grouped_user_fields

EditableUserSaveCallback = Callable[[dict[str, str]], None]


class UserPanel(wx.ScrolledWindow):
    """Simple local profile with explicit display and edit states."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: EditableUserSaveCallback,
        on_cancel: Callable[[], None],
        on_advanced_task_definitions: Callable[[], None],
    ) -> None:
        super().__init__(parent)
        self.on_save = on_save
        self.on_cancel = on_cancel
        self.on_advanced_task_definitions = on_advanced_task_definitions
        self._original_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}
        self._projection: dict[str, Any] = {}
        self._editing = False
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

            title = wx.StaticText(self, label="Your profile")
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            body = wx.StaticText(
                self,
                label="The information AAAAT reuses for applications, CVs and cover letters.",
            )
            body.Wrap(680)
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
            self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
            self._add_actions()

            for group in grouped_user_fields(projection):
                self._add_group(str(group.get("title") or "Profile"), list(group.get("fields") or []))

            advanced = wx.Button(self, label="Advanced AI and template configuration…")
            advanced.Bind(wx.EVT_BUTTON, lambda _event: self.on_advanced_task_definitions())
            self.sizer.Add(advanced, 0, wx.ALL, 14)

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
            actions.Add(cancel, 0)
        else:
            edit = wx.Button(self, label="Edit profile")
            edit.Bind(wx.EVT_BUTTON, self._on_edit)
            actions.Add(edit, 0)
        self.sizer.Add(actions, 0, wx.ALL, 14)

    def _add_group(self, title: str, fields: list[dict[str, Any]]) -> None:
        heading = wx.StaticText(self, label=title)
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
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

    def _add_value(self, label: str, value: str) -> None:
        heading = wx.StaticText(self, label=label)
        heading.SetFont(heading.GetFont().Bold())
        body = wx.StaticText(self, label=value or "—")
        body.Wrap(640)
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 14)

    def _add_editor(self, key: str, label: str, value: str, *, multiline: bool) -> None:
        heading = wx.StaticText(self, label=label)
        heading.SetFont(heading.GetFont().Bold())
        style = wx.TE_MULTILINE if multiline else 0
        editor = wx.TextCtrl(self, value=value, style=style)
        editor.SetMaxSize((640, -1))
        if multiline:
            editor.SetMinSize((480, 130))
        self._controls[key] = editor
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 14)

    def _on_edit(self, _event: wx.CommandEvent) -> None:
        self._editing = True
        self.render(self._projection)

    def _on_save(self, _event: wx.CommandEvent) -> None:
        current_values = {key: control.GetValue() for key, control in self._controls.items()}
        changes = collect_writable_user_changes(
            self._original_values,
            current_values,
            self._field_storage_keys,
        )
        if changes:
            self.on_save(changes)
        self._editing = False

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        self._editing = False
        self.on_cancel()
