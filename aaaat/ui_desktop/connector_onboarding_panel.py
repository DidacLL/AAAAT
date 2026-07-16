from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

import wx  # type: ignore[import-not-found]


class ConnectorOnboardingPanel(wx.ScrolledWindow):
    """Plain connection status for normal users.

    Host configuration, portable exchange, diagnostics, and connection material
    belong to Advanced workflows. This panel deliberately exposes none of them.
    """

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_prepare_connection: Callable[[], str],
        on_export_connection: Callable[[Path], dict[str, str]],
        on_connection_status: Callable[[], dict[str, Any]],
        on_disconnect: Callable[[], dict[str, Any]],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.SetScrollRate(0, 12)
        self.on_connection_status = on_connection_status
        self.on_disconnect = on_disconnect

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        heading = wx.StaticText(self, label="AI assistance")
        heading.SetFont(heading.GetFont().Bold().Larger())
        root.Add(heading, 0, wx.ALL | wx.EXPAND, 10)

        description = wx.StaticText(
            self,
            label=(
                "AAAAT remains fully usable without AI. When an approved local connection is available, "
                "it can help with selected preparation work while AAAAT keeps review and final changes local."
            ),
        )
        description.Wrap(760)
        root.Add(description, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        self.connection = wx.StaticText(self, label="")
        self.connection.Wrap(760)
        root.Add(self.connection, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

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

    def _refresh_connection_status(self) -> None:
        try:
            state = str(self.on_connection_status().get("state") or "ready_to_connect")
        except Exception:
            state = "needs_attention"
        labels = {
            "ready_to_connect": "Status: Not connected",
            "connected": "Status: Connected",
            "needs_attention": "Status: Needs attention",
            "paused": "Status: Paused",
        }
        self.connection.SetLabel(labels.get(state, labels["needs_attention"]))
        self.pause_button.Show(state in {"connected", "needs_attention"})
        self.Layout()

    def _pause_connection(self, _event: wx.CommandEvent) -> None:
        try:
            self.on_disconnect()
            self.status.SetLabel("AI connection paused")
            self._refresh_connection_status()
        except Exception:
            self.status.SetLabel("AAAAT could not pause the connection.")
