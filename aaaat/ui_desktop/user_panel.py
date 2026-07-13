from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .scrolling import bind_parent_wheel_scroll
from .user_fields import collect_writable_user_changes, grouped_user_fields


class UserPanel(wx.ScrolledWindow):
    """Reusable professional profile with explicit editing and local configuration access."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: Callable[[dict[str, str]], None],
        on_cancel: Callable[[], None],
        on_open_config: Callable[[], None],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_save = on_save
        self.on_cancel = on_cancel
        self.on_open_config = on_open_config
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)
        self._projection: dict[str, Any] = {}
        self._editing = False
        self._original_values: dict[str, str] = {}
        self._draft_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}

    def render(self, projection: dict[str, Any], *, can_edit: bool) -> None:
        self._projection = projection
        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            self._controls = {}
            self._field_storage_keys = {}
            title = wx.StaticText(self, label="User/Profile")
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            body = wx.StaticText(self, label="Reusable professional information used for candidature analysis and generated material.")
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 14)
            self.sizer.Add(body, 0, wx.ALL | wx.EXPAND, 14)
            self._add_actions(can_edit)

            for group in grouped_user_fields(projection):
                fields = [field for field in group.get("fields") or [] if field.get("storage_key")]
                if fields:
                    self._add_group(str(group.get("title") or "Profile"), fields, can_edit)

            config_heading = wx.StaticText(self, label="AI preparation configuration")
            config_heading.SetFont(config_heading.GetFont().Bold().Larger())
            config_body = wx.StaticText(self, label="The external runner, automatic preparation and advanced task instruction overrides are stored in a transparent local JSON file.")
            open_config = wx.Button(self, label="Open AAAAT configuration")
            open_config.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_config())
            self.sizer.Add(config_heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 14)
            self.sizer.Add(config_body, 0, wx.ALL | wx.EXPAND, 14)
            self.sizer.Add(open_config, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 14)
            self.Layout()
            self.FitInside()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def has_unsaved_changes(self) -> bool:
        self._capture()
        return any(self._draft_values.get(key, value) != value for key, value in self._original_values.items())

    def confirm_navigation(self) -> bool:
        if not self.has_unsaved_changes():
            return True
        choice = wx.MessageBox("Save profile changes before leaving?", "Unsaved profile changes", wx.YES_NO | wx.CANCEL | wx.ICON_QUESTION, self)
        if choice == wx.CANCEL:
            return False
        if choice == wx.YES:
            self._save()
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
            save.Bind(wx.EVT_BUTTON, lambda _event: self._save())
            cancel.Bind(wx.EVT_BUTTON, self._on_cancel)
            actions.Add(save, 0, wx.RIGHT | wx.BOTTOM, 6)
            actions.Add(cancel, 0, wx.BOTTOM, 6)
        else:
            edit = wx.Button(self, label="Edit profile")
            edit.Enable(can_edit)
            edit.Bind(wx.EVT_BUTTON, self._on_edit)
            actions.Add(edit, 0, wx.BOTTOM, 6)
        self.sizer.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

    def _add_group(self, title: str, fields: list[dict[str, Any]], can_edit: bool) -> None:
        heading = wx.StaticText(self, label=title)
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 14)
        grid = wx.FlexGridSizer(cols=2, vgap=10, hgap=18)
        grid.AddGrowableCol(0, 1)
        grid.AddGrowableCol(1, 1)
        for field in fields:
            key = str(field.get("key") or "")
            label = str(field.get("label") or key)
            value = str(field.get("value") or "")
            storage_key = str(field.get("storage_key") or "") or None
            if key not in self._original_values:
                self._original_values[key] = value
            self._field_storage_keys[key] = storage_key
            current = self._draft_values.get(key, value)
            panel = wx.Panel(self)
            panel_sizer = wx.BoxSizer(wx.VERTICAL)
            panel.SetSizer(panel_sizer)
            label_control = wx.StaticText(panel, label=label)
            label_control.SetFont(label_control.GetFont().Bold())
            panel_sizer.Add(label_control, 0, wx.BOTTOM | wx.EXPAND, 3)
            if self._editing and can_edit:
                multiline = bool(field.get("multiline"))
                control = wx.TextCtrl(panel, value=current, style=wx.TE_MULTILINE if multiline else 0)
                if multiline:
                    control.SetMinSize((-1, 120))
                control.Bind(wx.EVT_TEXT, lambda _event, field_key=key, editor=control: self._draft_values.__setitem__(field_key, editor.GetValue()))
                self._controls[key] = control
                panel_sizer.Add(control, 1 if multiline else 0, wx.EXPAND)
            else:
                panel_sizer.Add(wx.StaticText(panel, label=current or "—"), 0, wx.EXPAND)
            grid.Add(panel, 1, wx.EXPAND)
        while grid.GetItemCount() % 2:
            grid.Add((0, 0))
        self.sizer.Add(grid, 0, wx.ALL | wx.EXPAND, 14)

    def _capture(self) -> None:
        for key, control in self._controls.items():
            self._draft_values[key] = control.GetValue()

    def _save(self) -> None:
        self._capture()
        changes = collect_writable_user_changes(self._original_values, self._draft_values, self._field_storage_keys)
        if changes:
            self._original_values.update(self._draft_values)
        self._draft_values = {}
        self._editing = False
        if changes:
            self.on_save(changes)

    def _on_edit(self, _event: wx.CommandEvent) -> None:
        self._editing = True
        self.render(self._projection, can_edit=True)

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        self._draft_values = {}
        self._editing = False
        self.on_cancel()
