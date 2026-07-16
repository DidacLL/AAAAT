from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

IntegrationSaveCallback = Callable[[str, dict[str, Any]], dict[str, Any]]
ModeCallback = Callable[[str], dict[str, Any] | None]
SimpleCallback = Callable[[], dict[str, Any]]
TaskCallback = Callable[[str], None]


class AssistancePanel(wx.ScrolledWindow):
    """Plain-language AI status, with local fallbacks kept Advanced-only."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_select_mode: ModeCallback,
        on_disconnect: SimpleCallback,
        on_save_integration: IntegrationSaveCallback,
        on_conformance: SimpleCallback,
        on_create_profile_task: SimpleCallback,
        on_run_task: TaskCallback,
        on_retry_task: TaskCallback,
        on_cancel_task: TaskCallback,
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.SetScrollRate(0, 12)
        self.on_select_mode = on_select_mode
        self.on_disconnect = on_disconnect
        self.on_save_integration = on_save_integration
        self.on_conformance = on_conformance
        self.on_create_profile_task = on_create_profile_task
        self.on_run_task = on_run_task
        self.on_retry_task = on_retry_task
        self.on_cancel_task = on_cancel_task
        self.snapshot: dict[str, Any] = {}
        self.option_by_title: dict[str, dict[str, Any]] = {}
        self.field_controls: dict[str, wx.TextCtrl] = {}
        self.show_advanced = False
        self.root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.root)

    def render(self, snapshot: dict[str, Any]) -> None:
        self.snapshot = snapshot
        self.Freeze()
        try:
            self.root.Clear(delete_windows=True)
            self._build_connection_section()
            if self.show_advanced:
                self._build_task_section()
            self.Layout()
            self.FitInside()
        finally:
            self.Thaw()

    def _build_connection_section(self) -> None:
        heading = wx.StaticText(self, label="AI assistance")
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.root.Add(heading, 0, wx.ALL | wx.EXPAND, 10)

        intro = wx.StaticText(
            self,
            label=(
                "Connect the AI you already use. It can choose the best connection it supports and help with selected "
                "preparation work, while AAAAT keeps your workspace local."
            ),
        )
        intro.Wrap(760)
        self.root.Add(intro, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        current = dict(self.snapshot.get("connection") or self.snapshot.get("integration") or {})
        status = wx.StaticText(
            self,
            label=f"Status: {self._connection_status(current)}",
        )
        status.Wrap(760)
        self.root.Add(status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        disclosure = wx.StaticText(
            self,
            label=(
                "AAAAT shares only the information needed for the work you choose. Your AI account, credentials, "
                "and data policy remain under your control."
            ),
        )
        disclosure.Wrap(760)
        self.root.Add(disclosure, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        state = str(current.get("state") or "ready_to_connect")
        if state in {"connected", "needs_attention"}:
            disconnect = wx.Button(self, label="Pause AI connection")
            disconnect.Bind(wx.EVT_BUTTON, self._disconnect)
            self.root.Add(disconnect, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)
        else:
            connect = wx.Button(self, label="Help my AI connect")
            connect.Bind(wx.EVT_BUTTON, lambda _event: self._select_mode("guided_connector"))
            self.root.Add(connect, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        advanced = wx.Button(self, label="Advanced options…")
        advanced.Bind(wx.EVT_BUTTON, lambda _event: self._select_mode("advanced_integration"))
        self.root.Add(advanced, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.integration_status = wx.StaticText(self, label="")
        self.root.Add(self.integration_status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        if self.show_advanced:
            self._build_advanced_section(current)

    @staticmethod
    def _connection_status(connection: dict[str, Any]) -> str:
        state = str(connection.get("state") or connection.get("status") or "").strip().lower()
        if state == "connected":
            return "Connected"
        if state == "paused":
            return "Paused"
        if state == "needs_attention":
            return "Needs attention"
        return "Ready to connect"

    def _disconnect(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_disconnect()
        except Exception as exc:
            self.integration_status.SetLabel(str(exc))
            return
        self.integration_status.SetLabel("AI connection paused" if result else "AI connection paused")

    def _select_mode(self, mode_id: str) -> None:
        if mode_id == "advanced_integration":
            self.show_advanced = True
            self.render(self.snapshot)
        try:
            result = self.on_select_mode(mode_id)
        except Exception as exc:
            self.integration_status.SetLabel(str(exc))
            return
        if result:
            self.integration_status.SetLabel(str(result.get("message") or result.get("status") or "Ready"))

    def _build_advanced_section(self, current: dict[str, Any]) -> None:
        heading = wx.StaticText(self, label="Advanced integration")
        heading.SetFont(heading.GetFont().Bold())
        self.root.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 10)

        helper = wx.StaticText(
            self,
            label=(
                "Configure a controlled file exchange or a user-owned command. AAAAT passes only one bounded task "
                "and accepts one validated result. Existing settings remain unchanged until the test succeeds."
            ),
        )
        helper.Wrap(760)
        self.root.Add(helper, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        conformance = wx.Button(self, label="Run connection test")
        conformance.Bind(wx.EVT_BUTTON, self._conformance)
        self.root.Add(conformance, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        conformance_state = dict(self.snapshot.get("conformance") or {})
        conformance_label = wx.StaticText(
            self,
            label=(
                f"Connection test: {conformance_state.get('status') or 'not run'} · "
                f"{conformance_state.get('message') or 'No bounded test has been run.'}"
            ),
        )
        conformance_label.Wrap(760)
        self.root.Add(conformance_label, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        options = [item for item in list(self.snapshot.get("options") or []) if bool(item.get("advanced"))]
        self.option_by_title = {str(item.get("title") or item.get("id")): item for item in options}
        titles = list(self.option_by_title)
        self.choice = wx.Choice(self, choices=titles)
        selected_title = str(current.get("title") or "")
        self.choice.SetSelection(titles.index(selected_title) if selected_title in titles else (0 if titles else wx.NOT_FOUND))
        self.choice.Bind(wx.EVT_CHOICE, self._rebuild_fields)
        self.root.Add(self.choice, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        self.fields_panel = wx.Panel(self)
        self.fields_sizer = wx.BoxSizer(wx.VERTICAL)
        self.fields_panel.SetSizer(self.fields_sizer)
        self.root.Add(self.fields_panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)
        self._populate_fields()

        save = wx.Button(self, label="Test and save advanced integration")
        save.Bind(wx.EVT_BUTTON, self._save)
        self.root.Add(save, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.ALIGN_RIGHT, 10)

    def _selected_option(self) -> dict[str, Any]:
        title = self.choice.GetStringSelection() if hasattr(self, "choice") else ""
        return dict(self.option_by_title.get(title) or {})

    def _rebuild_fields(self, _event: wx.CommandEvent) -> None:
        self._populate_fields()
        self.Layout()
        self.FitInside()

    def _populate_fields(self) -> None:
        self.fields_sizer.Clear(delete_windows=True)
        self.field_controls = {}
        option = self._selected_option()
        recommended = dict(option.get("recommended_settings") or {})
        current = dict((self.snapshot.get("integration") or {}).get("settings") or {})
        if str(option.get("id") or "") != str((self.snapshot.get("integration") or {}).get("id") or ""):
            current = recommended
        for field in list(option.get("fields") or []):
            key = str(field.get("key") or "")
            label = wx.StaticText(self.fields_panel, label=str(field.get("label") or key))
            label.SetFont(label.GetFont().Bold())
            self.fields_sizer.Add(label, 0, wx.TOP | wx.EXPAND, 6)
            help_text = str(field.get("help_text") or "")
            if help_text:
                helper = wx.StaticText(self.fields_panel, label=help_text)
                helper.Wrap(720)
                self.fields_sizer.Add(helper, 0, wx.TOP | wx.BOTTOM | wx.EXPAND, 3)
            value = current.get(key, recommended.get(key, ""))
            if isinstance(value, list):
                value = "\n".join(str(item) for item in value)
            style = wx.TE_MULTILINE if bool(field.get("multiline")) else 0
            control = wx.TextCtrl(self.fields_panel, value=str(value or ""), style=style)
            if style & wx.TE_MULTILINE:
                control.SetMinSize((-1, 72))
            self.fields_sizer.Add(control, 0, wx.BOTTOM | wx.EXPAND, 5)
            self.field_controls[key] = control
        self.fields_panel.Layout()

    def _settings(self) -> dict[str, Any]:
        option = self._selected_option()
        fields = {str(item.get("key") or ""): item for item in list(option.get("fields") or [])}
        values: dict[str, Any] = {}
        for key, control in self.field_controls.items():
            value = control.GetValue()
            values[key] = value.splitlines() if bool(fields.get(key, {}).get("multiline")) else value
        return values

    def _save(self, _event: wx.CommandEvent) -> None:
        option = self._selected_option()
        adapter_id = str(option.get("id") or "")
        if not adapter_id:
            return
        self.integration_status.SetLabel("Testing…")
        try:
            result = self.on_save_integration(adapter_id, self._settings())
        except Exception as exc:
            self.integration_status.SetLabel(str(exc))
            return
        health = dict(result.get("health") or {})
        self.integration_status.SetLabel(str(health.get("message") or result.get("status") or "Saved"))

    def _conformance(self, _event: wx.CommandEvent) -> None:
        self.integration_status.SetLabel("Running bounded connection test…")
        try:
            result = self.on_conformance()
            self.integration_status.SetLabel(str(result.get("message") or result.get("status") or "Complete"))
        except Exception as exc:
            self.integration_status.SetLabel(str(exc))

    def _build_task_section(self) -> None:
        heading_row = wx.BoxSizer(wx.HORIZONTAL)
        heading = wx.StaticText(self, label="Assistance tasks")
        heading.SetFont(heading.GetFont().Bold().Larger())
        create_profile = wx.Button(self, label="Complete my profile")
        create_profile.Bind(wx.EVT_BUTTON, self._create_profile_task)
        heading_row.Add(heading, 1, wx.ALIGN_CENTER_VERTICAL)
        heading_row.Add(create_profile, 0)
        self.root.Add(heading_row, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 10)

        tasks = list(self.snapshot.get("tasks") or [])
        if not tasks:
            self.root.Add(wx.StaticText(self, label="No assistance tasks yet."), 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)
            return
        for task in tasks:
            panel = wx.Panel(self, style=wx.BORDER_SIMPLE)
            sizer = wx.BoxSizer(wx.VERTICAL)
            panel.SetSizer(sizer)
            title = wx.StaticText(panel, label=f"{task.get('title') or 'Task'} · {task.get('state') or ''}")
            title.SetFont(title.GetFont().Bold())
            sizer.Add(title, 0, wx.ALL | wx.EXPAND, 7)
            progress = dict(task.get("progress") or {})
            if progress:
                phase = str(progress.get("phase") or progress.get("state") or "running")
                percent = int(progress.get("percent") or 0)
                message = str(progress.get("message") or "")
                progress_label = wx.StaticText(panel, label=f"{phase.replace('_', ' ').title()} · {percent}% · {message}")
                progress_label.Wrap(700)
                sizer.Add(progress_label, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
                gauge = wx.Gauge(panel, range=100)
                gauge.SetValue(max(0, min(100, percent)))
                sizer.Add(gauge, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
            notes = str(task.get("notes") or "").strip()
            if notes:
                body = wx.StaticText(panel, label=notes[:1000])
                body.Wrap(700)
                sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
            actions = wx.BoxSizer(wx.HORIZONTAL)
            task_id = str(task.get("id") or "")
            if task.get("can_run"):
                button = wx.Button(panel, label="Run advanced command")
                button.Bind(wx.EVT_BUTTON, lambda _event, value=task_id: self.on_run_task(value))
                actions.Add(button, 0, wx.RIGHT, 6)
            if task.get("can_retry"):
                button = wx.Button(panel, label="Retry")
                button.Bind(wx.EVT_BUTTON, lambda _event, value=task_id: self.on_retry_task(value))
                actions.Add(button, 0, wx.RIGHT, 6)
            if task.get("can_cancel"):
                button = wx.Button(panel, label="Cancel")
                button.Bind(wx.EVT_BUTTON, lambda _event, value=task_id: self.on_cancel_task(value))
                actions.Add(button, 0)
            sizer.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 7)
            self.root.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

    def _create_profile_task(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_create_profile_task()
            self.integration_status.SetLabel(f"Profile task ready: {result.get('title') or 'Complete professional profile'}")
        except Exception as exc:
            self.integration_status.SetLabel(str(exc))
