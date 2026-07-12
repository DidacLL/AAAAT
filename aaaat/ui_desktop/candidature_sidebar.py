from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from .candidature_actions import add_candidature_actions
from .scrolling import bind_parent_wheel_scroll


class CandidatureSidebar(wx.ScrolledWindow):
    """Persistent right-side context and assistance surface for one candidature."""

    def __init__(self, parent: wx.Window, *, on_action: Callable[[str], None]) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.on_action = on_action
        self.SetScrollRate(0, 12)
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.sizer)
        self.Bind(wx.EVT_SIZE, self._on_size)

    def render(self, detail: dict[str, Any] | None) -> None:
        self.Freeze()
        try:
            self.sizer.Clear(delete_windows=True)
            if not detail:
                message = wx.StaticText(self, label="Select a candidature to see context and assistance.")
                self._wrap(message)
                self.sizer.Add(message, 0, wx.ALL | wx.EXPAND, 12)
            else:
                add_candidature_actions(self, self.sizer, self.on_action, compact=False)
                self._add_summary("Keywords", ", ".join(str(item) for item in detail.get("keywords") or []) or "No keywords yet.")
                self._add_summary("Company research", str(detail.get("company_research") or "No company research yet."))
                self._add_summary("Artifacts", self._artifact_summary(detail))
            self._fit_width()
            bind_parent_wheel_scroll(self, self)
        finally:
            self.Thaw()

    def _add_summary(self, title: str, body: str) -> None:
        panel = wx.Panel(self, style=wx.BORDER_SIMPLE)
        root = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(root)
        heading = wx.StaticText(panel, label=title)
        heading.SetFont(heading.GetFont().Bold())
        text = wx.StaticText(panel, label=body or "—")
        self._wrap(text)
        root.Add(heading, 0, wx.ALL | wx.EXPAND, 8)
        root.Add(text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        self.sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _on_size(self, event: wx.SizeEvent) -> None:
        self._fit_width()
        event.Skip()

    def _wrap(self, label: wx.StaticText) -> None:
        label.Wrap(max(180, self.GetClientSize().GetWidth() - 28))

    def _fit_width(self) -> None:
        width = max(1, self.GetClientSize().GetWidth())
        for child in self.GetChildren():
            if isinstance(child, wx.StaticText):
                self._wrap(child)
            elif isinstance(child, wx.Panel):
                child.SetMinSize((max(1, width - 16), -1))
                for nested in child.GetChildren():
                    if isinstance(nested, wx.StaticText):
                        nested.Wrap(max(160, width - 40))
        self.Layout()
        height = max(self.GetClientSize().GetHeight(), self.GetBestVirtualSize().GetHeight())
        self.SetVirtualSize((width, height))

    @staticmethod
    def _artifact_summary(detail: dict[str, Any]) -> str:
        artifacts = detail.get("artifacts") or []
        if not artifacts:
            return "No artifacts yet."
        labels = []
        for item in artifacts[:6]:
            if isinstance(item, dict):
                labels.append(str(item.get("label") or item.get("artifact_type") or "Artifact"))
            else:
                labels.append(str(item))
        return "\n".join(labels)
