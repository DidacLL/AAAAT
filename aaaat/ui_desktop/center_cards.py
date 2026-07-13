from __future__ import annotations

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

        self.owner.center_sizer.Add(hero, 0, wx.BOTTOM | wx.EXPAND, 6)

    def add_key_details(self, detail: dict[str, Any]) -> None:
        self.add_visible_briefing(detail)

    def add_interview_notes(self, _detail: dict[str, Any]) -> None:
        return

    def add_source_card(self, detail: dict[str, Any]) -> None:
        self.add_full_text_drawers(detail)

    def add_visible_briefing(self, detail: dict[str, Any]) -> None:
        rows = [
            (
                "At a glance",
                [
                    ("Status", detail.get("status"), 60, 48),
                    ("Priority", detail.get("priority"), 60, 48),
                    ("Remote", detail.get("remote_mode"), 80, 48),
                    ("Location", detail.get("location"), 80, 48),
                    ("Comp", detail.get("salary_expectation"), 100, 48),
                    ("Published", detail.get("publication_date"), 80, 48),
                    ("Applied", detail.get("application_date"), 80, 48),
                    ("Source", detail.get("source"), 110, 48),
                    ("Artifacts", detail.get("artifacts_state"), 80, 48),
                ],
                4,
            ),
            (
                "During the call",
                [
                    ("Recognize", detail.get("call_signals") or detail.get("source_excerpt"), 180, 62),
                    ("Pitch", detail.get("pitch"), 220, 62),
                    ("Ask", detail.get("smart_question"), 180, 62),
                    ("Avoid", detail.get("risks_to_avoid") or detail.get("risk_to_avoid"), 180, 62),
                    ("Strengths", detail.get("strengths"), 180, 62),
                    ("Questions", detail.get("questions_to_ask"), 180, 62),
                ],
                3,
            ),
            (
                "Context",
                [
                    ("Fit", detail.get("candidature_evaluation"), 180, 62),
                    ("Strategy", detail.get("role_strategy"), 180, 62),
                    ("Company", detail.get("company_research"), 180, 62),
                    ("Stack", detail.get("tech_stack"), 120, 50),
                    ("Keywords", ", ".join(str(term) for term in detail.get("keywords") or []), 160, 50),
                    ("Forms", detail.get("form_answers"), 160, 50),
                ],
                3,
            ),
        ]
        for title, items, columns in rows:
            visible = [(label, str(value).strip(), limit, height) for label, value, limit, height in items if str(value or "").strip()]
            if visible:
                self._add_tile_section(title, visible, columns)

    def add_full_text_drawers(self, detail: dict[str, Any]) -> None:
        drawers = [
            ("source", "Source text", detail.get("source_text") or detail.get("source_excerpt"), False, 260),
            ("description", "Role description", detail.get("description"), False, 220),
            ("company", "Company research", detail.get("company_research"), False, 200),
            ("fit", "Fit assessment", detail.get("candidature_evaluation"), False, 180),
            ("strategy", "Application strategy", detail.get("role_strategy"), False, 180),
            ("recruiter", "Recruiter material", detail.get("recruiter_material"), False, 180),
            ("forms", "Form answers", detail.get("form_answers") or detail.get("raw_application_form"), False, 180),
            ("cv", "CV material", detail.get("cv_material"), False, 180),
            ("letter", "Cover letter material", detail.get("cover_letter_material"), False, 180),
            ("sent", "Sent material notes", detail.get("material_sent_notes"), False, 150),
        ]
        for card_id, title, body, expanded, min_height in drawers:
            text = str(body or "").strip()
            if text:
                self.add_center_card(card_id, title, text, expanded_by_default=expanded, min_height=min_height)

    def _add_tile_section(self, title: str, visible: list[tuple[str, str, int, int]], columns: int) -> None:
        heading = wx.StaticText(self.owner.center_scroll, label=title)
        heading.SetFont(heading.GetFont().Bold())
        self.owner.center_sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)

        panel = wx.Panel(self.owner.center_scroll, style=wx.BORDER_SIMPLE)
        grid = wx.FlexGridSizer(rows=0, cols=max(1, columns), vgap=6, hgap=8)
        for col in range(max(1, columns)):
            grid.AddGrowableCol(col, 1)
        panel.SetSizer(grid)
        for label, value, limit, min_height in visible:
            grid.Add(self._make_tile(panel, label, value, limit, min_height), 1, wx.ALL | wx.EXPAND, 6)
        self.owner.center_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _make_tile(self, parent: wx.Window, label: str, value: str, limit: int, min_height: int) -> wx.Panel:
        tile = wx.Panel(parent)
        sizer = wx.BoxSizer(wx.VERTICAL)
        tile.SetSizer(sizer)
        title = wx.StaticText(tile, label=label)
        title.SetFont(title.GetFont().Bold())
        body = self.owner._html_text_window(tile, self.owner._clip(value, limit), min_height=min_height)
        body.SetMinSize((-1, min_height))
        sizer.Add(title, 0, wx.BOTTOM | wx.EXPAND, 2)
        sizer.Add(body, 1, wx.EXPAND)
        return tile

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
        expanded = self.is_expanded(card_id, False)
        panel = wx.Panel(self.owner.center_scroll, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        header = wx.BoxSizer(wx.HORIZONTAL)
        toggle_label = wx.StaticText(panel, label="▾" if expanded else "▸")
        toggle_label.SetFont(toggle_label.GetFont().Bold().Larger())
        title_label = wx.StaticText(panel, label=title)
        title_label.SetFont(title_label.GetFont().Bold())
        summary_label = wx.StaticText(panel, label=self.owner._clip(summary, 280))
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
                wx.CallAfter(self._toggle_after_html_link_check, target, selected_card)
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
            self.owner.center_scroll.Layout()
            self.owner.center_scroll.FitInside()
            self.owner.Layout()
        finally:
            self.owner.Thaw()

    def _is_control(self, window: wx.Window) -> bool:
        return isinstance(window, (wx.TextCtrl, wx.Button, wx.Choice))

    def _bind_wrap(self, parent: wx.Window, label: wx.StaticText, padding: int) -> None:
        def wrap(_event: wx.SizeEvent) -> None:
            width = max(200, int(parent.GetClientSize().GetWidth() or 360) - padding)
            label.Wrap(width)
            _event.Skip()

        parent.Bind(wx.EVT_SIZE, wrap)
        label.Wrap(max(200, int(parent.GetClientSize().GetWidth() or 360) - padding))
