from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]
import wx.html  # type: ignore[import-not-found]


class CenterCardBuilder:
    """Build Smart View cards with one explicit full-surface toggle behavior."""

    INTERACTIVE_TYPES = (wx.TextCtrl, wx.Button, wx.Choice, wx.ComboBox, wx.ListBox, wx.html.HtmlWindow)

    def __init__(self, owner: Any) -> None:
        self.owner = owner

    def add_hero(self, detail: dict[str, Any]) -> None:
        hero = wx.Panel(self.owner.center_scroll)
        sizer = wx.BoxSizer(wx.VERTICAL)
        hero.SetSizer(sizer)
        company = wx.StaticText(hero, label=str(detail.get("company") or "Company"))
        company.SetFont(company.GetFont().Bold().Larger().Larger())
        role = wx.StaticText(hero, label=str(detail.get("role") or "Role"))
        role.SetFont(role.GetFont().Bold().Larger())
        chips = wx.StaticText(hero, label=self.owner._chips(detail))
        sizer.Add(company, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        sizer.Add(role, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        sizer.Add(chips, 0, wx.ALL | wx.EXPAND, 8)
        self.owner.center_sizer.Add(hero, 0, wx.BOTTOM | wx.EXPAND, 8)

    def add_call_card(self, detail: dict[str, Any]) -> None:
        blocks = [
            ("Recognize", detail.get("call_signals") or detail.get("source_excerpt") or "No signal yet."),
            ("Pitch", detail.get("pitch") or "No pitch yet."),
            ("Ask", detail.get("smart_question") or "No question yet."),
            ("Watch", detail.get("risk_to_avoid") or "No risk note yet."),
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
                text = wx.StaticText(block, label=self.owner._clip(body, 420))
                text.Wrap(360)
                block_sizer.Add(label, 0, wx.BOTTOM | wx.EXPAND, 2)
                block_sizer.Add(text, 0, wx.EXPAND, 2)
                grid.Add(block, 1, wx.EXPAND)
            body_sizer.Add(grid, 0, wx.ALL | wx.EXPAND, 8)
        self._bind_card_surface(panel, "call")
        self.owner.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)

    def add_source_card(self, detail: dict[str, Any]) -> None:
        source_text = str(detail.get("source_text") or "")
        source_excerpt = str(detail.get("source_excerpt") or source_text or "No source text stored yet.")
        panel, body_sizer = self.card_shell("source", "Source", source_excerpt)
        if self.is_expanded("source", False):
            heading = wx.StaticText(panel, label=f"Literal offer/source text · {len(source_text)} chars")
            heading.SetFont(heading.GetFont().Bold())
            text = wx.StaticText(panel, label=source_text or source_excerpt)
            text.Wrap(760)
            body_sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
            body_sizer.Add(text, 0, wx.ALL | wx.EXPAND, 8)
        self._bind_card_surface(panel, "source")
        self.owner.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)

    def add_center_card(self, card_id: str, title: str, body: Any, *, expanded_by_default: bool, min_height: int) -> None:
        text_value = str(body or "")
        panel, body_sizer = self.card_shell(card_id, title, text_value or "—")
        if self.is_expanded(card_id, expanded_by_default):
            text = wx.StaticText(panel, label=text_value or "—")
            text.Wrap(760)
            text.SetMinSize((-1, min_height))
            body_sizer.Add(text, 0, wx.ALL | wx.EXPAND, 8)
        self._bind_card_surface(panel, card_id)
        self.owner.center_sizer.Add(panel, 0, wx.BOTTOM | wx.EXPAND, 8)

    def card_shell(self, card_id: str, title: str, summary: str) -> tuple[wx.Panel, wx.BoxSizer]:
        expanded = self.is_expanded(card_id, card_id in {"call", "now"})
        panel = wx.Panel(self.owner.center_scroll, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        header = wx.Panel(panel)
        header_sizer = wx.BoxSizer(wx.HORIZONTAL)
        header.SetSizer(header_sizer)
        toggle = wx.StaticText(header, label="▾" if expanded else "▸")
        toggle.SetFont(toggle.GetFont().Bold().Larger())
        title_label = wx.StaticText(header, label=title)
        title_label.SetFont(title_label.GetFont().Bold().Larger())
        summary_label = wx.StaticText(header, label=self.owner._clip(summary, 150))
        summary_label.Wrap(700)
        header_sizer.Add(toggle, 0, wx.ALL | wx.ALIGN_TOP, 8)
        header_sizer.Add(title_label, 0, wx.TOP | wx.BOTTOM | wx.ALIGN_TOP, 8)
        header_sizer.Add(summary_label, 1, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 8)
        sizer.Add(header, 0, wx.EXPAND)
        body_sizer = wx.BoxSizer(wx.VERTICAL)
        sizer.Add(body_sizer, 0, wx.EXPAND)
        return panel, body_sizer

    def is_expanded(self, card_id: str, default: bool) -> bool:
        return self.owner.center_card_state.is_expanded(card_id, default)

    def _bind_card_surface(self, window: wx.Window, card_id: str) -> None:
        if isinstance(window, self.INTERACTIVE_TYPES):
            return
        window.SetCursor(wx.Cursor(wx.CURSOR_HAND))

        def on_click(event: wx.MouseEvent, selected_card: str = card_id) -> None:
            self.toggle(selected_card)
            event.Skip(False)

        window.Bind(wx.EVT_LEFT_UP, on_click)
        for child in window.GetChildren():
            self._bind_card_surface(child, card_id)

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
