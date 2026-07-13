from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .scrolling import bind_parent_wheel_scroll
from .user_fields import collect_writable_user_changes, grouped_user_fields


class UserPanel(wx.ScrolledWindow):
    """Human-facing profile essentials and direct access to deeper local data."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: Callable[[dict[str, str]], None],
        on_manage_facts: Callable[[], None],
        on_open_config: Callable[[], None],
        on_open_templates: Callable[[], None],
        on_reload_config: Callable[[], None],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_save = on_save
        self.on_manage_facts = on_manage_facts
        self.on_open_config = on_open_config
        self.on_open_templates = on_open_templates
        self.on_reload_config = on_reload_config
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)
        self._editing = False
        self._projection: dict[str, Any] = {}
        self._original_values: dict[str, str] = {}
        self._draft_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}

    def render(self, projection: dict[str, Any]) -> None:
        self._projection = projection
        if not self._editing and not self._draft_values:
            self._original_values = {}
            self._field_storage_keys = {}
        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            self._controls = {}
            title = wx.StaticText(self, label="User/Profile")
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            description = wx.StaticText(
                self,
                label="Your reusable professional information and local preparation configuration.",
            )
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 14)
            self.sizer.Add(description, 0, wx.ALL | wx.EXPAND, 14)
            self._add_actions()

            for group in grouped_user_fields(projection):
                fields = [field for field in group.get("fields") or [] if field.get("storage_key")]
                if fields:
                    self._add_group(str(group.get("title") or "Profile"), fields)

            self._add_workspace_tools()
            self.Layout()
            self.FitInside()
            width = max(1, self.GetClientSize().GetWidth())
            self.SetVirtualSize((width, max(self.GetClientSize().GetHeight(), self.GetVirtualSize().GetHeight())))
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
            "Save profile changes before leaving this view?",
            "Unsaved profile changes",
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
            edit = wx.Button(self, label="Edit profile")
            edit.Bind(wx.EVT_BUTTON, self._on_edit)
            actions.Add(edit, 0, wx.RIGHT | wx.BOTTOM, 6)
        facts = wx.Button(self, label="Experience, skills and preferences…")
        facts.Bind(wx.EVT_BUTTON, lambda _event: self.on_manage_facts())
        actions.Add(facts, 0, wx.BOTTOM, 6)
        self.sizer.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

    def _add_group(self, title: str, fields: list[dict[str, Any]]) -> None:
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
            sizer = wx.BoxSizer(wx.VERTICAL)
            panel.SetSizer(sizer)
            heading_label = wx.StaticText(panel, label=label)
            heading_label.SetFont(heading_label.GetFont().Bold())
            sizer.Add(heading_label, 0, wx.BOTTOM | wx.EXPAND, 3)
            if self._editing:
                multiline = bool(field.get("multiline"))
                control = wx.TextCtrl(panel, value=current, style=wx.TE_MULTILINE if multiline else 0)
                if multiline:
                    control.SetMinSize((-1, 120))
                control.Bind(wx.EVT_TEXT, lambda _event, field_key=key, editor=control: self._set_draft(field_key, editor.GetValue()))
                self._controls[key] = control
                sizer.Add(control, 1 if multiline else 0, wx.EXPAND)
            else:
                body = wx.StaticText(panel, label=current or "—")
                body.Wrap(460)
                sizer.Add(body, 0, wx.EXPAND)
            grid.Add(panel, 1, wx.EXPAND)
        while grid.GetItemCount() % 2:
            grid.Add((0, 0))
        self.sizer.Add(grid, 0, wx.ALL | wx.EXPAND, 14)

    def _add_workspace_tools(self) -> None:
        heading = wx.StaticText(self, label="AI and document configuration")
        heading.SetFont(heading.GetFont().Bold().Larger())
        explanation = wx.StaticText(
            self,
            label="Configuration is stored as transparent local files. Edit them with your preferred editor, then reload.",
        )
        explanation.Wrap(850)
        actions = wx.WrapSizer(wx.HORIZONTAL)
        config = wx.Button(self, label="Open configuration folder")
        templates = wx.Button(self, label="Open templates folder")
        reload_button = wx.Button(self, label="Validate and reload")
        config.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_config())
        templates.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_templates())
        reload_button.Bind(wx.EVT_BUTTON, lambda _event: self.on_reload_config())
        for button in (config, templates, reload_button):
            actions.Add(button, 0, wx.RIGHT | wx.BOTTOM, 6)
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 14)
        self.sizer.Add(explanation, 0, wx.ALL | wx.EXPAND, 14)
        self.sizer.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

    def _set_draft(self, key: str, value: str) -> None:
        self._draft_values[key] = value

    def _capture_controls(self) -> None:
        for key, control in self._controls.items():
            self._draft_values[key] = control.GetValue()

    def _save_current(self) -> None:
        self._capture_controls()
        changes = collect_writable_user_changes(self._original_values, self._draft_values, self._field_storage_keys)
        self._original_values.update(self._draft_values)
        self._draft_values = {}
        self._editing = False
        if changes:
            self.on_save(changes)
        else:
            self.render(self._projection)

    def _discard_draft(self) -> None:
        self._draft_values = {}
        self._editing = False
        self.render(self._projection)

    def _on_edit(self, _event: wx.CommandEvent) -> None:
        self._editing = True
        self.render(self._projection)

    def _on_save(self, _event: wx.CommandEvent) -> None:
        self._save_current()

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        self._discard_draft()
