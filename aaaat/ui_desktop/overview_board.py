from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

OVERVIEW_CARD_SIZE = (390, 168)
EXPANDED_CARD_SIZE = (790, 250)


class OverviewBoardMixin:
    """Horizontal wrapping candidature overview board."""

    def _refresh_overview_cards(self) -> None:
        self.overview_cards_sizer.Clear(delete_windows=True)
        self._overview_card_refs = []
        apps = self._filtered_summaries()
        if self.expanded_overview_ref and self.expanded_overview_ref not in {str(item.get("ref")) for item in apps}:
            self.expanded_overview_ref = None
        if not apps:
            self.overview_cards_sizer.Add(self._empty_message(self.overview_scroll, "No matching candidatures."), 0, wx.ALL | wx.EXPAND, 12)
        for item in apps:
            self.overview_cards_sizer.Add(self._candidature_card(item), 0, wx.ALL | wx.EXPAND, 8)
        self.overview_scroll.Layout()
        self.overview_scroll.FitInside()

    def _candidature_card(self, item: dict[str, Any]) -> wx.Panel:
        ref = str(item.get("ref"))
        expanded = self.expanded_overview_ref == ref
        card = wx.Panel(self.overview_scroll, style=wx.BORDER_SIMPLE)
        card.SetMinSize(EXPANDED_CARD_SIZE if expanded else OVERVIEW_CARD_SIZE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        card.SetSizer(sizer)

        header = wx.BoxSizer(wx.HORIZONTAL)
        title_box = wx.BoxSizer(wx.VERTICAL)
        company = wx.StaticText(card, label=str(item.get("company") or "Untitled"))
        company.SetFont(company.GetFont().Bold().Larger())
        role = wx.StaticText(card, label=str(item.get("role") or "Role"))
        role.SetFont(role.GetFont().Bold())
        title_box.Add(company, 0, wx.BOTTOM | wx.EXPAND, 2)
        title_box.Add(role, 0, wx.EXPAND, 2)
        state = wx.StaticText(card, label=self._clip(f"{item.get('status') or ''} · {item.get('priority') or ''}", 34))
        state.SetFont(state.GetFont().Bold())
        header.Add(title_box, 1, wx.ALL | wx.EXPAND, 8)
        header.Add(state, 0, wx.ALL | wx.ALIGN_TOP, 8)
        sizer.Add(header, 0, wx.EXPAND)

        keywords = "  ".join(f"#{keyword}" for keyword in item.get("keywords") or [])
        if keywords:
            chip_label = wx.StaticText(card, label=self._clip(keywords, 84))
            chip_label.Wrap(360 if not expanded else 740)
            sizer.Add(chip_label, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        if expanded:
            self._add_overview_expanded_body(card, sizer, item)
            hint = wx.StaticText(card, label="Click again to open Smart View")
            hint.SetFont(hint.GetFont().Bold())
            sizer.Add(hint, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.ALIGN_RIGHT, 8)
        else:
            self._add_overview_compact_body(card, sizer, item)

        self._bind_card_click(card, ref)
        self._overview_card_refs.append(ref)
        return card

    def _add_overview_compact_body(self, card: wx.Panel, sizer: wx.BoxSizer, item: dict[str, Any]) -> None:
        body_grid = wx.FlexGridSizer(rows=1, cols=2, vgap=6, hgap=10)
        body_grid.AddGrowableCol(0, 1)
        body_grid.AddGrowableCol(1, 1)
        signal = wx.StaticText(card, label=self._clip(str(item.get("call_signals") or item.get("source_excerpt") or "signal pending"), 56))
        source = wx.StaticText(card, label=self._clip(str(item.get("source_excerpt") or item.get("next_action") or "source pending"), 64))
        signal.Wrap(170)
        source.Wrap(170)
        body_grid.Add(signal, 1, wx.EXPAND)
        body_grid.Add(source, 1, wx.EXPAND)
        sizer.Add(body_grid, 1, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 8)

    def _add_overview_expanded_body(self, card: wx.Panel, sizer: wx.BoxSizer, item: dict[str, Any]) -> None:
        grid = wx.FlexGridSizer(rows=2, cols=2, vgap=8, hgap=12)
        grid.AddGrowableCol(0, 1)
        grid.AddGrowableCol(1, 1)
        blocks = [
            ("Recognize", item.get("call_signals") or item.get("source_excerpt") or "No call signal yet."),
            ("Source", item.get("source_excerpt") or item.get("source") or "Source pending."),
            ("Next", item.get("next_action") or "No next action yet."),
            ("Artifacts", item.get("artifacts_state") or "No artifact state."),
        ]
        for title, body in blocks:
            panel = wx.Panel(card)
            panel_sizer = wx.BoxSizer(wx.VERTICAL)
            panel.SetSizer(panel_sizer)
            label = wx.StaticText(panel, label=title)
            label.SetFont(label.GetFont().Bold())
            text = wx.StaticText(panel, label=self._clip(body, 120))
            text.Wrap(350)
            panel_sizer.Add(label, 0, wx.BOTTOM | wx.EXPAND, 2)
            panel_sizer.Add(text, 1, wx.EXPAND, 2)
            grid.Add(panel, 1, wx.EXPAND)
        sizer.Add(grid, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _bind_card_click(self, window: wx.Window, ref: str) -> None:
        window.SetCursor(wx.Cursor(wx.CURSOR_HAND))

        def on_click(event: wx.Event, selected: str = ref) -> None:
            self._on_card_click(selected)
            if hasattr(event, "StopPropagation"):
                event.StopPropagation()

        window.Bind(wx.EVT_LEFT_UP, on_click)
        for child in window.GetChildren():
            if isinstance(child, wx.Window):
                self._bind_card_click(child, ref)

    def _on_card_click(self, ref: str) -> None:
        if self.expanded_overview_ref == ref:
            self._select_ref(ref)
            return
        self.expanded_overview_ref = ref
        self.Freeze()
        try:
            self._refresh_overview_cards()
            self.Layout()
        finally:
            self.Thaw()
