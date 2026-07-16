from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .profile_links import parse_profile_links, serialize_profile_links
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
            missing = list((projection.get("user") or {}).get("profile_summary", {}).get("missing_variables") or [])
            if missing:
                required = ", ".join(key.removeprefix("profile.") for key in missing)
                guidance = wx.StaticText(
                    self,
                    label=(
                        f"Complete these fields before rendering a CV or cover letter: {required}. "
                        "They are available below in this Profile workspace."
                    ),
                )
                self._wrap_label(guidance)
                self._wrap_targets.append(guidance)
                self.sizer.Add(guidance, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)
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
            if field.get("kind") == "links":
                editor: wx.Window = ProfileLinksEditor(self, field=field, can_edit=can_edit, on_save=self.on_save)
            else:
                editor = UserFieldEditor(self, field=field, can_edit=can_edit, on_save=self.on_save)
            self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)

    def refresh_geometry(self) -> None:
        self.Layout()
        self.FitInside()

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
        label = wx.StaticText(self, label=str(field.get("label") or field.get("key") or "Field"))
        label.SetFont(label.GetFont().Bold())
        root.Add(label, 0, wx.ALL | wx.EXPAND, 8)
        help_text = str(field.get("help_text") or "").strip()
        if help_text:
            helper = wx.StaticText(self, label=help_text)
            helper.Wrap(680)
            root.Add(helper, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        style = wx.TE_MULTILINE if bool(field.get("multiline")) else 0
        self.editor = wx.TextCtrl(self, value=self.original, style=style)
        self.editor.Enable(bool(can_edit and self.storage_key))
        if style & wx.TE_MULTILINE:
            self.editor.SetMinSize((-1, 96))
        root.Add(self.editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        actions = wx.BoxSizer(wx.HORIZONTAL)
        self.status = wx.StaticText(self, label="")
        save = wx.Button(self, label="Save")
        revert = wx.Button(self, label="Revert")
        save.Enable(self.editor.IsEnabled())
        revert.Enable(self.editor.IsEnabled())
        save.Bind(wx.EVT_BUTTON, self._save)
        revert.Bind(wx.EVT_BUTTON, self._revert)
        actions.Add(self.status, 1, wx.ALIGN_CENTER_VERTICAL | wx.RIGHT, 8)
        actions.Add(revert, 0, wx.RIGHT, 6)
        actions.Add(save, 0)
        root.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _save(self, _event: wx.CommandEvent) -> None:
        value = self.editor.GetValue()
        if value == self.original or not self.storage_key:
            self.status.SetLabel("No changes")
            return
        self.status.SetLabel("Saving…")
        self.on_save({self.storage_key: value})
        self.original = value
        self.status.SetLabel("Saved")
        self.Layout()

    def _revert(self, _event: wx.CommandEvent) -> None:
        self.editor.SetValue(self.original)
        self.status.SetLabel("Reverted")
        self.Layout()


class ProfileLinksEditor(wx.Panel):
    def __init__(self, parent: wx.Window, *, field: dict[str, Any], can_edit: bool, on_save: EditableUserSaveCallback) -> None:
        super().__init__(parent, style=wx.BORDER_SIMPLE)
        self.storage_key = str(field.get("storage_key") or "profile.links")
        self.on_save = on_save
        self.can_edit = bool(can_edit and self.storage_key)
        self.rows: list[tuple[wx.TextCtrl, wx.TextCtrl, wx.TextCtrl, wx.Panel]] = []
        self.original = serialize_profile_links(list(field.get("value") or []))
        self.root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.root)

        header = wx.BoxSizer(wx.HORIZONTAL)
        title = wx.StaticText(self, label=str(field.get("label") or "Other links"))
        title.SetFont(title.GetFont().Bold())
        add = wx.Button(self, label="Add link")
        add.Enable(self.can_edit)
        add.Bind(wx.EVT_BUTTON, lambda _event: self._add_row())
        header.Add(title, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 8)
        header.Add(add, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        self.root.Add(header, 0, wx.EXPAND)

        helper = wx.StaticText(self, label=str(field.get("help_text") or "Name each link and explain why it is relevant."))
        helper.Wrap(680)
        self.root.Add(helper, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        headings = wx.BoxSizer(wx.HORIZONTAL)
        for text, proportion in (("Name", 1), ("Description", 2), ("URL", 2)):
            heading = wx.StaticText(self, label=text)
            heading.SetFont(heading.GetFont().Bold())
            headings.Add(heading, proportion, wx.RIGHT | wx.EXPAND, 8)
        headings.AddSpacer(88)
        self.root.Add(headings, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        self.rows_sizer = wx.BoxSizer(wx.VERTICAL)
        self.root.Add(self.rows_sizer, 0, wx.LEFT | wx.RIGHT | wx.EXPAND, 8)
        for item in list(field.get("value") or []):
            self._add_row(item, refresh=False)

        actions = wx.BoxSizer(wx.HORIZONTAL)
        self.status = wx.StaticText(self, label="")
        revert = wx.Button(self, label="Revert")
        save = wx.Button(self, label="Save links")
        revert.Enable(self.can_edit)
        save.Enable(self.can_edit)
        revert.Bind(wx.EVT_BUTTON, self._revert)
        save.Bind(wx.EVT_BUTTON, self._save)
        actions.Add(self.status, 1, wx.ALIGN_CENTER_VERTICAL | wx.RIGHT, 8)
        actions.Add(revert, 0, wx.RIGHT, 6)
        actions.Add(save, 0)
        self.root.Add(actions, 0, wx.ALL | wx.EXPAND, 8)

    def _add_row(self, item: dict[str, Any] | None = None, *, refresh: bool = True) -> None:
        item = item or {}
        panel = wx.Panel(self)
        row = wx.BoxSizer(wx.HORIZONTAL)
        panel.SetSizer(row)
        name = wx.TextCtrl(panel, value=str(item.get("name") or ""))
        description = wx.TextCtrl(panel, value=str(item.get("description") or ""))
        url = wx.TextCtrl(panel, value=str(item.get("url") or ""))
        name.SetHint("Name")
        description.SetHint("What this link represents")
        url.SetHint("https://…")
        name.SetMinSize((120, -1))
        description.SetMinSize((180, -1))
        url.SetMinSize((180, -1))
        remove = wx.Button(panel, label="Remove", size=(82, -1))
        for control in (name, description, url, remove):
            control.Enable(self.can_edit)
        remove.Bind(wx.EVT_BUTTON, lambda _event, target=panel: self._remove_row(target))
        row.Add(name, 1, wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        row.Add(description, 2, wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        row.Add(url, 2, wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        row.Add(remove, 0, wx.BOTTOM)
        self.rows.append((name, description, url, panel))
        self.rows_sizer.Add(panel, 0, wx.EXPAND)
        if refresh:
            self._refresh_geometry()

    def _remove_row(self, panel: wx.Panel) -> None:
        self.rows = [row for row in self.rows if row[3] is not panel]
        self.rows_sizer.Detach(panel)
        panel.Destroy()
        self.status.SetLabel("")
        self._refresh_geometry()

    def _refresh_geometry(self) -> None:
        self.Layout()
        parent = self.GetParent()
        if isinstance(parent, UserPanel):
            wx.CallAfter(parent.refresh_geometry)

    def _current(self) -> str:
        return serialize_profile_links([
            {"name": name.GetValue(), "description": description.GetValue(), "url": url.GetValue()}
            for name, description, url, _panel in self.rows
        ])

    def _save(self, _event: wx.CommandEvent) -> None:
        current = self._current()
        if current == self.original:
            self.status.SetLabel("No changes")
            self.Layout()
            return
        self.status.SetLabel("Saving…")
        self.on_save({self.storage_key: current})
        self.original = current
        self.status.SetLabel("Saved")
        self.Layout()

    def _revert(self, _event: wx.CommandEvent) -> None:
        for _name, _description, _url, panel in self.rows:
            panel.Destroy()
        self.rows = []
        self.rows_sizer.Clear()
        for item in parse_profile_links(self.original):
            self._add_row(item, refresh=False)
        self.status.SetLabel("Reverted")
        self._refresh_geometry()
