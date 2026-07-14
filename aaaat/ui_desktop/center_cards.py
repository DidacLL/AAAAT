from __future__ import annotations

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
            control.SetMinSize((1, -1))
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
        posting = self._source_text(detail)
        pitch = self._first_text(detail, "pitch", "role_strategy")
        snapshot = self._first_text(detail, "offer_snapshot", "description")
        support = self._visible_support_blocks(
            [
                ("Ask", detail.get("smart_question")),
                ("Recognize", self._first_text(detail, "call_signals", "source_excerpt")),
                ("Avoid", detail.get("risks_to_avoid") or detail.get("risk_to_avoid")),
                ("Company", detail.get("company_research")),
                ("Fit", detail.get("candidature_evaluation")),
                ("Strategy", detail.get("role_strategy")),
                ("Evidence", detail.get("strengths")),
                ("Questions", detail.get("questions_to_ask")),
                ("Stack", detail.get("tech_stack")),
                ("Recruiter", detail.get("recruiter_material")),
            ]
        )
        if not any([posting.strip(), pitch.strip(), snapshot.strip(), support]):
            return

        panel = wx.Panel(self.owner.center_scroll)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)

        top = wx.BoxSizer(wx.HORIZONTAL)
        if posting.strip():
            top.Add(
                self._text_card(panel, "Posting", posting, emphasis="high"),
                3,
                wx.RIGHT | wx.EXPAND,
                10,
            )

        side = wx.BoxSizer(wx.VERTICAL)
        if pitch.strip():
            side.Add(self._text_card(panel, "Pitch", pitch, emphasis="medium"), 0, wx.BOTTOM | wx.EXPAND, 8)
        if snapshot.strip():
            side.Add(self._text_card(panel, "Snapshot", snapshot, emphasis="medium"), 0, wx.EXPAND, 0)
        if side.GetItemCount():
            top.Add(side, 2, wx.EXPAND)
        if top.GetItemCount():
            sizer.Add(top, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

        if support:
            support_row = wx.BoxSizer(wx.HORIZONTAL)
            columns = self._support_columns()
            column_sizers = [wx.BoxSizer(wx.VERTICAL) for _ in range(columns)]
            for index, (label, text) in enumerate(support):
                column_sizers[index % columns].Add(
                    self._text_card(panel, label, text, emphasis="support"),
                    0,
                    wx.BOTTOM | wx.EXPAND,
                    8,
                )
            for index, column in enumerate(column_sizers):
                flags = wx.EXPAND
                border = 0
                if index == 0 and columns > 1:
                    flags |= wx.RIGHT
                    border = 9
                elif index > 0:
                    flags |= wx.LEFT
                    border = 9
                support_row.Add(column, 1, flags, border)
            sizer.Add(support_row, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

        self.owner.center_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _text_card(self, parent: wx.Window, title: str, text: Any, *, emphasis: str) -> wx.Panel:
        panel = wx.Panel(parent, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)

        title_label = wx.StaticText(panel, label=title)
        title_font = title_label.GetFont().Bold()
        if emphasis == "high":
            title_font = title_font.Larger()
        title_label.SetFont(title_font)
        sizer.Add(title_label, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)

        body = wx.StaticText(panel, label=self._display_text(text))
        body.SetMinSize((1, -1))
        body_font = body.GetFont()
        if emphasis == "high":
            body_font = body_font.Larger()
        body.SetFont(body_font)
        self._bind_wrap(panel, body, 16)
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

    def _visible_support_blocks(self, specs: list[tuple[str, Any]]) -> list[tuple[str, str]]:
        visible: list[tuple[str, str]] = []
        for label, value in specs:
            text = str(value or "").strip()
            if text:
                visible.append((label, text))
        return visible

    def _support_columns(self) -> int:
        width = int(self.owner.center_scroll.GetClientSize().GetWidth() or 760)
        return 2 if width >= 620 else 1

    def _display_text(self, value: Any) -> str:
        paragraphs: list[str] = []
        for raw_line in str(value or "—").splitlines() or ["—"]:
            text = " ".join(raw_line.split())
            paragraphs.append(text)
        return "\n".join(paragraphs)

    def _bind_wrap(self, parent: wx.Window, label: wx.StaticText, padding: int) -> None:
        raw_label = label.GetLabel()
        setattr(label, "_aaaat_raw_label", raw_label)

        def apply_wrap() -> None:
            try:
                if not label or label.IsBeingDeleted():
                    return
                width = int(parent.GetClientSize().GetWidth() or 0) - padding
                if width <= 0:
                    return
                label.SetLabel(str(getattr(label, "_aaaat_raw_label", raw_label)))
                label.Wrap(width)
                label.InvalidateBestSize()
                parent.Layout()
            except RuntimeError:
                pass

        def wrap(event: wx.SizeEvent) -> None:
            apply_wrap()
            event.Skip()

        parent.Bind(wx.EVT_SIZE, wrap)
        wx.CallAfter(apply_wrap)
