from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]
import wx.html  # type: ignore[import-not-found]


class CenterCardBuilder:
    """Build Smart View center cards for fast visual recall on desktop."""

    def __init__(self, owner: Any) -> None:
        self.owner = owner

    def add_hero(self, detail: dict[str, Any]) -> None:
        hero = wx.Panel(self.owner.center_scroll)
        hero_sizer = wx.BoxSizer(wx.HORIZONTAL)
        hero.SetSizer(hero_sizer)

        identity = wx.BoxSizer(wx.VERTICAL)
        company = wx.StaticText(hero, label=str(detail.get("company") or "Untitled"))
        company.SetFont(company.GetFont().Bold().Larger().Larger())
        role = wx.StaticText(hero, label=str(detail.get("role") or "Role"))
        role.SetFont(role.GetFont().Larger())
        chips = wx.StaticText(hero, label=self.owner._chips(detail))
        for control in (company, role, chips):
            self._bind_wrap(hero, control, 32)
            identity.Add(control, 0, wx.BOTTOM | wx.EXPAND, 3)
        hero_sizer.Add(identity, 1, wx.ALL | wx.EXPAND, 8)

        score_text = str(detail.get("valuation") or "").strip()
        if score_text:
            score = wx.StaticText(hero, label=f"{score_text}/100")
            score.SetFont(score.GetFont().Bold().Larger().Larger())
            hero_sizer.Add(score, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 8)

        self.owner.center_sizer.Add(hero, 0, wx.BOTTOM | wx.EXPAND, 8)

    def add_key_details(self, detail: dict[str, Any]) -> None:
        facts = [
            ("Remote", detail.get("remote_mode")),
            ("Location", detail.get("location")),
            ("Comp", detail.get("salary_expectation")),
            ("Source", detail.get("source")),
            ("Published", detail.get("publication_date")),
            ("Applied", detail.get("application_date")),
            ("Keywords", ", ".join(str(term) for term in detail.get("keywords") or [])),
        ]
        visible = [(label, str(value).strip()) for label, value in facts if str(value or "").strip()]
        if not visible:
            return
        panel = wx.Panel(self.owner.center_scroll, style=wx.BORDER_SIMPLE)
        grid = wx.FlexGridSizer(rows=0, cols=3, vgap=6, hgap=10)
        grid.AddGrowableCol(0, 1)
        grid.AddGrowableCol(1, 1)
        grid.AddGrowableCol(2, 1)
        panel.SetSizer(grid)
        for label, value in visible:
            item = wx.Panel(panel)
            item_sizer = wx.BoxSizer(wx.VERTICAL)
            item.SetSizer(item_sizer)
            title = wx.StaticText(item, label=label)
            title.SetFont(title.GetFont().Bold())
            body = wx.StaticText(item, label=self.owner._clip(value, 96))
            self._bind_wrap(item, body, 16)
            item_sizer.Add(title, 0, wx.BOTTOM | wx.EXPAND, 1)
            item_sizer.Add(body, 0, wx.EXPAND)
            grid.Add(item, 1, wx.ALL | wx.EXPAND, 8)
        self.owner.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)

    def add_interview_notes(self, detail: dict[str, Any]) -> None:
        blocks = [
            ("Recognize", detail.get("call_signals") or detail.get("source_excerpt") or ""),
            ("Pitch", detail.get("pitch") or ""),
            ("Ask", detail.get("smart_question") or ""),
            ("Avoid", detail.get("risks_to_avoid") or detail.get("risk_to_avoid") or ""),
            ("Strengths", detail.get("strengths") or ""),
            ("Questions", detail.get("questions_to_ask") or ""),
        ]
        blocks = [(heading, str(body).strip()) for heading, body in blocks if str(body or "").strip()]
        if not blocks:
            blocks = [("Notes", "No call notes yet.")]
        summary = " · ".join(self.owner._clip(body, 42) for _heading, body in blocks[:3])
        panel, body_sizer = self.card_shell("interview", "Notes", summary or "call notes")
        if self.is_expanded("interview", True):
            grid = wx.FlexGridSizer(rows=0, cols=2, vgap=8, hgap=12)
            grid.AddGrowableCol(0, 1)
            grid.AddGrowableCol(1, 1)
            for heading, body in blocks:
                block = wx.Panel(panel)
                block_sizer = wx.BoxSizer(wx.VERTICAL)
                block.SetSizer(block_sizer)
                label = wx.StaticText(block, label=heading)
                label.SetFont(label.GetFont().Bold())
                html_body = self.owner._html_text_window(block, body or "—", min_height=66)
                html_body.SetMinSize((-1, 66))
                block_sizer.Add(label, 0, wx.BOTTOM | wx.EXPAND, 2)
                block_sizer.Add(html_body, 1, wx.EXPAND, 2)
                grid.Add(block, 1, wx.EXPAND)
            body_sizer.Add(grid, 1, wx.ALL | wx.EXPAND, 8)
        self.owner.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)
        self.bind_click(panel, "interview")

    def add_source_card(self, detail: dict[str, Any]) -> None:
        source_text = str(detail.get("source_text") or "")
        source_excerpt = str(detail.get("source_excerpt") or source_text or "No source text stored yet.")
        panel, body_sizer = self.card_shell("source", "Source text", source_excerpt)
        if self.is_expanded("source", False):
            reader = self.owner._html_text_window(panel, source_text or source_excerpt, min_height=260)
            reader.SetMinSize((-1, 260))
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
        expanded = self.is_expanded(card_id, card_id == "interview")
        panel = wx.Panel(self.owner.center_scroll, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        header = wx.BoxSizer(wx.HORIZONTAL)
        toggle_label = wx.StaticText(panel, label="▾" if expanded else "▸")
        toggle_label.SetFont(toggle_label.GetFont().Bold().Larger())
        title_label = wx.StaticText(panel, label=title)
        title_label.SetFont(title_label.GetFont().Bold())
        summary_label = wx.StaticText(panel, label=self.owner._clip(summary, 260))
        header.Add(toggle_label, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        header.Add(title_label, 0, wx.TOP | wx.BOTTOM | wx.ALIGN_CENTER_VERTICAL, 6)
        header.Add(summary_label, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        sizer.Add(header, 0, wx.EXPAND)
        body_sizer = wx.BoxSizer(wx.VERTICAL)
        sizer.Add(body_sizer, 0, wx.EXPAND)
        self._bind_wrap(panel, summary_label, 220)
        return panel, body_sizer

    def is_expanded(self, card_id: str, default: bool) -> bool:
        return self.owner.center_card_state.is_expanded(card_id, default)

    def bind_click(self, window: wx.Window, card_id: str) -> None:
        if self._is_interactive(window):
            return
        window.SetCursor(wx.Cursor(wx.CURSOR_HAND))

        def on_click(event: wx.Event, selected_card: str = card_id) -> None:
            target = event.GetEventObject()
            if isinstance(target, wx.Window) and self._is_interactive(target):
                event.Skip()
                return
            if isinstance(target, wx.Window) and target.HasCapture():
                target.ReleaseMouse()
            if hasattr(event, "StopPropagation"):
                event.StopPropagation()
            wx.CallAfter(self.toggle, selected_card)

        window.Bind(wx.EVT_LEFT_UP, on_click)
        for child in window.GetChildren():
            if isinstance(child, wx.Window) and not self._is_interactive(child):
                self.bind_click(child, card_id)

    def toggle(self, card_id: str) -> None:
        if not getattr(self.owner, "center_scroll", None):
            return
        self.owner.center_card_state.toggle(card_id, False)
        self.owner.Freeze()
        try:
            self.owner._refresh_focus_modules()
            self.owner.center_scroll.Layout()
            self.owner.center_scroll.FitInside()
            self.owner.Layout()
        finally:
            self.owner.Thaw()

    def _is_interactive(self, window: wx.Window) -> bool:
        return isinstance(window, (wx.TextCtrl, wx.Button, wx.Choice, wx.html.HtmlWindow))

    def _bind_wrap(self, parent: wx.Window, label: wx.StaticText, padding: int) -> None:
        def wrap(_event: wx.SizeEvent) -> None:
            width = max(200, int(parent.GetClientSize().GetWidth() or 360) - padding)
            label.Wrap(width)
            _event.Skip()

        parent.Bind(wx.EVT_SIZE, wrap)
        label.Wrap(max(200, int(parent.GetClientSize().GetWidth() or 360) - padding))
