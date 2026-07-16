from __future__ import annotations

from typing import Any, Callable
from pathlib import Path

import wx  # type: ignore[import-not-found]


class ConnectorOnboardingPanel(wx.ScrolledWindow):
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
        self.on_prepare_connection = on_prepare_connection
        self.on_export_connection = on_export_connection
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
                "Use the AI you already trust to help with selected preparation work. "
                "Your AI will choose the best connection it can support and tell you if it needs anything from you."
            ),
        )
        description.Wrap(760)
        root.Add(description, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        disclosure = wx.StaticText(
            self,
            label=(
                "AAAAT shares only the information needed for the work you choose. "
                "Your AI account, credentials, and its data policy remain under your control."
            ),
        )
        disclosure.Wrap(760)
        root.Add(disclosure, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        self.connection = wx.StaticText(self, label="")
        self.connection.Wrap(760)
        root.Add(self.connection, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        refresh = wx.Button(self, label="Refresh status")
        refresh.Bind(wx.EVT_BUTTON, lambda _event: self._refresh_connection_status())
        root.Add(refresh, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        button = wx.Button(self, label="Prepare connection request")
        button.Bind(wx.EVT_BUTTON, self._prepare_connection)
        root.Add(button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        save_button = wx.Button(self, label="Save connection for my AI")
        save_button.Bind(wx.EVT_BUTTON, self._export_connection)
        root.Add(save_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.instructions = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY)
        self.instructions.SetMinSize((-1, 150))
        root.Add(self.instructions, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

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
                    "Preparing a new request pauses the current AI connection. Continue?",
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
            self.instructions.SetValue(
                "A connection request has been copied. Paste it into the AI you want to use. "
                "Your AI will choose the best connection it supports and tell you plainly if it cannot connect."
            )
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

    def _export_connection(self, _event: wx.CommandEvent) -> None:
        with wx.DirDialog(self, "Choose your AI integration folder", style=wx.DD_DEFAULT_STYLE | wx.DD_DIR_MUST_EXIST) as dialog:
            if dialog.ShowModal() != wx.ID_OK:
                return
            try:
                self.on_export_connection(Path(dialog.GetPath()))
                self.status.SetLabel("Connection saved for your AI. It will tell you if it can connect.")
                self._refresh_connection_status()
            except Exception:
                self.status.SetLabel("AAAAT could not save that connection. Choose another folder and try again.")

    def _pause_connection(self, _event: wx.CommandEvent) -> None:
        try:
            self.on_disconnect()
            self.status.SetLabel("AI connection paused")
            self._refresh_connection_status()
        except Exception as exc:
            self.status.SetLabel(str(exc))
