from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .scrolling import bind_parent_wheel_scroll
from .user_fields import grouped_user_fields

EditableUserSaveCallback = Callable[[dict[str, str]], None]


class UserPanel(wx.ScrolledWindow):
    """Professional and career workspace with field-local editing."""

    def __init__(self, parent: wx.Window, *, on_save: EditableUserSaveCallback, on_cancel: Callable[[], None]) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_save = on_save
        self.on_cancel = on_cancel
        self._wrap_targets: list[wx.StaticText] = []
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)
        self.Bind(wx.EVT_SIZE, self._on_size)

    def render(self, projection: dict[str, Any], *, can_edit: bool) -> None:
        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            self._wrap_targets = []
            title = wx.StaticText(self, label="Professional & career workspace")
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            body = wx.StaticText(self, label="Edit reusable identity, experience, career direction and writing preferences. Each field saves independently.")
            self._wrap_label(body)
            self._wrap_targets.append(body)
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
            self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 12)
            for group in grouped_user_fields(projection):
                self._add_group(group, can_edit=can_edit)
            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def _add_group(self, group: dict[str, Any], *, can_edit: bool) -> None:
        heading = wx.StaticText(self, label=str(group.get("title") or "Profile"))
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
        for field in group.get("fields") or []:
            self.sizer.Add(UserFieldEditor(self, field=field, can_edit=can_edit, on_save=self.on_save), 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)

    def _wrap_width(self) -> int:
        return max(260, int(self.GetClientSize().GetWidth() or 760) - 32)

    def _on_size(self, event: wx.SizeEvent) -> None:
        live_targets: list[wx.StaticText] = []
        for target in self._wrap_targets:
            try:
                if target and not target.IsBeingDeleted():
                    self._wrap_label(target)
                    live_targets.append(target)
            except RuntimeError:
                continue
        self._wrap_targets = live_targets
        event.Skip()

    def _wrap_label(self, target: wx.StaticText) -> None:
        target.Wrap(self._wrap_width())


class UserFieldEditor(wx.Panel):
    def __init__(self, parent: wx.Window, *, field: dict[str, Any], can_edit: bool, on_save: EditableUserSaveCallback) -> None:
        super().__init__(parent, style=wx.BORDER_SIMPLE)
        self.storage_key = str(field.get("storage_key") or "")
        self.original = str(field.get("value") or "")
        self.on_save = on_save
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        header = wx.BoxSizer(wx.HORIZONTAL)
        label = wx.StaticText(self, label=str(field.get("label") or field.get("key") or "Field"))
        label.SetFont(label.GetFont().Bold())
        self.status = wx.StaticText(self, label="")
        header.Add(label, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        header.Add(self.status, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        root.Add(header, 0, wx.EXPAND)
        style = wx.TE_MULTILINE if bool(field.get("multiline")) else 0
        self.editor = wx.TextCtrl(self, value=self.original, style=style)
        self.editor.Enable(bool(can_edit and self.storage_key))
        if style & wx.TE_MULTILINE:
            self.editor.SetMinSize((-1, 96))
        root.Add(self.editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        actions = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(self, label="Save")
        revert = wx.Button(self, label="Revert")
        save.Enable(self.editor.IsEnabled())
        revert.Enable(self.editor.IsEnabled())
        save.Bind(wx.EVT_BUTTON, self._save)
        revert.Bind(wx.EVT_BUTTON, self._revert)
        actions.AddStretchSpacer(1)
        actions.Add(revert, 0, wx.RIGHT, 6)
        actions.Add(save, 0)
        root.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _save(self, _event: wx.CommandEvent) -> None:
        value = self.editor.GetValue()
        if value == self.original or not self.storage_key:
            self.status.SetLabel("No changes")
            return
        self.status.SetLabel("Saving…")
        self.original = value
        self.on_save({self.storage_key: value})

    def _revert(self, _event: wx.CommandEvent) -> None:
        self.editor.SetValue(self.original)
        self.status.SetLabel("Reverted")
