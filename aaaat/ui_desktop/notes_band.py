from __future__ import annotations

from typing import Callable

import wx  # type: ignore[import-not-found]


class NotesBand:
    """Fixed bottom-center notes editor with no persistence knowledge."""

    def __init__(self, *, parent: wx.Window, target_sizer: wx.Sizer, can_save: bool, on_save: Callable[[str], None]) -> None:
        self.parent = parent
        self.target_sizer = target_sizer
        self.can_save = can_save
        self.on_save = on_save
        self.text: wx.TextCtrl | None = None

    def render(self, body: str) -> wx.TextCtrl:
        header = wx.BoxSizer(wx.HORIZONTAL)
        title = wx.StaticText(self.parent, label="Notes")
        title.SetFont(title.GetFont().Bold())
        save = wx.Button(self.parent, label="Save", size=(58, -1))
        save.Enable(self.can_save)
        save.Bind(wx.EVT_BUTTON, self._on_save)
        header.Add(title, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 6)
        header.AddStretchSpacer(1)
        header.Add(save, 0, wx.ALL | wx.ALIGN_CENTER_VERTICAL, 4)

        self.text = wx.TextCtrl(self.parent, value=body, style=wx.TE_MULTILINE)
        self.text.Enable(self.can_save)
        self.target_sizer.Add(header, 0, wx.EXPAND)
        self.target_sizer.Add(self.text, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 6)
        return self.text

    def _on_save(self, _event: wx.CommandEvent) -> None:
        if self.can_save and self.text is not None:
            self.on_save(self.text.GetValue())
