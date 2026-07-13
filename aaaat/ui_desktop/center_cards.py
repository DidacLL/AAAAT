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
        hero.SetMinSize((1, -1))
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
            logistics_label = wx.StaticText(hero, label=logistics)
            controls.append(logistics_label)

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

    def add_source_card(self, detail: dict[str, Any]) -> None:
        self.add_full_text_drawers(detail)

    def add_visible_briefing(self, detail: dict[str, Any]) -> None:
        pitch = self._first_text(detail, "pitch", "role_strategy")
        snapshot = self._first_text(detail, "offer_snapshot", "description")
        support = self._visible_support_blocks(
            [
                ("Ask", detail.get("smart_question")),
                ("Avoid", detail.get("risks_to_avoid") or detail.get("risk_to_avoid")),
                ("Recognize", self._first_text(detail, "call_signals", "source_excerpt")),
                ("Company", detail.get("company_research")),
                ("Fit", detail.get("candidature_evaluation")),
                ("Strategy", detail.get("role_strategy")),
                ("Evidence", detail.get("strengths")),
                ("Questions", detail.get("questions_to_ask")),
                ("Stack", detail.get("tech_stack")),
                ("Recruiter", detail.get("recruiter_material")),
            ]
        )
        if not any([pitch.strip(), snapshot.strip(), support]):
            return

        panel = wx.Panel(self.owner.center_scroll)
        panel.SetMinSize((1, -1))
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)

        top = wx.BoxSizer(wx.HORIZONTAL)
        if pitch.strip():
            top.Add(
                self._call_block(panel, "Pitch", pitch, min_height=74, emphasis="high", line_chars=68),
                1,
                wx.RIGHT | wx.EXPAND,
                12,
            )
        if snapshot.strip():
            top.Add(
                self._call_block(panel, "Snapshot", snapshot, min_height=74, emphasis="medium", line_chars=68),
                1,
                wx.EXPAND,
            )
        if top.GetItemCount():
            sizer.Add(top, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

        if support:
            grid_panel = wx.Panel(panel)
            grid_panel.SetMinSize((1, -1))
            columns = self._support_columns()
            grid = wx.FlexGridSizer(rows=0, cols=columns, vgap=8, hgap=18)
            for col in range(columns):
                grid.AddGrowableCol(col, 1)
            grid_panel.SetSizer(grid)
            for label, text in support:
                grid.Add(
                    self._call_block(grid_panel, label, text, min_height=54, emphasis="support", line_chars=54),
                    1,
                    wx.EXPAND,
                )
            sizer.Add(grid_panel, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 8)

        self.owner.center_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def add_full_text_drawers(self, detail: dict[str, Any]) -> None:
        drawers = [
            ("original", "Original posting", self._source_text(detail), False, 260),
            ("description", "Published role text", detail.get("description"), False, 220),
            ("snapshot_full", "Role snapshot", detail.get("offer_snapshot"), False, 180),
            ("signals", "Recognition signals", detail.get("call_signals"), False, 170),
            ("pitch_full", "Pitch", detail.get("pitch"), False, 170),
            ("questions", "Questions", detail.get("questions_to_ask") or detail.get("smart_question"), False, 170),
            ("risks", "Risks to avoid", detail.get("risks_to_avoid") or detail.get("risk_to_avoid"), False, 170),
            ("strengths", "Evidence", detail.get("strengths"), False, 170),
            ("company_full", "Company context", detail.get("company_research"), False, 200),
            ("fit_full", "Fit assessment", detail.get("candidature_evaluation"), False, 180),
            ("strategy_full", "Application strategy", detail.get("role_strategy"), False, 180),
            ("recruiter_full", "Recruiter material", detail.get("recruiter_material"), False, 180),
            ("stack_full", "Stack", detail.get("tech_stack"), False, 150),
        ]
        visible = [
            (card_id, title, str(body).strip(), expanded, min_height)
            for card_id, title, body, expanded, min_height in drawers
            if str(body or "").strip()
        ]
        if not visible:
            return
        panel = wx.Panel(self.owner.center_scroll)
        panel.SetMinSize((1, -1))
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        for card_id, title, text, expanded, min_height in visible:
            sizer.Add(
                self.build_center_card(panel, card_id, title, text, expanded_by_default=expanded, min_height=min_height),
                0,
                wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND,
                4,
            )
        self.owner.center_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)

    def _call_block(
        self,
        parent: wx.Window,
        label: str,
        value: str,
        *,
        min_height: int,
        emphasis: str,
        line_chars: int,
    ) -> wx.Panel:
        block = wx.Panel(parent)
        block.SetMinSize((1, min_height))
        sizer = wx.BoxSizer(wx.VERTICAL)
        block.SetSizer(sizer)

        title = wx.StaticText(block, label=label)
        title_font = title.GetFont().Bold()
        if emphasis == "high":
            title_font = title_font.Larger()
        title.SetFont(title_font)

        body = wx.StaticText(block, label=self._complete_visible_text(value, line_chars=line_chars))
        body.SetMinSize((1, -1))
        body_font = body.GetFont()
        if emphasis == "high":
            body_font = body_font.Larger()
        body.SetFont(body_font)

        sizer.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 4)
        sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)
        return block

    def build_center_card(self, parent: wx.Window, card_id: str, title: str, body: Any, *, expanded_by_default: bool, min_height: int) -> wx.Panel:
        text = str(body or "")
        expanded = self.is_expanded(card_id, expanded_by_default)
        panel = wx.Panel(parent, style=wx.BORDER_SIMPLE)
        panel.SetMinSize((1, -1))
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)

        header = wx.Panel(panel)
        header_sizer = wx.BoxSizer(wx.HORIZONTAL)
        header.SetSizer(header_sizer)
        toggle_label = wx.StaticText(header, label="▾" if expanded else "▸")
        toggle_label.SetFont(toggle_label.GetFont().Bold().Larger())
        title_label = wx.StaticText(header, label=title)
        title_label.SetFont(title_label.GetFont().Bold())
        header_sizer.Add(toggle_label, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        header_sizer.Add(title_label, 0, wx.TOP | wx.BOTTOM | wx.ALIGN_CENTER_VERTICAL, 6)
        header_sizer.AddStretchSpacer(1)
        sizer.Add(header, 0, wx.EXPAND)
        self.bind_click(header, card_id)

        if expanded:
            content = self.owner._html_text_window(panel, text or "—", min_height=min_height, scrollable=True)
            content.SetMinSize((1, min_height))
            sizer.Add(content, 0, wx.ALL | wx.EXPAND, 8)
        return panel

    def add_center_card(self, card_id: str, title: str, body: Any, *, expanded_by_default: bool, min_height: int) -> None:
        card = self.build_center_card(self.owner.center_scroll, card_id, title, body, expanded_by_default=expanded_by_default, min_height=min_height)
        self.owner.center_sizer.Add(card, 0, wx.BOTTOM | wx.EXPAND, 8)

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

    def _complete_visible_text(self, value: str, *, line_chars: int) -> str:
        text = " ".join(str(value or "").split())
        if not text:
            return "—"
        return "\n".join(textwrap.wrap(text, width=line_chars, break_long_words=False, break_on_hyphens=False))

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
