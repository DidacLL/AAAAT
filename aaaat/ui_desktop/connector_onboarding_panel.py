from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]


class ConnectorOnboardingPanel(wx.ScrolledWindow):
    def __init__(
        self,
        parent: wx.Window,
        *,
        on_instructions: Callable[[], str],
        on_export_browser: Callable[[], Any],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.SetScrollRate(0, 12)
        self.on_instructions = on_instructions
        self.on_export_browser = on_export_browser
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        heading = wx.StaticText(self, label="Connect my AI")
        heading.SetFont(heading.GetFont().Bold().Larger())
        root.Add(heading, 0, wx.ALL | wx.EXPAND, 10)

        description = wx.StaticText(
            self,
            label=(
                "Use an AI tool you already trust to help with selected preparation work. "
                "AAAAT stays usable if you do not connect one."
            ),
        )
        description.Wrap(760)
        root.Add(description, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        disclosure = wx.StaticText(
            self,
            label=(
                "When you use assistance, AAAAT shares only the information needed for the work you choose. "
                "Your AI account, credentials, and its data policy remain under your control."
            ),
        )
        disclosure.Wrap(760)
        root.Add(disclosure, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        button = wx.Button(self, label="Show connection guidance")
        button.Bind(wx.EVT_BUTTON, self._show_instructions)
        root.Add(button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.instructions = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY)
        self.instructions.SetMinSize((-1, 300))
        root.Add(self.instructions, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        browser = wx.Button(self, label="Create browser helper…")
        browser.Bind(wx.EVT_BUTTON, self._export_browser)
        root.Add(browser, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.status = wx.StaticText(self, label="")
        self.status.Wrap(760)
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _show_instructions(self, _event: wx.CommandEvent) -> None:
        try:
            self.instructions.SetValue(self.on_instructions())
            self.status.SetLabel("Follow this guidance in the AI tool you chose.")
        except Exception as exc:
            self.status.SetLabel(str(exc))

    def _export_browser(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_export_browser()
            if result:
                self.status.SetLabel(f"Browser helper created: {result}")
        except Exception as exc:
            self.status.SetLabel(str(exc))
