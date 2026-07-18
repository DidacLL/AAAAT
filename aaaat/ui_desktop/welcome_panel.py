from __future__ import annotations

from typing import Callable

import wx  # type: ignore[import-not-found]


class WelcomePanel(wx.Panel):
    """First-use desktop surface for an independent or AI-assisted workspace."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_add_candidature: Callable[[], None],
        on_connect_ai: Callable[[], None],
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
                "Start by adding a job offer or an existing candidature. You can work on your own or ask your AI to help."
            ),
        )
        purpose.Wrap(680)
        root.Add(purpose, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 22)

        add = wx.Button(self, label="Add a job offer or candidature…")
        add.SetDefault()
        add.Bind(wx.EVT_BUTTON, lambda _event: on_add_candidature())
        root.Add(add, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 22)

        assistance = wx.StaticText(self, label="Work with your AI")
        assistance.SetFont(assistance.GetFont().Bold().Larger())
        root.Add(assistance, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 22)

        help_text = wx.StaticText(
            self,
            label=(
                "Your AI can help you prepare selected work while AAAAT keeps your workspace local. "
                "It will choose the best connection it can support and explain what it needs from you."
            ),
        )
        help_text.Wrap(680)
        root.Add(help_text, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 22)

        connect = wx.Button(self, label="Connect my AI")
        connect.Bind(wx.EVT_BUTTON, lambda _event: on_connect_ai())
        root.Add(connect, 0, wx.LEFT | wx.RIGHT | wx.TOP, 22)

        root.AddStretchSpacer(1)
