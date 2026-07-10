from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

EditableSaveCallback = Callable[[str, dict[str, str]], None]


class DetailPanel(wx.ScrolledWindow):
    """Editable selected-row review panel for the desktop Detailed View."""

    EDITABLE_FIELDS = [
        ("company", "Company", False),
        ("role", "Role", False),
        ("status", "Status", False),
        ("priority", "Priority", False),
        ("location", "Location", False),
        ("remote_mode", "Remote", False),
        ("source", "Source", False),
        ("source_url", "Source URL", False),
        ("next_action", "Next action", True),
        ("notes", "Notes", True),
    ]

    READ_ONLY_FIELDS = [
        ("last_contact", "Last activity"),
        ("keywords", "Keywords"),
        ("artifacts_state", "Artifacts"),
        ("created_at", "Created"),
        ("updated_at", "Updated"),
    ]

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save: EditableSaveCallback,
        on_cancel: Callable[[], None],
        on_open_smart: Callable[[], None],
    ) -> None:
        super().__init__(parent)
        self.on_save = on_save
        self.on_cancel = on_cancel
        self.on_open_smart = on_open_smart
        self._current_ref: str | None = None
        self._original_values: dict[str, str] = {}
        self._controls: dict[str, wx.TextCtrl] = {}
        self.SetScrollRate(8, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)

    def render(self, detailed: dict[str, Any], *, note_body: str, can_edit: bool) -> None:
        self.sizer.Clear(delete_windows=True)
        self._controls = {}
        self._original_values = {}
        selected = detailed.get("selected_row")
        if not selected:
            self._current_ref = None
            self._add_empty()
            self.Layout()
            self.FitInside()
            return

        self._current_ref = str(selected.get("ref") or "")
        title = wx.StaticText(self, label=str(selected.get("company") or "Untitled Company"))
        title.SetFont(title.GetFont().Bold().Larger().Larger())
        role = wx.StaticText(self, label=str(selected.get("role") or "Untitled Role"))
        role.SetFont(role.GetFont().Bold().Larger())
        self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(role, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)

        self._add_actions(can_edit)
        self._add_editable_fields(selected, note_body=note_body, can_edit=can_edit)
        self._add_read_only_context(selected, detailed)

        self.Layout()
        self.FitInside()

    def _add_actions(self, can_edit: bool) -> None:
        actions = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(self, label="Save")
        cancel = wx.Button(self, label="Cancel/Revert")
        open_smart = wx.Button(self, label="Open in Smart View")
        save.Enable(can_edit)
        cancel.Enable(can_edit)
        save.Bind(wx.EVT_BUTTON, self._on_save)
        cancel.Bind(wx.EVT_BUTTON, self._on_cancel)
        open_smart.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_smart())
        for control in (save, cancel, open_smart):
            actions.Add(control, 0, wx.ALL | wx.EXPAND, 4)
        self.sizer.Add(actions, 0, wx.ALL | wx.EXPAND, 6)

    def _add_editable_fields(self, selected: dict[str, Any], *, note_body: str, can_edit: bool) -> None:
        heading = wx.StaticText(self, label="Editable fields")
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        for key, label, multiline in self.EDITABLE_FIELDS:
            value = note_body if key == "notes" else self._value(selected.get(key))
            self._original_values[key] = value
            self._add_editor(key, label, value, multiline=multiline, can_edit=can_edit)

    def _add_read_only_context(self, selected: dict[str, Any], detailed: dict[str, Any]) -> None:
        heading = wx.StaticText(self, label="Read-only context")
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        for key, label in self.READ_ONLY_FIELDS:
            self._add_field(label, self._value(selected.get(key)))
        actions = detailed.get("toolbox_actions") or []
        if actions:
            labels = ", ".join(str(action.get("label") or action.get("id") or "Action") for action in actions)
            self._add_field("Review actions", f"{labels}. These are planned actions; this slice only saves supported local fields.")
        queue = detailed.get("task_queue_summary") or {}
        self._add_field("Task queue", f"{queue.get('count', 0)} pending/review items")

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="No candidature selected")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="Select a row to inspect and edit supported fields.")
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
            editor.SetMinSize((-1, 72 if key == "next_action" else 120))
        self._controls[key] = editor
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(editor, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _add_field(self, label: str, value: str) -> None:
        heading = wx.StaticText(self, label=label)
        heading.SetFont(heading.GetFont().Bold())
        body = wx.StaticText(self, label=value or "—")
        body.Wrap(310)
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _on_save(self, _event: wx.CommandEvent) -> None:
        if not self._current_ref:
            return
        changes: dict[str, str] = {}
        for key, control in self._controls.items():
            value = control.GetValue()
            if value != self._original_values.get(key, ""):
                changes[key] = value
        if changes:
            self.on_save(self._current_ref, changes)

    def _on_cancel(self, _event: wx.CommandEvent) -> None:
        for key, control in self._controls.items():
            control.SetValue(self._original_values.get(key, ""))
        self.on_cancel()

    def _value(self, value: Any) -> str:
        if isinstance(value, list):
            return " ".join(f"#{item}" for item in value if str(item).strip())
        return str(value or "")
