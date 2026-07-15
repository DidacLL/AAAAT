from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

BundleCallback = Callable[[], dict[str, Any] | None]


class PortableBundlePanel(wx.Panel):
    """Two-transfer browser and chat AI compatibility surface."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_export: BundleCallback,
        on_import: BundleCallback,
    ) -> None:
        super().__init__(parent)
        self.on_export = on_export
        self.on_import = on_import
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        title = wx.StaticText(self, label="Use a browser or chat AI")
        title.SetFont(title.GetFont().Bold().Larger())
        root.Add(title, 0, wx.ALL | wx.EXPAND, 12)

        explanation = wx.StaticText(
            self,
            label=(
                "For an AI that cannot connect automatically, AAAAT creates one file containing every eligible task for "
                "the candidature you selected. Add that file to your chat, then import the single result file it returns."
            ),
        )
        explanation.Wrap(760)
        root.Add(explanation, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        disclosure = wx.StaticText(
            self,
            label=(
                "Shared: only purpose-specific context for the selected candidature and its requested tasks. "
                "Not shared: your database, storage paths, unrelated candidatures, internal record IDs, or authority to edit AAAAT directly. "
                "The selected AI receives the exported content, so use an AI whose data policy you accept."
            ),
        )
        disclosure.Wrap(760)
        root.Add(disclosure, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        actions = wx.BoxSizer(wx.HORIZONTAL)
        export_button = wx.Button(self, label="Create file for selected candidature…")
        import_button = wx.Button(self, label="Import returned result file…")
        export_button.Bind(wx.EVT_BUTTON, self._export)
        import_button.Bind(wx.EVT_BUTTON, self._import)
        actions.Add(export_button, 0, wx.RIGHT, 8)
        actions.Add(import_button, 0)
        root.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)

        self.status = wx.StaticText(self, label="")
        self.status.Wrap(760)
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

    def _export(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_export()
        except Exception as exc:
            self.status.SetLabel(str(exc))
            return
        if result:
            self.status.SetLabel(f"Created one file with {result.get('task_count', 0)} bounded task(s): {result.get('path', '')}")

    def _import(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_import()
        except Exception as exc:
            self.status.SetLabel(str(exc))
            return
        if result:
            self.status.SetLabel(
                f"Import {result.get('status', '')}: {len(result.get('accepted') or [])} accepted, "
                f"{len(result.get('rejected') or [])} rejected."
            )
