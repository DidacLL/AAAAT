from __future__ import annotations

import wx  # type: ignore[import-not-found]

_BOUND_SCROLL_ATTR = "_aaaat_parent_wheel_scroll_bound_to"


def bind_parent_wheel_scroll(root: wx.Window, scrolled_parent: wx.ScrolledWindow) -> None:
    """Forward wheel events from simple child widgets to their owning scroller.

    Nested scrolling controls are ownership boundaries. Their internal widget trees
    belong to wx and must not be traversed or rebound by the parent adapter.
    """

    for child in root.GetChildren():
        if not isinstance(child, wx.Window):
            continue
        if _owns_wheel_scroll(child):
            continue
        if getattr(child, _BOUND_SCROLL_ATTR, None) != id(scrolled_parent):
            child.Bind(wx.EVT_MOUSEWHEEL, lambda event, target=scrolled_parent: _scroll_parent(event, target))
            setattr(child, _BOUND_SCROLL_ATTR, id(scrolled_parent))
        bind_parent_wheel_scroll(child, scrolled_parent)


def _owns_wheel_scroll(window: wx.Window) -> bool:
    if isinstance(window, wx.ScrolledWindow):
        return True
    if not isinstance(window, wx.TextCtrl):
        return False
    if not bool(window.GetWindowStyleFlag() & wx.TE_MULTILINE):
        return False
    return _window_can_scroll_vertically(window)


def _window_can_scroll_vertically(window: wx.Window) -> bool:
    try:
        scroll_range = int(window.GetScrollRange(wx.VERTICAL) or 0)
        scroll_thumb = int(window.GetScrollThumb(wx.VERTICAL) or 0)
    except Exception:
        return False
    return scroll_range > scroll_thumb > 0


def _scroll_parent(event: wx.MouseEvent, scrolled_parent: wx.ScrolledWindow) -> None:
    rotation = event.GetWheelRotation()
    if rotation == 0:
        event.Skip()
        return
    delta = max(1, abs(event.GetWheelDelta() or 120))
    lines = max(1, int(event.GetLinesPerAction() or 3))
    units = max(1, int(abs(rotation) / delta * lines))
    x, y = scrolled_parent.GetViewStart()
    if rotation > 0:
        scrolled_parent.Scroll(x, max(0, y - units))
    else:
        scrolled_parent.Scroll(x, y + units)
    if hasattr(event, "StopPropagation"):
        event.StopPropagation()
