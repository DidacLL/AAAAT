from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

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
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_save = on_save
        self.on_delete = on_delete
        self.on_cancel = on_cancel
        self.on_open_smart = on_open_smart
        self._current_ref: str | None = None
        self._original_values: dict[str, str] = {}
        self._field_storage_keys: dict[str, str | None] = {}
        self._controls: dict[str, wx.TextCtrl] = {}
        self._editing = False
        self._projection: dict[str, Any] = {}
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)
        self.Bind(wx.EVT_SIZE, self._on_size)

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
                self._fit_width()
                bind_parent_wheel_scroll(self, self)
                return

            self._current_ref = str(selected.get("ref") or "")
            title = wx.StaticText(self, label=str(selected.get("company") or "Untitled Company"))
            title.SetFont(title.GetFont().Bold().Larger().Larger())
            role = wx.StaticText(self, label=str(selected.get("role") or "Untitled Role"))
            role.SetFont(role.GetFont().Bold().Larger())
            self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
            self.sizer.Add(role, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)

            self._add_actions()
            for group in grouped_detail_fields(projection):
                writable = [field for field in group.get("fields") or [] if field.get("storage_key")]
                if writable:
                    self._add_group(str(group.get("title") or "Details"), writable)

            self._fit_width()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

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

    def _add_group(self, title: str, fields: list[dict[str, Any]]) -> None:
        heading = wx.StaticText(self, label=title)
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 12)
        grid = wx.FlexGridSizer(cols=2, vgap=8, hgap=18)
        grid.AddGrowableCol(0, 1)
        grid.AddGrowableCol(1, 1)
        for field in fields:
            key = str(field.get("key") or "")
            label = str(field.get("label") or key)
            value = str(field.get("value") or "")
            storage_key = str(field.get("storage_key") or "")
            self._field_storage_keys[key] = storage_key
            self._original_values[key] = value
            multiline = bool(field.get("multiline"))
            container = self._field_container(key, label, value, multiline=multiline)
            grid.Add(container, 1 if multiline else 0, wx.EXPAND)
            if multiline:
                grid.Add((0, 0))
        self.sizer.Add(grid, 0, wx.ALL | wx.EXPAND, 12)

    def _field_container(self, key: str, label: str, value: str, *, multiline: bool) -> wx.Panel:
        panel = wx.Panel(self)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        heading = wx.StaticText(panel, label=label)
        heading.SetFont(heading.GetFont().Bold())
        sizer.Add(heading, 0, wx.BOTTOM | wx.EXPAND, 3)
        if self._editing:
            style = wx.TE_MULTILINE if multiline else 0
            editor = wx.TextCtrl(panel, value=value, style=style)
            if multiline:
                height = 150 if key in {"company_research", "form_answers", "offer_snapshot"} else 96
                editor.SetMinSize((-1, height))
            self._controls[key] = editor
            sizer.Add(editor, 1 if multiline else 0, wx.EXPAND)
        else:
            body = wx.StaticText(panel, label=value or "—")
            body.Wrap(max(180, self.GetClientSize().GetWidth() // 2 - 42))
            sizer.Add(body, 0, wx.EXPAND)
        return panel

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="No candidature selected")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="Select a row to inspect a candidature.")
        self.sizer.Add(title, 0, wx.ALL, 12)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)

    def _on_size(self, event: wx.SizeEvent) -> None:
        self._fit_width()
        event.Skip()

    def _fit_width(self) -> None:
        width = max(1, self.GetClientSize().GetWidth())
        wrap_width = max(180, width // 2 - 42)
        for child in self.GetChildren():
            if isinstance(child, wx.StaticText):
                child.Wrap(max(180, width - 28))
            elif isinstance(child, wx.Panel):
                for nested in child.GetChildren():
                    if isinstance(nested, wx.StaticText):
                        nested.Wrap(wrap_width)
        self.Layout()
        height = max(self.GetClientSize().GetHeight(), self.GetBestVirtualSize().GetHeight())
        self.SetVirtualSize((width, height))

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
