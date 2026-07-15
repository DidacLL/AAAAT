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
        on_install: Callable[[str], dict[str, Any]],
        on_negotiate: Callable[[], dict[str, Any]],
        on_export_browser: Callable[[], Any],
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.SetScrollRate(0, 12)
        self.on_prompt = on_prompt
        self.on_preview = on_preview
        self.on_install = on_install
        self.on_negotiate = on_negotiate
        self.on_export_browser = on_export_browser
        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        heading = wx.StaticText(self, label="Connect my AI")
        heading.SetFont(heading.GetFont().Bold().Larger())
        root.Add(heading, 0, wx.ALL | wx.EXPAND, 10)
        description = wx.StaticText(
            self,
            label=(
                "Use the AI you already prefer. AAAAT creates setup instructions that describe only its bounded task/result "
                "contract. Give those instructions to your AI, then paste back the connection package it creates."
            ),
        )
        description.Wrap(760)
        root.Add(description, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        privacy = wx.StaticText(
            self,
            label=(
                "Before activation, AAAAT shows every generated file and runs a fake-data connection test. "
                "No candidature, profile, database path, or internal identifier is shared during setup."
            ),
        )
        privacy.Wrap(760)
        root.Add(privacy, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        step_one = wx.StaticText(self, label="1. Create setup instructions")
        step_one.SetFont(step_one.GetFont().Bold())
        root.Add(step_one, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        prompt_button = wx.Button(self, label="Create instructions for my AI")
        prompt_button.Bind(wx.EVT_BUTTON, self._generate_prompt)
        root.Add(prompt_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)
        self.prompt_text = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY)
        self.prompt_text.SetMinSize((-1, 170))
        root.Add(self.prompt_text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        package_label = wx.StaticText(self, label="2. Paste the connection package returned by your AI")
        package_label.SetFont(package_label.GetFont().Bold())
        root.Add(package_label, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        self.package_text = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        self.package_text.SetMinSize((-1, 190))
        root.Add(self.package_text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        package_actions = wx.BoxSizer(wx.HORIZONTAL)
        preview = wx.Button(self, label="Review generated files")
        install = wx.Button(self, label="Install and test connection")
        preview.Bind(wx.EVT_BUTTON, self._preview)
        install.Bind(wx.EVT_BUTTON, self._install)
        package_actions.Add(preview, 0, wx.RIGHT, 8)
        package_actions.Add(install, 0)
        root.Add(package_actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        alternatives = wx.StaticText(self, label="Other connection options")
        alternatives.SetFont(alternatives.GetFont().Bold())
        root.Add(alternatives, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 10)
        runtime_actions = wx.BoxSizer(wx.HORIZONTAL)
        negotiate = wx.Button(self, label="Test my current connection")
        browser = wx.Button(self, label="Create browser helper package")
        negotiate.Bind(wx.EVT_BUTTON, self._negotiate)
        browser.Bind(wx.EVT_BUTTON, self._export_browser)
        runtime_actions.Add(negotiate, 0, wx.RIGHT, 8)
        runtime_actions.Add(browser, 0)
        root.Add(runtime_actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.status = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY)
        self.status.SetMinSize((-1, 120))
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _generate_prompt(self, _event: wx.CommandEvent) -> None:
        try:
            self.prompt_text.SetValue(self.on_prompt())
            self.status.SetValue("Setup instructions created. Give them to your chosen AI, then paste its returned connection package below.")
        except Exception as exc:
            self.status.SetValue(str(exc))

    def _preview(self, _event: wx.CommandEvent) -> None:
        try:
            preview = self.on_preview(self.package_text.GetValue())
            self.status.SetValue(str(preview))
        except Exception as exc:
            self.status.SetValue(str(exc))

    def _install(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_install(self.package_text.GetValue())
            self.status.SetValue(str(result))
        except Exception as exc:
            self.status.SetValue(str(exc))

    def _negotiate(self, _event: wx.CommandEvent) -> None:
        self.status.SetValue("Testing the current connection with fake data…")
        try:
            result = self.on_negotiate()
            self.status.SetValue(str(result))
        except Exception as exc:
            self.status.SetValue(str(exc))

    def _export_browser(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_export_browser()
            if result:
                self.status.SetValue(f"Browser helper package created: {result}")
        except Exception as exc:
            self.status.SetValue(str(exc))
