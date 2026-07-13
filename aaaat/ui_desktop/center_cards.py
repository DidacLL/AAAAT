from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]
import wx.html  # type: ignore[import-not-found]


class CenterCardBuilder:
    """Build Smart View center cards and integrate explicit responsive card state."""

    def __init__(self, owner: Any) -> None:
        self.owner = owner

    def add_hero(self, detail: dict[str, Any]) -> None:
        hero = wx.Panel(self.owner.center_scroll)
        hero_sizer = wx.BoxSizer(wx.VERTICAL)
        hero.SetSizer(hero_sizer)
        company = wx.StaticText(hero, label=str(detail.get("company") or "Untitled"))
        company.SetFont(company.GetFont().Bold().Larger().Larger())
        role = wx.StaticText(hero, label=str(detail.get("role") or "Role"))
        role.SetFont(role.GetFont().Bold().Larger())
        chips = wx.StaticText(hero, label=self.owner._chips(detail))
        self._bind_wrap(hero, company, 32)
        self._bind_wrap(hero, role, 32)
        self._bind_wrap(hero, chips, 32)
        hero_sizer.Add(company, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        hero_sizer.Add(role, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        hero_sizer.Add(chips, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 8)
        self.owner.center_sizer.Add(hero, 0, wx.BOTTOM | wx.EXPAND, 8)

    def add_call_card(self, detail: dict[str, Any]) -> None:
        blocks = [
            ("Recognize", detail.get("call_signals") or detail.get("source_excerpt") or "No signal yet."),
            ("Pitch", detail.get("pitch") or "No pitch yet."),
            ("Ask", detail.get("smart_question") or "No question yet."),
            ("Watch", detail.get("risks_to_avoid") or detail.get("risk_to_avoid") or "No risk note yet."),
        ]
        summary = " · ".join(self.owner._clip(body, 46) for _heading, body in blocks[:2] if body)
        panel, body_sizer = self.card_shell("call", "Call cockpit", summary or "recognition, pitch, question, risk")
        if self.is_expanded("call", True):
            grid = wx.FlexGridSizer(rows=2, cols=2, vgap=8, hgap=12)
            grid.AddGrowableCol(0, 1)
            grid.AddGrowableCol(1, 1)
            for heading, body in blocks:
                block = wx.Panel(panel)
                block_sizer = wx.BoxSizer(wx.VERTICAL)
                block.SetSizer(block_sizer)
                label = wx.StaticText(block, label=heading)
                label.SetFont(label.GetFont().Bold())
                html_body = self.owner._html_text_window(block, str(body or "—"), min_height=72)
                html_body.SetMinSize((-1, 72))
                block_sizer.Add(label, 0, wx.BOTTOM | wx.EXPAND, 2)
                block_sizer.Add(html_body, 1, wx.EXPAND, 2)
                grid.Add(block, 1, wx.EXPAND)
            body_sizer.Add(grid, 1, wx.ALL | wx.EXPAND, 8)
        self.owner.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)
        self.bind_click(panel, "call")

    def add_source_card(self, detail: dict[str, Any]) -> None:
        source_text = str(detail.get("source_text") or "")
        source_excerpt = str(detail.get("source_excerpt") or source_text or "No source text stored yet.")
        panel, body_sizer = self.card_shell("source", "Source", source_excerpt)
        if self.is_expanded("source", False):
            heading = wx.StaticText(panel, label=f"Literal offer/source text · {len(source_text)} chars")
            heading.SetFont(heading.GetFont().Bold())
            reader = self.owner._html_text_window(panel, source_text or source_excerpt, min_height=310)
            reader.SetMinSize((-1, 310))
            self._bind_wrap(panel, heading, 24)
            body_sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
            body_sizer.Add(reader, 1, wx.ALL | wx.EXPAND, 8)
        self.owner.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)
        self.bind_click(panel, "source")

    def add_center_card(self, card_id: str, title: str, body: Any, *, expanded_by_default: bool, min_height: int) -> None:
        text = str(body or "")
        panel, body_sizer = self.card_shell(card_id, title, text or "—")
        if self.is_expanded(card_id, expanded_by_default):
            content = self.owner._html_text_window(panel, text or "—", min_height=min_height)
            content.SetMinSize((-1, min_height))
            body_sizer.Add(content, 0, wx.ALL | wx.EXPAND, 8)
        self.owner.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)
        self.bind_click(panel, card_id)

    def card_shell(self, card_id: str, title: str, summary: str) -> tuple[wx.Panel, wx.BoxSizer]:
        expanded = self.is_expanded(card_id, card_id in {"call", "now"})
        panel = wx.Panel(self.owner.center_scroll, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        header = wx.BoxSizer(wx.HORIZONTAL)
        title_label = wx.StaticText(panel, label=title)
        title_label.SetFont(title_label.GetFont().Bold().Larger())
        summary_label = wx.StaticText(panel, label=self.owner._clip(summary, 220))
        toggle_label = wx.StaticText(panel, label="▾" if expanded else "▸")
        toggle_label.SetFont(toggle_label.GetFont().Bold().Larger())
        header.Add(toggle_label, 0, wx.ALL | wx.ALIGN_TOP, 8)
        header.Add(title_label, 0, wx.TOP | wx.BOTTOM | wx.ALIGN_TOP, 8)
        header.Add(summary_label, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 8)
        sizer.Add(header, 0, wx.EXPAND)
        body_sizer = wx.BoxSizer(wx.VERTICAL)
        sizer.Add(body_sizer, 0, wx.EXPAND)
        self._bind_wrap(panel, summary_label, 240)
        self.bind_click(panel, card_id)
        return panel, body_sizer

    def is_expanded(self, card_id: str, default: bool) -> bool:
        return self.owner.center_card_state.is_expanded(card_id, default)

    def bind_click(self, window: wx.Window, card_id: str) -> None:
        if isinstance(window, wx.TextCtrl):
            return
        window.SetCursor(wx.Cursor(wx.CURSOR_HAND))

        def on_click(event: wx.Event, selected_card: str = card_id) -> None:
            self.toggle(selected_card)
            if hasattr(event, "StopPropagation"):
                event.StopPropagation()

        window.Bind(wx.EVT_LEFT_UP, on_click)
        for child in window.GetChildren():
            if isinstance(child, wx.Window):
                self.bind_click(child, card_id)

    def toggle(self, card_id: str) -> None:
        self.owner.center_card_state.toggle(card_id, False)
        self.owner.Freeze()
        try:
            self.owner._refresh_focus_modules()
            self.owner.center_scroll.Layout()
            self.owner.center_scroll.FitInside()
            self.owner.Layout()
        finally:
            self.owner.Thaw()

    def _bind_wrap(self, parent: wx.Window, label: wx.StaticText, padding: int) -> None:
        def wrap(_event: wx.SizeEvent) -> None:
            width = max(200, int(parent.GetClientSize().GetWidth() or 360) - padding)
            label.Wrap(width)
            _event.Skip()

        parent.Bind(wx.EVT_SIZE, wrap)
        label.Wrap(max(200, int(parent.GetClientSize().GetWidth() or 360) - padding))
