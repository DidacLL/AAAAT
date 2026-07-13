from __future__ import annotations

import html
import re
from typing import Callable
from urllib.parse import quote, unquote

import wx  # type: ignore[import-not-found]
import wx.html  # type: ignore[import-not-found]


class KeywordHtmlLinker:
    """Render glossary-aware rich text and route keyword links."""

    def __init__(self, *, known_terms: Callable[[], list[str]], select_keyword: Callable[[str], None]) -> None:
        self._known_terms = known_terms
        self._select_keyword = select_keyword

    def make_window(self, parent: wx.Window, text: str, *, min_height: int) -> wx.html.HtmlWindow:
        style = wx.BORDER_NONE
        if hasattr(wx.html, "HW_SCROLLBAR_NEVER"):
            style |= wx.html.HW_SCROLLBAR_NEVER
        window = wx.html.HtmlWindow(parent, style=style)
        window.SetMinSize((-1, min_height))
        window.SetPage(self.to_html(text))
        window.Bind(wx.html.EVT_HTML_LINK_CLICKED, self.on_link)
        setattr(window, "_aaaat_link_activated", False)
        return window

    def to_html(self, text: str) -> str:
        content = str(text or "")
        terms = self._known_terms()
        if not content:
            body = "—"
        elif not terms:
            body = html.escape(content).replace("\n", "<br>")
        else:
            pattern = re.compile(r"(?<![A-Za-z0-9_])(" + "|".join(re.escape(term) for term in terms) + r")(?![A-Za-z0-9_])", re.IGNORECASE)
            chunks: list[str] = []
            last = 0
            for match in pattern.finditer(content):
                chunks.append(html.escape(content[last : match.start()]).replace("\n", "<br>"))
                label = match.group(0)
                canonical = self._canonical_term(label)
                chunks.append(f'<a href="kw:{quote(canonical)}">{html.escape(label)}</a>')
                last = match.end()
            chunks.append(html.escape(content[last:]).replace("\n", "<br>"))
            body = "".join(chunks)
        return f"<html><body><font size='2'>{body}</font></body></html>"

    def on_link(self, event: wx.html.HtmlLinkEvent) -> None:
        window = event.GetEventObject()
        href = event.GetLinkInfo().GetHref()
        if not href.startswith("kw:"):
            event.Skip()
            return
        if isinstance(window, wx.Window):
            setattr(window, "_aaaat_link_activated", True)
            wx.CallLater(150, lambda: setattr(window, "_aaaat_link_activated", False))
        self._select_keyword(unquote(href[3:]))

    def _canonical_term(self, term: str) -> str:
        lowered = term.lower()
        for known in self._known_terms():
            if known.lower() == lowered:
                return known
        return term
