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
        primary = [
            ("posting", "Posting", self._source_text(detail), 360, 118, 260),
            ("snapshot", "Snapshot", self._first_text(detail, "offer_snapshot", "description"), 300, 112, 220),
            ("pitch", "Pitch", self._first_text(detail, "pitch", "role_strategy"), 300, 112, 220),
        ]
        support = [
            ("recognize", "Recognize", self._first_text(detail, "call_signals", "source_excerpt"), 210, 88, 190),
            ("ask", "Ask", detail.get("smart_question"), 210, 88, 180),
            ("avoid", "Avoid", detail.get("risks_to_avoid") or detail.get("risk_to_avoid"), 210, 88, 180),
            ("fit", "Fit", detail.get("candidature_evaluation"), 230, 92, 200),
            ("strategy", "Strategy", detail.get("role_strategy"), 230, 92, 200),
            ("company", "Company", detail.get("company_research"), 230, 92, 200),
            ("evidence", "Evidence", detail.get("strengths"), 220, 88, 190),
            ("questions", "Questions", detail.get("questions_to_ask"), 220, 88, 190),
            ("stack", "Stack", detail.get("tech_stack"), 180, 78, 150),
            ("recruiter", "Recruiter", detail.get("recruiter_material"), 230, 92, 200),
        ]
        visible = self._visible_tile_specs(primary + support)
        if not visible:
            return

        panel = wx.Panel(self.owner.center_scroll)
        wrap = wx.WrapSizer(wx.HORIZONTAL)
        panel.SetSizer(wrap)
        for spec in visible:
            wrap.Add(self._make_tile(panel, *spec), 0, wx.ALL, 4)
        self.owner.center_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)

    def add_full_text_drawers(self, detail: dict[str, Any]) -> None:
        drawers = [
            ("original", "Original posting", self._source_text(detail), False, 260, 520),
            ("description", "Published role text", detail.get("description"), False, 220, 520),
            ("snapshot_full", "Role snapshot", detail.get("offer_snapshot"), False, 180, 460),
            ("signals", "Recognition signals", detail.get("call_signals"), False, 170, 420),
            ("pitch_full", "Pitch", detail.get("pitch"), False, 170, 420),
            ("questions", "Questions", detail.get("questions_to_ask") or detail.get("smart_question"), False, 170, 420),
            ("risks", "Risks to avoid", detail.get("risks_to_avoid") or detail.get("risk_to_avoid"), False, 170, 420),
            ("strengths", "Evidence", detail.get("strengths"), False, 170, 420),
            ("company_full", "Company context", detail.get("company_research"), False, 200, 460),
            ("fit_full", "Fit assessment", detail.get("candidature_evaluation"), False, 180, 460),
            ("strategy_full", "Application strategy", detail.get("role_strategy"), False, 180, 460),
            ("recruiter_full", "Recruiter material", detail.get("recruiter_material"), False, 180, 460),
            ("stack_full", "Stack", detail.get("tech_stack"), False, 150, 360),
        ]
        visible = [(card_id, title, str(body).strip(), expanded, min_height, width) for card_id, title, body, expanded, min_height, width in drawers if str(body or "").strip()]
        if not visible:
            return
        panel = wx.Panel(self.owner.center_scroll)
        wrap = wx.WrapSizer(wx.HORIZONTAL)
        panel.SetSizer(wrap)
        for card_id, title, text, expanded, min_height, width in visible:
            wrap.Add(self.build_center_card(panel, card_id, title, text, expanded_by_default=expanded, min_height=min_height, width=width), 0, wx.ALL, 4)
        self.owner.center_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)

    def _make_tile(self, parent: wx.Window, card_id: str, label: str, value: str, limit: int, collapsed_height: int, width: int) -> wx.Panel:
        expanded = self.is_expanded(f"tile:{card_id}", False)
        tile = wx.Panel(parent, style=wx.BORDER_SIMPLE)
        tile.SetMinSize((width, -1))
        tile.SetMaxSize((width + 40, -1))
        sizer = wx.BoxSizer(wx.VERTICAL)
        tile.SetSizer(sizer)

        header = wx.BoxSizer(wx.HORIZONTAL)
        marker = wx.StaticText(tile, label="▾" if expanded else "▸")
        marker.SetFont(marker.GetFont().Bold())
        title = wx.StaticText(tile, label=label)
        title.SetFont(title.GetFont().Smaller())
        header.Add(marker, 0, wx.RIGHT | wx.ALIGN_CENTER_VERTICAL, 4)
        header.Add(title, 1, wx.ALIGN_CENTER_VERTICAL)
        sizer.Add(header, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 6)

        body_text = value if expanded else self.owner._clip(value, limit)
        body_height = max(collapsed_height, 180) if expanded else collapsed_height
        body = self.owner._html_text_window(tile, body_text, min_height=body_height)
        body.SetMinSize((width - 14, body_height))
        body.SetMaxSize((width - 14, body_height if not expanded else -1))
        sizer.Add(body, 0, wx.ALL | wx.EXPAND, 6)
        self.bind_click(tile, f"tile:{card_id}")
        return tile

    def build_center_card(self, parent: wx.Window, card_id: str, title: str, body: Any, *, expanded_by_default: bool, min_height: int, width: int) -> wx.Panel:
        text = str(body or "")
        panel, body_sizer = self.card_shell(parent, card_id, title, text or "—", expanded_by_default=expanded_by_default, width=width)
        if self.is_expanded(card_id, expanded_by_default):
            content = self.owner._html_text_window(panel, text or "—", min_height=min_height)
            content.SetMinSize((max(260, width - 20), min_height))
            body_sizer.Add(content, 0, wx.ALL | wx.EXPAND, 8)
        self.bind_click(panel, card_id)
        return panel

    def add_center_card(self, card_id: str, title: str, body: Any, *, expanded_by_default: bool, min_height: int) -> None:
        card = self.build_center_card(self.owner.center_scroll, card_id, title, body, expanded_by_default=expanded_by_default, min_height=min_height, width=520)
        self.owner.center_sizer.Add(card, 0, wx.BOTTOM, 8)

    def card_shell(self, parent: wx.Window, card_id: str, title: str, summary: str, *, expanded_by_default: bool = False, width: int = 520) -> tuple[wx.Panel, wx.BoxSizer]:
        expanded = self.is_expanded(card_id, expanded_by_default)
        panel = wx.Panel(parent, style=wx.BORDER_SIMPLE)
        panel.SetMinSize((width, -1))
        panel.SetMaxSize((width + 80, -1))
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        header = wx.BoxSizer(wx.HORIZONTAL)
        toggle_label = wx.StaticText(panel, label="▾" if expanded else "▸")
        toggle_label.SetFont(toggle_label.GetFont().Bold().Larger())
        title_label = wx.StaticText(panel, label=title)
        title_label.SetFont(title_label.GetFont().Bold())
        summary_label = wx.StaticText(panel, label=self.owner._clip(summary, 220))
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

    def _visible_tile_specs(self, specs: list[tuple[str, str, Any, int, int, int]]) -> list[tuple[str, str, str, int, int, int]]:
        visible: list[tuple[str, str, str, int, int, int]] = []
        for card_id, label, value, limit, height, width in specs:
            text = str(value or "").strip()
            if text:
                visible.append((card_id, label, text, limit, height, width))
        return visible

    def _is_control(self, window: wx.Window) -> bool:
        return isinstance(window, (wx.TextCtrl, wx.Button, wx.Choice))

    def _bind_wrap(self, parent: wx.Window, label: wx.StaticText, padding: int) -> None:
        def wrap(_event: wx.SizeEvent) -> None:
            try:
                if label and not label.IsBeingDeleted():
                    width = max(200, int(parent.GetClientSize().GetWidth() or 360) - padding)
                    label.Wrap(width)
            except RuntimeError:
                pass
            _event.Skip()

        parent.Bind(wx.EVT_SIZE, wrap)
        try:
            label.Wrap(max(200, int(parent.GetClientSize().GetWidth() or 360) - padding))
        except RuntimeError:
            pass
