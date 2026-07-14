from __future__ import annotations

import textwrap
from typing import Any

import wx  # type: ignore[import-not-found]
import wx.html  # type: ignore[import-not-found]


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
        sizer = wx.WrapSizer(wx.HORIZONTAL)
        panel.SetSizer(sizer)

        for card in cards:
            sizer.Add(self._call_card(panel, **card), 0, wx.ALL, 5)

        self.owner.center_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _call_cards(self, detail: dict[str, Any]) -> list[dict[str, Any]]:
        specs = [
            {
                "card_id": "smart_posting",
                "title": "Posting",
                "text": self._source_text(detail),
                "importance": "high",
                "line_chars": 76,
                "preview_lines": 5,
                "expanded_height": 280,
            },
            {
                "card_id": "smart_pitch",
                "title": "Pitch",
                "text": self._first_text(detail, "pitch", "role_strategy"),
                "importance": "high",
                "line_chars": 58,
                "preview_lines": 4,
                "expanded_height": 180,
            },
            {
                "card_id": "smart_snapshot",
                "title": "Snapshot",
                "text": self._first_text(detail, "offer_snapshot", "description"),
                "importance": "medium",
                "line_chars": 58,
                "preview_lines": 4,
                "expanded_height": 180,
            },
            {
                "card_id": "smart_ask",
                "title": "Ask",
                "text": detail.get("smart_question"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 150,
            },
            {
                "card_id": "smart_recognize",
                "title": "Recognize",
                "text": self._first_text(detail, "call_signals", "source_excerpt"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 150,
            },
            {
                "card_id": "smart_avoid",
                "title": "Avoid",
                "text": detail.get("risks_to_avoid") or detail.get("risk_to_avoid"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 150,
            },
            {
                "card_id": "smart_fit",
                "title": "Fit",
                "text": detail.get("candidature_evaluation"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 170,
            },
            {
                "card_id": "smart_strategy",
                "title": "Strategy",
                "text": detail.get("role_strategy"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 170,
            },
            {
                "card_id": "smart_company",
                "title": "Company",
                "text": detail.get("company_research"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 190,
            },
            {
                "card_id": "smart_evidence",
                "title": "Evidence",
                "text": detail.get("strengths"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 150,
            },
            {
                "card_id": "smart_questions",
                "title": "Questions",
                "text": detail.get("questions_to_ask"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 150,
            },
            {
                "card_id": "smart_stack",
                "title": "Stack",
                "text": detail.get("tech_stack"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 140,
            },
            {
                "card_id": "smart_recruiter",
                "title": "Recruiter",
                "text": detail.get("recruiter_material"),
                "importance": "support",
                "line_chars": 44,
                "preview_lines": 3,
                "expanded_height": 170,
            },
        ]
        return [spec for spec in specs if str(spec.get("text") or "").strip()]

    def _call_card(
        self,
        parent: wx.Window,
        *,
        card_id: str,
        title: str,
        text: Any,
        importance: str,
        line_chars: int,
        preview_lines: int,
        expanded_height: int,
    ) -> wx.Panel:
        value = str(text or "").strip()
        expanded = self.is_expanded(card_id, False)
        lines = self._wrapped_lines(value, line_chars=line_chars)
        has_more = len(lines) > preview_lines

        panel = wx.Panel(parent, style=wx.BORDER_SIMPLE if has_more or expanded else 0)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)

        header = wx.Panel(panel)
        header_sizer = wx.BoxSizer(wx.HORIZONTAL)
        header.SetSizer(header_sizer)
        marker = "▾" if expanded else "▸" if has_more else ""
        if marker:
            marker_label = wx.StaticText(header, label=marker)
            marker_label.SetFont(marker_label.GetFont().Bold())
            header_sizer.Add(marker_label, 0, wx.RIGHT | wx.ALIGN_CENTER_VERTICAL, 4)
        title_label = wx.StaticText(header, label=title)
        title_font = title_label.GetFont().Bold()
        if importance == "high":
            title_font = title_font.Larger()
        title_label.SetFont(title_font)
        header_sizer.Add(title_label, 0, wx.ALIGN_CENTER_VERTICAL)
        header_sizer.AddStretchSpacer(1)
        sizer.Add(header, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 5)

        if expanded:
            content = self.owner._html_text_window(panel, value or "—", min_height=expanded_height, scrollable=True)
            sizer.Add(content, 0, wx.ALL | wx.EXPAND, 5)
        else:
            visible_lines = lines if not has_more else lines[:preview_lines]
            if has_more:
                visible_lines[-1] = visible_lines[-1].rstrip(" …") + "…"
            body = wx.StaticText(panel, label="\n".join(visible_lines) or "—")
            body_font = body.GetFont()
            if importance == "high":
                body_font = body_font.Larger()
            body.SetFont(body_font)
            sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 5)

        if has_more:
            self.bind_click(panel, card_id)
        return panel

    def is_expanded(self, card_id: str, default: bool) -> bool:
        return self.owner.center_card_state.is_expanded(card_id, default)

    def bind_click(self, window: wx.Window, card_id: str) -> None:
        if self._is_control(window):
            return
        window.SetCursor(wx.Cursor(wx.CURSOR_HAND))

        def on_click(event: wx.Event, selected_card: str = card_id) -> None:
            target = event.GetEventObject()
            if isinstance(target, wx.Window) and self._is_control(target):
                event.Skip()
                return
            if isinstance(target, wx.Window) and target.HasCapture():
                target.ReleaseMouse()
            if hasattr(event, "StopPropagation"):
                event.StopPropagation()
            if isinstance(target, wx.html.HtmlWindow):
                wx.CallLater(75, self._toggle_after_html_link_check, target, selected_card)
            else:
                wx.CallAfter(self.toggle, selected_card)

        window.Bind(wx.EVT_LEFT_UP, on_click)
        for child in window.GetChildren():
            if isinstance(child, wx.Window) and not self._is_control(child):
                self.bind_click(child, card_id)

    def _toggle_after_html_link_check(self, target: wx.html.HtmlWindow, card_id: str) -> None:
        if bool(getattr(target, "_aaaat_link_activated", False)):
            return
        self.toggle(card_id)

    def toggle(self, card_id: str) -> None:
        if not getattr(self.owner, "center_scroll", None):
            return
        self.owner.center_card_state.toggle(card_id, False)
        self.owner.Freeze()
        try:
            self.owner._refresh_focus_modules()
            if hasattr(self.owner, "_fit_center_scroll"):
                self.owner._fit_center_scroll()
            else:
                self.owner.center_scroll.Layout()
                self.owner.center_scroll.FitInside()
            self.owner.Layout()
        finally:
            self.owner.Thaw()

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

    def _wrapped_lines(self, value: str, *, line_chars: int) -> list[str]:
        text = " ".join(str(value or "").split())
        if not text:
            return ["—"]
        return textwrap.wrap(text, width=line_chars, break_long_words=False, break_on_hyphens=False) or [text]

    def _is_control(self, window: wx.Window) -> bool:
        return isinstance(window, (wx.TextCtrl, wx.Button, wx.Choice))

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
