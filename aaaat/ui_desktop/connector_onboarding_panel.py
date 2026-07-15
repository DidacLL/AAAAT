from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]


class ConnectorOnboardingPanel(wx.ScrolledWindow):
    def __init__(
        self,
        parent: wx.Window,
        *,
        on_prompt: Callable[[], str],
        on_preview: Callable[[str], dict[str, Any]],
        on_store: Callable[[str], dict[str, Any]],
        on_export_browser: Callable[[], Any],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.SetScrollRate(0, 12)
        self.on_prompt = on_prompt
        self.on_preview = on_preview
        self.on_store = on_store
        self.on_export_browser = on_export_browser
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        heading = wx.StaticText(self, label="Connect my AI")
        heading.SetFont(heading.GetFont().Bold().Larger())
        root.Add(heading, 0, wx.ALL | wx.EXPAND, 10)
        description = wx.StaticText(
            self,
            label=(
                "Use the AI or agent host you already prefer. AAAAT creates provider-neutral setup instructions for "
                "consuming its existing bounded task queue. The external host initiates every connection."
            ),
        )
        description.Wrap(760)
        root.Add(description, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        privacy = wx.StaticText(
            self,
            label=(
                "AAAAT previews and stores returned setup files disabled. It never executes this package, launches an AI, "
                "or embeds provider credentials. Configure the stored package in your external host."
            ),
        )
        privacy.Wrap(760)
        root.Add(privacy, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        step_one = wx.StaticText(self, label="1. Create host-side setup instructions")
        step_one.SetFont(step_one.GetFont().Bold())
        root.Add(step_one, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        prompt_button = wx.Button(self, label="Create instructions for my AI host")
        prompt_button.Bind(wx.EVT_BUTTON, self._generate_prompt)
        root.Add(prompt_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)
        self.prompt_text = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY)
        self.prompt_text.SetMinSize((-1, 170))
        root.Add(self.prompt_text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        package_label = wx.StaticText(self, label="2. Paste the host wrapper package returned by your AI")
        package_label.SetFont(package_label.GetFont().Bold())
        root.Add(package_label, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.package_text = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        self.package_text.SetMinSize((-1, 190))
        root.Add(self.package_text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        package_actions = wx.BoxSizer(wx.HORIZONTAL)
        preview = wx.Button(self, label="Review generated files")
        store = wx.Button(self, label="Store disabled package")
        preview.Bind(wx.EVT_BUTTON, self._preview)
        store.Bind(wx.EVT_BUTTON, self._store)
        package_actions.Add(preview, 0, wx.RIGHT, 8)
        package_actions.Add(store, 0)
        root.Add(package_actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        browser = wx.Button(self, label="Create browser helper package")
        browser.Bind(wx.EVT_BUTTON, self._export_browser)
        root.Add(browser, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.status = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY)
        self.status.SetMinSize((-1, 120))
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _generate_prompt(self, _event: wx.CommandEvent) -> None:
        try:
            self.prompt_text.SetValue(self.on_prompt())
            self.status.SetValue("Instructions created. Give them to the external AI host, then paste its returned wrapper package below.")
        except Exception as exc:
            self.status.SetValue(str(exc))

    def _preview(self, _event: wx.CommandEvent) -> None:
        try:
            self.status.SetValue(str(self.on_preview(self.package_text.GetValue())))
        except Exception as exc:
            self.status.SetValue(str(exc))

    def _store(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_store(self.package_text.GetValue())
            self.status.SetValue(
                f"Stored disabled package at {result.get('directory', '')}. Configure and run it from the external AI host."
            )
        except Exception as exc:
            self.status.SetValue(str(exc))

    def _export_browser(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_export_browser()
            if result:
                self.status.SetValue(f"Browser helper package created: {result}")
        except Exception as exc:
            self.status.SetValue(str(exc))
