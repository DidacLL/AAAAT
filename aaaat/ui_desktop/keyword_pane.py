from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]


class KeywordPane:
    """Right-pane keyword definition surface plus secondary modules."""

    def __init__(self, *, parent: wx.Window, target_sizer: wx.Sizer, html_text_window: Callable[[wx.Window, str, int], wx.Window], clip: Callable[[Any, int], str]) -> None:
        self.parent = parent
        self.target_sizer = target_sizer
        self.html_text_window = html_text_window
        self.clip = clip

    def render_keyword_module(self, *, terms: list[str], selected: str, definition: dict[str, Any], on_select: Callable[[str], None]) -> None:
        label = f"Keyword · {selected}" if selected else "Keyword"
        module = wx.CollapsiblePane(self.parent, label=label)
        module.Collapse(False)
        pane = module.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(sizer)

        title = wx.StaticText(pane, label=selected or "No keyword selected")
        title.SetFont(title.GetFont().Bold().Larger())
        definition_text = wx.StaticText(pane, label=str(definition.get("definition") or "Click a linked term in the center panel."))
        definition_text.Wrap(205)
        sizer.Add(title, 0, wx.ALL | wx.EXPAND, 6)
        sizer.Add(definition_text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)

        if terms:
            chips_panel = wx.Panel(pane)
            chips = wx.WrapSizer(wx.HORIZONTAL)
            chips_panel.SetSizer(chips)
            for term in terms:
                button = wx.Button(chips_panel, label=str(term), size=(-1, 25))
                button.Bind(wx.EVT_BUTTON, lambda _event, selected_term=str(term): on_select(selected_term))
                chips.Add(button, 0, wx.ALL, 2)
            sizer.Add(chips_panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 4)

        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_parent())
        self.target_sizer.Add(module, 0, wx.BOTTOM | wx.EXPAND, 6)

    def render_content_module(self, title: str, body: Any, *, expanded: bool) -> None:
        text = str(body or "")
        label = title if not text else f"{title} · {self.clip(text, 90)}"
        module = wx.CollapsiblePane(self.parent, label=label)
        module.Collapse(not expanded)
        pane = module.GetPane()
        pane_sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(pane_sizer)
        heading = wx.StaticText(pane, label=title)
        heading.SetFont(heading.GetFont().Bold())
        content = self.html_text_window(pane, text or "—", 80)
        pane_sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        pane_sizer.Add(content, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        module.Bind(wx.EVT_COLLAPSIBLEPANE_CHANGED, lambda _event: self._fit_parent())
        self.target_sizer.Add(module, 0, wx.BOTTOM | wx.EXPAND, 6)

    def _fit_parent(self) -> None:
        self.parent.Layout()
        if hasattr(self.parent, "FitInside"):
            self.parent.FitInside()
