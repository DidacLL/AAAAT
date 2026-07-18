from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]


class ConnectorOnboardingPanel(wx.ScrolledWindow):
    def __init__(
        self,
        parent: wx.Window,
        *,
        on_prepare_connection: Callable[[], str],
        on_connection_status: Callable[[], dict[str, Any]],
        on_disconnect: Callable[[], dict[str, Any]],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.SetScrollRate(0, 12)
        self.on_prepare_connection = on_prepare_connection
        self.on_connection_status = on_connection_status
        self.on_disconnect = on_disconnect
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        heading = wx.StaticText(self, label="Connect my AI")
        heading.SetFont(heading.GetFont().Bold().Larger())
        root.Add(heading, 0, wx.ALL | wx.EXPAND, 10)

        description = wx.StaticText(
            self,
            label=(
                "Open the AI you already use and ask it to connect to AAAAT. "
                "It will choose the best connection it can actually support. If a live connection is unavailable, use the AI exchange task file instead."
            ),
        )
        description.Wrap(760)
        root.Add(description, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        manual = wx.StaticText(
            self,
            label="No AI is required. You can keep using AAAAT normally without connecting one.",
        )
        manual.Wrap(760)
        root.Add(manual, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        disclosure = wx.StaticText(
            self,
            label=(
                "AAAAT keeps your workspace local and shares only information prepared for the work you choose. "
                "AAAAT does not ask for or store your AI credentials."
            ),
        )
        disclosure.Wrap(760)
        root.Add(disclosure, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        self.connection = wx.StaticText(self, label="")
        self.connection.Wrap(760)
        root.Add(self.connection, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        copy_button = wx.Button(self, label="Copy connection request")
        copy_button.Bind(wx.EVT_BUTTON, self._prepare_connection)
        root.Add(copy_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        copy_help = wx.StaticText(
            self,
            label=(
                "Paste the copied request into your AI. It will use a reachable direct connection when possible, "
                "or tell you to create an AI exchange task file and return a result file."
            ),
        )
        copy_help.Wrap(760)
        root.Add(copy_help, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        refresh = wx.Button(self, label="Refresh status")
        refresh.Bind(wx.EVT_BUTTON, lambda _event: self._refresh_connection_status())
        root.Add(refresh, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.pause_button = wx.Button(self, label="Pause AI connection")
        self.pause_button.Bind(wx.EVT_BUTTON, self._pause_connection)
        root.Add(self.pause_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.status = wx.StaticText(self, label="")
        self.status.Wrap(760)
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)
        self._refresh_connection_status()

    def _prepare_connection(self, _event: wx.CommandEvent) -> None:
        try:
            state = str(self.on_connection_status().get("state") or "ready_to_connect")
            if state in {"connected", "needs_attention"}:
                answer = wx.MessageBox(
                    "Creating a new connection request pauses the current AI connection. Continue?",
                    "Replace AI connection",
                    wx.YES_NO | wx.NO_DEFAULT | wx.ICON_WARNING,
                    self,
                )
                if answer != wx.YES:
                    return
            handoff = self.on_prepare_connection()
            if not wx.TheClipboard.Open():
                raise RuntimeError("AAAAT could not copy the connection request. Try again.")
            try:
                wx.TheClipboard.SetData(wx.TextDataObject(handoff))
            finally:
                wx.TheClipboard.Close()
            self.status.SetLabel("Connection request copied. Paste it into your AI.")
            self._refresh_connection_status()
        except Exception as exc:
            self.status.SetLabel(str(exc))

    def _refresh_connection_status(self) -> None:
        try:
            state = str(self.on_connection_status().get("state") or "ready_to_connect")
        except Exception:
            state = "needs_attention"
        labels = {
            "ready_to_connect": "Status: Ready to connect",
            "connected": "Status: Connected",
            "needs_attention": "Status: Needs attention",
            "paused": "Status: Paused",
        }
        self.connection.SetLabel(labels.get(state, labels["needs_attention"]))
        self.pause_button.Show(state in {"connected", "needs_attention"})

    def _pause_connection(self, _event: wx.CommandEvent) -> None:
        try:
            self.on_disconnect()
            self.status.SetLabel("AI connection paused")
            self._refresh_connection_status()
        except Exception as exc:
            self.status.SetLabel(str(exc))
