from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

ExchangeCallback = Callable[[], dict[str, Any] | None]
ExchangeStatusCallback = Callable[[], dict[str, Any]]
TextImportCallback = Callable[[str], dict[str, Any] | None]


class FileExchangePanel(wx.Panel):
    """First-class file exchange with a tagged text compatibility fallback."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_export: ExchangeCallback,
        on_scan: ExchangeCallback,
        on_import_text: TextImportCallback,
        on_status: ExchangeStatusCallback,
    ) -> None:
        super().__init__(parent)
        self.on_export = on_export
        self.on_scan = on_scan
        self.on_import_text = on_import_text
        self.on_status = on_status
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        title = wx.StaticText(self, label="AI exchange")
        title.SetFont(title.GetFont().Bold().Larger())
        root.Add(title, 0, wx.ALL | wx.EXPAND, 12)

        explanation = wx.StaticText(
            self,
            label=(
                "Use this when your AI cannot connect directly. AAAAT creates one task file for the candidature you selected. "
                "Upload that file to your AI and ask it to return the named JSON result file. AAAAT checks the exchange folder automatically."
            ),
        )
        explanation.Wrap(760)
        root.Add(explanation, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        disclosure = wx.StaticText(
            self,
            label=(
                "Shared: only purpose-specific context for the selected candidature and its requested tasks. "
                "Not shared: your database, workspace path, unrelated candidatures, internal record IDs, or general authority to edit AAAAT."
            ),
        )
        disclosure.Wrap(760)
        root.Add(disclosure, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        self.folder = wx.StaticText(self, label="")
        self.folder.Wrap(760)
        root.Add(self.folder, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        actions = wx.BoxSizer(wx.HORIZONTAL)
        open_button = wx.Button(self, label="Open exchange folder")
        export_button = wx.Button(self, label="Create task file for selected candidature")
        scan_button = wx.Button(self, label="Check returned files")
        open_button.Bind(wx.EVT_BUTTON, self._open_folder)
        export_button.Bind(wx.EVT_BUTTON, self._export)
        scan_button.Bind(wx.EVT_BUTTON, self._scan)
        actions.Add(open_button, 0, wx.RIGHT, 8)
        actions.Add(export_button, 0, wx.RIGHT, 8)
        actions.Add(scan_button, 0)
        root.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)

        fallback = wx.StaticText(
            self,
            label=(
                "If the AI cannot generate a file, copy its complete response and use the compatibility button below. "
                "AAAAT extracts only the tagged result object and ignores surrounding chat text."
            ),
        )
        fallback.Wrap(760)
        root.Add(fallback, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        clipboard_button = wx.Button(self, label="Import copied AI response")
        clipboard_button.Bind(wx.EVT_BUTTON, self._import_clipboard)
        root.Add(clipboard_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)

        self.status = wx.StaticText(self, label="")
        self.status.Wrap(760)
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        self._refresh_status()
        self._timer = wx.Timer(self)
        self.Bind(wx.EVT_TIMER, self._poll, self._timer)
        self._timer.Start(3000)

    def _refresh_status(self) -> None:
        state = self.on_status()
        self.folder.SetLabel(
            f"Exchange folder: {state.get('path', '')}\n"
            f"Pending task files: {int(state.get('pending_tasks') or 0)} · "
            f"Returned files waiting: {int(state.get('waiting_results') or 0)}"
        )

    def _open_folder(self, _event: wx.CommandEvent) -> None:
        try:
            path = str(self.on_status().get("path") or "")
            if not path or not wx.LaunchDefaultApplication(path):
                raise RuntimeError("AAAAT could not open the exchange folder.")
        except Exception as exc:
            self.status.SetLabel(str(exc))

    def _export(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_export()
        except Exception as exc:
            self.status.SetLabel(str(exc))
            return
        if result:
            self.status.SetLabel(str(result.get("message") or "Task file created."))
        self._refresh_status()

    def _scan(self, _event: wx.CommandEvent | None = None, *, quiet: bool = False) -> None:
        try:
            result = self.on_scan()
        except Exception as exc:
            if not quiet:
                self.status.SetLabel(str(exc))
            return
        if result and int(result.get("processed_files") or 0):
            accepted = int(result.get("accepted_count") or 0)
            rejected = int(result.get("rejected_count") or 0)
            self.status.SetLabel(
                f"Applied {accepted} result(s); {rejected} item(s) need attention."
                if rejected
                else f"Applied {accepted} returned result(s)."
            )
        elif not quiet:
            self.status.SetLabel("No returned result files are ready yet.")
        self._refresh_status()

    def _poll(self, _event: wx.TimerEvent) -> None:
        self._scan(quiet=True)

    def _import_clipboard(self, _event: wx.CommandEvent) -> None:
        try:
            if not wx.TheClipboard.Open():
                raise RuntimeError("AAAAT could not read the clipboard.")
            try:
                data = wx.TextDataObject()
                if not wx.TheClipboard.GetData(data):
                    raise ValueError("The clipboard does not contain text.")
                text = data.GetText()
            finally:
                wx.TheClipboard.Close()
            result = self.on_import_text(text)
        except Exception as exc:
            self.status.SetLabel(str(exc))
            return
        if result:
            accepted = len(result.get("accepted") or [])
            rejected = len(result.get("rejected") or [])
            self.status.SetLabel(
                f"Applied {accepted} result(s); {rejected} item(s) need attention."
                if rejected
                else f"Applied {accepted} copied result(s)."
            )
        self._refresh_status()
