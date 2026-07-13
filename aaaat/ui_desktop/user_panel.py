from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .scrolling import bind_parent_wheel_scroll
from .user_fields import collect_writable_user_changes, grouped_user_fields, has_editable_user_fields

EditableUserSaveCallback = Callable[[dict[str, str]], None]


class UserPanel(wx.ScrolledWindow):
    """Grouped local profile editor for user-facing AAAAT profile data."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: EditableUserSaveCallback,
        on_cancel: Callable[[], None],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_save = on_save
        self.on_cancel = on_cancel
        self._original_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)

    def render(self, projection: dict[str, Any], *, can_edit: bool) -> None:
        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            self._controls = {}
            self._original_values = {}
            self._field_storage_keys = {}
            title = wx.StaticText(self, label="Profile")
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            body = wx.StaticText(self, label="Professional identity and defaults used for local CVs, letters, forms and preparation material.")
            body.Wrap(self._wrap_width())
            self.Bind(wx.EVT_SIZE, lambda event, target=body: self._wrap_on_resize(event, target))
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
            self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)

            if has_editable_user_fields(projection):
                self._add_actions(can_edit)
            for group in grouped_user_fields(projection):
                self._add_group(group, can_edit=can_edit)

            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def _add_actions(self, can_edit: bool) -> None:
        actions = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(self, label="Save profile")
        cancel = wx.Button(self, label="Revert")
        save.Enable(can_edit)
        cancel.Enable(can_edit)
        save.Bind(wx.EVT_BUTTON, self._on_save)
        cancel.Bind(wx.EVT_BUTTON, self._on_cancel)
        actions.Add(save, 0, wx.ALL, 4)
        actions.Add(cancel, 0, wx.ALL, 4)
        actions.AddStretchSpacer(1)
        self.sizer.Add(actions, 0, wx.ALL | wx.EXPAND, 6)

    def _add_group(self, group: dict[str, Any], *, can_edit: bool) -> None:
        heading = wx.StaticText(self, label=str(group.get("title") or "Profile"))
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        for field in group.get("fields") or []:
            key = str(field.get("key") or "")
            label = str(field.get("label") or key)
            value = str(field.get("value") or "")
            storage_key = field.get("storage_key")
            self._field_storage_keys[key] = str(storage_key) if storage_key else None
            self._original_values[key] = value
            self._add_editor(key, label, value, multiline=bool(field.get("multiline")), can_edit=can_edit)

    def _add_editor(self, key: str, label: str, value: str, *, multiline: bool, can_edit: bool) -> None:
        heading = wx.StaticText(self, label=label)
        heading.SetFont(heading.GetFont().Bold())
        style = wx.TE_MULTILINE if multiline else 0
        editor = wx.TextCtrl(self, value=value, style=style)
        editor.Enable(can_edit)
        if multiline:
            editor.SetMinSize((-1, 110 if key == "profile.summary.default" else 84))
        self._controls[key] = editor
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _on_save(self, _event: wx.CommandEvent) -> None:
        current_values = {key: control.GetValue() for key, control in self._controls.items()}
        changes = collect_writable_user_changes(self._original_values, current_values, self._field_storage_keys)
        if changes:
            self.on_save(changes)

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        for key, control in self._controls.items():
            control.SetValue(self._original_values.get(key, ""))
        self.on_cancel()

    def _wrap_width(self) -> int:
        return max(260, int(self.GetClientSize().GetWidth() or 760) - 28)

    def _wrap_on_resize(self, event: wx.SizeEvent, target: wx.StaticText) -> None:
        target.Wrap(self._wrap_width())
        event.Skip()
