from __future__ import annotations

import textwrap
from typing import Any

import wx  # type: ignore[import-not-found]


class CenterCardBuilder:
    """Build Smart View center content for fast visual recall on desktop."""

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
        controls: list[wx.StaticText] = [company, role]

        logistics = self._logistics_text(detail)
        if logistics:
            controls.append(wx.StaticText(hero, label=logistics))

        for control in controls:
            self._bind_wrap(hero, control, 32)
            identity.Add(control, 0, wx.BOTTOM | wx.EXPAND, 3)
        hero_sizer.Add(identity, 1, wx.ALL | wx.EXPAND, 8)

        score_text = str(detail.get("valuation") or "").strip()
        if score_text:
            score = wx.StaticText(hero, label=f"{score_text}/100")
            score.SetFont(score.GetFont().Bold().Larger().Larger())
            hero_sizer.Add(score, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 8)

        self.owner.center_sizer.Add(hero, 0, wx.BOTTOM | wx.EXPAND, 6)

    def add_key_details(self, detail: dict[str, Any]) -> None:
        self.add_visible_briefing(detail)

    def add_interview_notes(self, _detail: dict[str, Any]) -> None:
        return

    def add_source_card(self, _detail: dict[str, Any]) -> None:
        return

    def add_visible_briefing(self, detail: dict[str, Any]) -> None:
        cards = self._call_cards(detail)
        if not cards:
            return

        panel = wx.Panel(self.owner.center_scroll)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)

        primary = [card for card in cards if card["importance"] in {"high", "medium"}]
        support = [card for card in cards if card["importance"] == "support"]

        if primary:
            top = wx.BoxSizer(wx.HORIZONTAL)
            top.Add(self._text_card(panel, **primary[0]), 3, wx.RIGHT | wx.EXPAND, 12)

            side = wx.BoxSizer(wx.VERTICAL)
            for card in primary[1:]:
                side.Add(self._text_card(panel, **card), 0, wx.BOTTOM | wx.EXPAND, 8)
            if side.GetItemCount():
                top.Add(side, 2, wx.EXPAND)
            sizer.Add(top, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

        if support:
            support_row = wx.BoxSizer(wx.HORIZONTAL)
            left_col = wx.BoxSizer(wx.VERTICAL)
            right_col = wx.BoxSizer(wx.VERTICAL)
            for index, card in enumerate(support):
                target_col = left_col if index % 2 == 0 else right_col
                target_col.Add(self._text_card(panel, **card), 0, wx.BOTTOM | wx.EXPAND, 8)
            support_row.Add(left_col, 1, wx.RIGHT | wx.EXPAND, 9)
            support_row.Add(right_col, 1, wx.LEFT | wx.EXPAND, 9)
            sizer.Add(support_row, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

        self.owner.center_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _call_cards(self, detail: dict[str, Any]) -> list[dict[str, Any]]:
        specs = [
            {
                "title": "Posting",
                "text": self._source_text(detail),
                "importance": "high",
                "line_chars": 86,
            },
            {
                "title": "Pitch",
                "text": self._first_text(detail, "pitch", "role_strategy"),
                "importance": "high",
                "line_chars": 58,
            },
            {
                "title": "Snapshot",
                "text": self._first_text(detail, "offer_snapshot", "description"),
                "importance": "medium",
                "line_chars": 58,
            },
            {
                "title": "Ask",
                "text": detail.get("smart_question"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Recognize",
                "text": self._first_text(detail, "call_signals", "source_excerpt"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Avoid",
                "text": detail.get("risks_to_avoid") or detail.get("risk_to_avoid"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Fit",
                "text": detail.get("candidature_evaluation"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Strategy",
                "text": detail.get("role_strategy"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Company",
                "text": detail.get("company_research"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Evidence",
                "text": detail.get("strengths"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Questions",
                "text": detail.get("questions_to_ask"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Stack",
                "text": detail.get("tech_stack"),
                "importance": "support",
                "line_chars": 52,
            },
            {
                "title": "Recruiter",
                "text": detail.get("recruiter_material"),
                "importance": "support",
                "line_chars": 52,
            },
        ]
        return [spec for spec in specs if str(spec.get("text") or "").strip()]

    def _text_card(self, parent: wx.Window, *, title: str, text: Any, importance: str, line_chars: int) -> wx.Panel:
        panel = wx.Panel(parent, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)

        title_label = wx.StaticText(panel, label=title)
        title_font = title_label.GetFont().Bold()
        if importance == "high":
            title_font = title_font.Larger()
        title_label.SetFont(title_font)
        sizer.Add(title_label, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)

        body = wx.StaticText(panel, label=self._wrapped_text(text, line_chars=line_chars))
        body_font = body.GetFont()
        if importance == "high":
            body_font = body_font.Larger()
        body.SetFont(body_font)
        sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        return panel

    def _first_text(self, detail: dict[str, Any], *keys: str) -> str:
        for key in keys:
            text = str(detail.get(key) or "").strip()
            if text:
                return text
        return ""

    def _source_text(self, detail: dict[str, Any]) -> str:
        return self._first_text(detail, "source_text", "source_excerpt", "description")

    def _logistics_text(self, detail: dict[str, Any]) -> str:
        parts = [
            str(detail.get("remote_mode") or "").strip(),
            str(detail.get("location") or "").strip(),
            str(detail.get("salary_expectation") or "").strip(),
        ]
        return " · ".join(part for part in parts if part)

    def _wrapped_text(self, value: Any, *, line_chars: int) -> str:
        lines: list[str] = []
        for raw_line in str(value or "—").splitlines() or ["—"]:
            text = " ".join(raw_line.split())
            if not text:
                lines.append("")
                continue
            wrapped = textwrap.wrap(text, width=line_chars, break_long_words=True, break_on_hyphens=False) or [text]
            lines.extend(wrapped)
        return "\n".join(lines)

    def _bind_wrap(self, parent: wx.Window, label: wx.StaticText, padding: int) -> None:
        def apply_wrap() -> None:
            try:
                if label and not label.IsBeingDeleted():
                    width = max(180, int(parent.GetClientSize().GetWidth() or 360) - padding)
                    label.Wrap(width)
                    parent.Layout()
            except RuntimeError:
                pass

        def wrap(event: wx.SizeEvent) -> None:
            apply_wrap()
            event.Skip()

        parent.Bind(wx.EVT_SIZE, wrap)
        wx.CallAfter(apply_wrap)
