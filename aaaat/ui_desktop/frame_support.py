from __future__ import annotations

from typing import Any

import wx  # type: ignore[import-not-found]

from .smart_view import DEFAULT_CENTER_NOTES_HEIGHT, DEFAULT_FOCUS_LEFT, DEFAULT_FOCUS_RIGHT, DEFAULT_WINDOW_SIZE


class FrameSupportMixin:
    """Shared frame behavior required by Smart and overview surfaces."""

    def _on_reset_layout(self, _event: wx.Event) -> None:
        current_view = self.current_view
        current_ref = self.selected_ref
        self.layout_state = self.layout_state.default()
        self.layout_state.selected_view = current_view
        self.layout_state.selected_candidature_ref = current_ref
        self.center_card_state.reset()
        self.focus_left_width = DEFAULT_FOCUS_LEFT
        self.focus_right_width = DEFAULT_FOCUS_RIGHT
        self._focus_layout_applied = False
        self._rendered_view_keys.clear()
        if self.focus_splitter.IsSplit():
            self.focus_splitter.SetSashPosition(self.focus_left_width)
        if self.content_splitter.IsSplit():
            self.content_splitter.SetSashPosition(
                DEFAULT_WINDOW_SIZE[0] - self.focus_left_width - self.focus_right_width
            )
        if self.center_splitter.IsSplit():
            self.center_splitter.SetSashPosition(
                DEFAULT_WINDOW_SIZE[1] - DEFAULT_CENTER_NOTES_HEIGHT - 90
            )
        self.layout_state.save(self.layout_path)
        self._refresh_all()

    def _empty_message(self, parent: wx.Window, text: str) -> wx.StaticText:
        label = wx.StaticText(parent, label=text)
        label.SetFont(label.GetFont().Bold())
        return label

    @staticmethod
    def _clip(value: Any, limit: int) -> str:
        text = " ".join(str(value or "").split())
        if len(text) <= limit:
            return text
        return text[: max(0, limit - 1)].rstrip() + "…"

    def _select_ref(self, ref: str) -> None:
        self.expanded_overview_ref = None
        self.selected_ref = ref
        self.layout_state.selected_candidature_ref = ref
        self.center_card_state.reset()
        self._show_focus()
        self._refresh_all()
