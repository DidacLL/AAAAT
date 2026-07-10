from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]


class DetailPanel(wx.ScrolledWindow):
    """Selected-row review panel for the desktop Detailed View."""

    FIELD_ORDER = [
        ("status", "Status"),
        ("priority", "Priority"),
        ("next_action", "Next action"),
        ("last_contact", "Last activity"),
        ("source", "Source"),
        ("source_url", "Source URL"),
        ("location", "Location"),
        ("remote_mode", "Remote"),
        ("keywords", "Keywords"),
        ("artifacts_state", "Artifacts"),
        ("notes_excerpt", "Notes"),
        ("created_at", "Created"),
        ("updated_at", "Updated"),
    ]

    def __init__(self, parent: wx.Window, *, on_open_smart: Callable[[], None]) -> None:
        super().__init__(parent)
        self.on_open_smart = on_open_smart
        self.SetScrollRate(8, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)

    def render(self, detailed: dict[str, Any]) -> None:
        self.sizer.Clear(delete_windows=True)
        selected = detailed.get("selected_row")
        if not selected:
            self._add_empty()
            self.Layout()
            self.FitInside()
            return

        title = wx.StaticText(self, label=str(selected.get("company") or "Untitled Company"))
        title.SetFont(title.GetFont().Bold().Larger().Larger())
        role = wx.StaticText(self, label=str(selected.get("role") or "Untitled Role"))
        role.SetFont(role.GetFont().Bold().Larger())
        self.sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(role, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)

        open_smart = wx.Button(self, label="Open in Smart View")
        open_smart.Bind(wx.EVT_BUTTON, lambda _event: self.on_open_smart())
        self.sizer.Add(open_smart, 0, wx.ALL | wx.EXPAND, 10)

        for key, label in self.FIELD_ORDER:
            self._add_field(label, self._value(selected.get(key)))

        actions = detailed.get("toolbox_actions") or []
        if actions:
            heading = wx.StaticText(self, label="Review actions")
            heading.SetFont(heading.GetFont().Bold().Larger())
            self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
            for action in actions:
                self._add_field(str(action.get("label") or action.get("id") or "Action"), "Planned action; no desktop mutation in this foundation slice.")

        queue = detailed.get("task_queue_summary") or {}
        self._add_field("Task queue", f"{queue.get('count', 0)} pending/review items")

        self.Layout()
        self.FitInside()

    def _add_empty(self) -> None:
        title = wx.StaticText(self, label="No candidature selected")
        title.SetFont(title.GetFont().Bold().Larger())
        body = wx.StaticText(self, label="Select a row to inspect its structured fields.")
        body.Wrap(300)
        self.sizer.Add(title, 0, wx.ALL | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _add_field(self, label: str, value: str) -> None:
        heading = wx.StaticText(self, label=label)
        heading.SetFont(heading.GetFont().Bold())
        body = wx.StaticText(self, label=value or "—")
        body.Wrap(310)
        self.sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _value(self, value: Any) -> str:
        if isinstance(value, list):
            return " ".join(f"#{item}" for item in value if str(item).strip())
        return str(value or "")
