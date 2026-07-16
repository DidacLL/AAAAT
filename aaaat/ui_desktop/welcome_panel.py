from __future__ import annotations

from typing import Callable

import wx  # type: ignore[import-not-found]


class WelcomePanel(wx.Panel):
    """First-use desktop surface with a manual path that needs no setup."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_add_candidature: Callable[[], None],
        on_connect_ai: Callable[[], None],
        on_browser_or_chat: Callable[[], None],
        on_portable_file: Callable[[], None],
    ) -> None:
        super().__init__(parent)
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        title = wx.StaticText(self, label="Welcome to AAAAT")
        title.SetFont(title.GetFont().Bold().Larger().Larger())
        root.Add(title, 0, wx.ALL | wx.EXPAND, 22)

        purpose = wx.StaticText(
            self,
            label=(
                "Keep your job applications, preparation notes, and application materials together on this computer. "
                "Start by adding a job offer or an existing candidature; you can use AAAAT entirely on your own."
            ),
        )
        purpose.Wrap(680)
        root.Add(purpose, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 22)

        add = wx.Button(self, label="Add a job offer or candidature…")
        add.SetDefault()
        add.Bind(wx.EVT_BUTTON, lambda _event: on_add_candidature())
        root.Add(add, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 22)

        manual = wx.StaticText(self, label="Manual use is ready now. Connecting an AI is optional.")
        manual.SetFont(manual.GetFont().Bold())
        root.Add(manual, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 22)

        assistance = wx.StaticText(self, label="Optional assistance")
        assistance.SetFont(assistance.GetFont().Bold().Larger())
        root.Add(assistance, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 22)

        for label, handler in (
            ("Connect my AI", on_connect_ai),
            ("Use a browser or chat AI", on_browser_or_chat),
            ("Use a portable file", on_portable_file),
        ):
            button = wx.Button(self, label=label)
            button.Bind(wx.EVT_BUTTON, lambda _event, action=handler: action())
            root.Add(button, 0, wx.LEFT | wx.RIGHT | wx.TOP, 22)

        root.AddStretchSpacer(1)
