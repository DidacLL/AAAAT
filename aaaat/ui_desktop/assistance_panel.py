from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]


IntegrationSaveCallback = Callable[[str, dict[str, Any]], dict[str, Any]]
SimpleCallback = Callable[[], dict[str, Any]]
TaskCallback = Callable[[str], None]


class AssistancePanel(wx.ScrolledWindow):
    """Guided integration setup and bounded task activity for User view."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_save_integration: IntegrationSaveCallback,
        on_recommended: SimpleCallback,
        on_manual: SimpleCallback,
        on_run_task: TaskCallback,
        on_retry_task: TaskCallback,
        on_cancel_task: TaskCallback,
    ) -> None:
        super().__init__(parent, style=wx.VSCROLL)
        self.SetScrollRate(0, 12)
        self.on_save_integration = on_save_integration
        self.on_recommended = on_recommended
        self.on_manual = on_manual
        self.on_run_task = on_run_task
        self.on_retry_task = on_retry_task
        self.on_cancel_task = on_cancel_task
        self.snapshot: dict[str, Any] = {}
        self.option_by_title: dict[str, dict[str, Any]] = {}
        self.field_controls: dict[str, wx.TextCtrl] = {}
        self.root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(self.root)

    def render(self, snapshot: dict[str, Any]) -> None:
        self.snapshot = snapshot
        self.Freeze()
        try:
            self.root.Clear(delete_windows=True)
            self._build_integration_section()
            self._build_task_section()
            self.Layout()
            self.FitInside()
        finally:
            self.Thaw()

    def _build_integration_section(self) -> None:
        heading = wx.StaticText(self, label="AI assistance connection")
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.root.Add(heading, 0, wx.ALL | wx.EXPAND, 10)

        current = dict(self.snapshot.get("integration") or {})
        status = wx.StaticText(
            self,
            label=f"Current: {current.get('title') or 'Portable/manual'} · network: {current.get('network_access') or 'host-controlled'}",
        )
        status.Wrap(760)
        self.root.Add(status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        quick = wx.BoxSizer(wx.HORIZONTAL)
        recommended = wx.Button(self, label="Use recommended local AI")
        manual = wx.Button(self, label="Use portable/manual mode")
        recommended.Bind(wx.EVT_BUTTON, self._recommended)
        manual.Bind(wx.EVT_BUTTON, self._manual)
        quick.Add(recommended, 0, wx.RIGHT, 8)
        quick.Add(manual, 0)
        self.root.Add(quick, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        options = list(self.snapshot.get("options") or [])
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

        actions = wx.BoxSizer(wx.HORIZONTAL)
        self.integration_status = wx.StaticText(self, label="")
        save = wx.Button(self, label="Test and save")
        save.Bind(wx.EVT_BUTTON, self._save)
        actions.Add(self.integration_status, 1, wx.ALIGN_CENTER_VERTICAL | wx.RIGHT, 8)
        actions.Add(save, 0)
        self.root.Add(actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

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
        except Exception as exc:  # wx boundary: show actionable failure
            self.integration_status.SetLabel(str(exc))
            return
        health = dict(result.get("health") or {})
        self.integration_status.SetLabel(str(health.get("message") or result.get("status") or "Saved"))

    def _recommended(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_recommended()
            health = dict(result.get("health") or {})
            self.integration_status.SetLabel(str(health.get("message") or result.get("status") or "Ready"))
        except Exception as exc:
            self.integration_status.SetLabel(str(exc))

    def _manual(self, _event: wx.CommandEvent) -> None:
        try:
            result = self.on_manual()
            self.integration_status.SetLabel(f"Using {result.get('title') or 'portable/manual mode'}")
        except Exception as exc:
            self.integration_status.SetLabel(str(exc))

    def _build_task_section(self) -> None:
        heading = wx.StaticText(self, label="Assistance tasks")
        heading.SetFont(heading.GetFont().Bold().Larger())
        self.root.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.BOTTOM | wx.EXPAND, 10)
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
            notes = str(task.get("notes") or "").strip()
            if notes:
                body = wx.StaticText(panel, label=notes[:1000])
                body.Wrap(700)
                sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
            actions = wx.BoxSizer(wx.HORIZONTAL)
            task_id = str(task.get("id") or "")
            if task.get("can_run"):
                button = wx.Button(panel, label="Run")
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
