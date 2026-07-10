from __future__ import annotations

from typing import Any


def apply_center_card_state_patch(frame_class: type[Any]) -> None:
    """Patch center-card expansion to use explicit per-card state.

    The first card implementation kept only a set of expanded cards plus a
    fallback default. When the last expanded default card was collapsed, the
    fallback could re-expand defaults and make card toggles look crossed.
    This patch replaces that behavior without changing the rest of the wx
    frame implementation.
    """

    defaults = {"call": True, "source": False, "now": True, "later": False, "offer": False}

    def ensure_state(self: Any) -> dict[str, bool]:
        state = getattr(self, "_center_card_state", None)
        if not isinstance(state, dict):
            legacy = getattr(self, "expanded_center_cards", None)
            if isinstance(legacy, set):
                state = {card_id: card_id in legacy for card_id in defaults}
            else:
                state = dict(defaults)
            for card_id, default in defaults.items():
                state.setdefault(card_id, default)
            self._center_card_state = state
            self.expanded_center_cards = {card_id for card_id, expanded in state.items() if expanded}
        return state

    def center_card_is_expanded(self: Any, card_id: str, default: bool) -> bool:
        state = ensure_state(self)
        if card_id not in state:
            state[card_id] = bool(default)
        return bool(state[card_id])

    def toggle_center_card(self: Any, card_id: str) -> None:
        state = ensure_state(self)
        if card_id not in state:
            state[card_id] = bool(defaults.get(card_id, False))
        state[card_id] = not state[card_id]
        self.expanded_center_cards = {item for item, expanded in state.items() if expanded}
        self.Freeze()
        try:
            self._refresh_focus_modules()
            self.center_scroll.Layout()
            self.center_scroll.FitInside()
            self.Layout()
        finally:
            self.Thaw()

    def bind_center_card_click(self: Any, window: Any, card_id: str) -> None:
        import wx  # type: ignore[import-not-found]
        import wx.html  # type: ignore[import-not-found]

        if isinstance(window, wx.html.HtmlWindow) or isinstance(window, wx.TextCtrl):
            return
        window.SetCursor(wx.Cursor(wx.CURSOR_HAND))

        def on_click(event: Any, selected_card: str = card_id) -> None:
            toggle_center_card(self, selected_card)
            if hasattr(event, "StopPropagation"):
                event.StopPropagation()

        window.Bind(wx.EVT_LEFT_UP, on_click)
        for child in window.GetChildren():
            if isinstance(child, wx.Window):
                bind_center_card_click(self, child, card_id)

    frame_class._center_card_is_expanded = center_card_is_expanded
    frame_class._toggle_center_card = toggle_center_card
    frame_class._bind_center_card_click = bind_center_card_click
