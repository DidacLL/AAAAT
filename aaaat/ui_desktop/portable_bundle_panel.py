from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]


BundleCallback = Callable[[], dict[str, Any] | None]


class PortableBundlePanel(wx.Panel):
    """Two-transfer browser compatibility surface."""

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

        title = wx.StaticText(self, label="Browser-only task bundle")
        title.SetFont(title.GetFont().Bold().Larger())
        root.Add(title, 0, wx.ALL | wx.EXPAND, 12)

        explanation = wx.StaticText(
            self,
            label=(
                "For a conversational AI that cannot run commands, export every eligible task for the selected candidature "
                "as one archive. Drag that archive into the chat, then import the single returned AAAAT result archive."
            ),
        )
        explanation.Wrap(760)
        root.Add(explanation, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)

        actions = wx.BoxSizer(wx.HORIZONTAL)
        export_button = wx.Button(self, label="Export selected candidature tasks…")
        import_button = wx.Button(self, label="Import returned results…")
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
            self.status.SetLabel(f"Exported {result.get('task_count', 0)} task(s) to {result.get('path', '')}")

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
