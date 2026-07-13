from __future__ import annotations

from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from aaaat.provider_adapters import ADAPTERS, DEFAULT_ADAPTER_ID, visible_adapters
from aaaat.task_registry import TASK_DEFINITIONS
from aaaat.workspace_config import (
    ensure_task_definition_file,
    load_workspace_config,
    save_workspace_settings,
)


class PreparationSettingsDialog(wx.Dialog):
    """Human-facing preparation and provider-adapter settings."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        storage_path: str,
        on_saved: Callable[[], None] | None = None,
    ) -> None:
        super().__init__(
            parent,
            title="Preparation settings",
            size=(760, 760),
            style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER,
        )
        self.storage_path = storage_path
        self.on_saved = on_saved
        self.config = load_workspace_config(storage_path)
        self.task_checks: dict[str, wx.CheckBox] = {}
        self.normal_adapters = list(visible_adapters())

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        heading = wx.StaticText(self, label="Automatic candidature preparation")
        heading.SetFont(heading.GetFont().Bold().Larger().Larger())
        intro = wx.StaticText(
            self,
            label=(
                "Choose what AAAAT prepares after a job offer is added. Generated results remain suggestions "
                "until you review and use them. CV and cover-letter generation stay manual by default."
            ),
        )
        intro.Wrap(700)
        root.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 14)
        root.Add(intro, 0, wx.ALL | wx.EXPAND, 14)

        tasks_box = wx.StaticBoxSizer(wx.VERTICAL, self, "Preparation steps")
        selected = set(self.config["automatic_preparation"])
        for task_type, definition in TASK_DEFINITIONS.items():
            if task_type == "keyword_definition":
                continue
            row = wx.Panel(tasks_box.GetStaticBox())
            row_sizer = wx.BoxSizer(wx.VERTICAL)
            row.SetSizer(row_sizer)
            check = wx.CheckBox(row, label=definition.title)
            check.SetValue(task_type in selected)
            description = wx.StaticText(row, label=definition.description)
            description.Wrap(660)
            row_sizer.Add(check, 0, wx.BOTTOM | wx.EXPAND, 3)
            row_sizer.Add(description, 0, wx.LEFT | wx.EXPAND, 24)
            tasks_box.Add(row, 0, wx.ALL | wx.EXPAND, 7)
            self.task_checks[task_type] = check
        root.Add(tasks_box, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        provider_box = wx.StaticBoxSizer(wx.VERTICAL, self, "Preparation provider")
        provider_intro = wx.StaticText(
            provider_box.GetStaticBox(),
            label=(
                "Choose how preparation tasks are completed. AAAAT remains provider-agnostic: adapters receive only the bounded task context "
                "and return the task's structured result."
            ),
        )
        provider_intro.Wrap(680)
        self.provider_choice = wx.Choice(
            provider_box.GetStaticBox(),
            choices=[adapter.title for adapter in self.normal_adapters],
        )
        current_adapter = str(self.config["provider_adapter"]["id"])
        normal_ids = [adapter.adapter_id for adapter in self.normal_adapters]
        self.provider_choice.SetSelection(normal_ids.index(current_adapter) if current_adapter in normal_ids else 0)
        self.provider_help = wx.StaticText(provider_box.GetStaticBox(), label="")
        self.provider_help.Wrap(680)
        self.provider_choice.Bind(wx.EVT_CHOICE, self._on_provider_changed)
        provider_box.Add(provider_intro, 0, wx.ALL | wx.EXPAND, 8)
        provider_box.Add(self.provider_choice, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        provider_box.Add(self.provider_help, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        root.Add(provider_box, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)
        self._update_provider_help()

        advanced = wx.CollapsiblePane(self, label="Advanced")
        pane = advanced.GetPane()
        pane_sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(pane_sizer)

        custom_box = wx.StaticBoxSizer(wx.VERTICAL, pane, "Custom adapter")
        self.use_custom = wx.CheckBox(custom_box.GetStaticBox(), label="Use a custom command adapter")
        self.use_custom.SetValue(current_adapter == "custom_command")
        custom_help = wx.StaticText(
            custom_box.GetStaticBox(),
            label=(
                "For advanced integrations only. The command receives one bounded task packet on standard input and must return one JSON result "
                "on standard output."
            ),
        )
        custom_help.Wrap(660)
        self.custom_command = wx.TextCtrl(custom_box.GetStaticBox(), style=wx.TE_MULTILINE)
        self.custom_command.SetMinSize((-1, 90))
        current_settings = self.config["provider_adapter"].get("settings") or {}
        self.custom_command.SetValue("\n".join(current_settings.get("command") or []))
        self.use_custom.Bind(wx.EVT_CHECKBOX, self._on_custom_changed)
        custom_box.Add(self.use_custom, 0, wx.ALL | wx.EXPAND, 8)
        custom_box.Add(custom_help, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        custom_box.Add(self.custom_command, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        pane_sizer.Add(custom_box, 0, wx.ALL | wx.EXPAND, 6)

        definitions_box = wx.StaticBoxSizer(wx.VERTICAL, pane, "Raw task definitions")
        definitions_help = wx.StaticText(
            definitions_box.GetStaticBox(),
            label=(
                "Each task has an exact JSON definition containing its instructions, response contract and artifact mapping. "
                "Editing these files changes future task snapshots only."
            ),
        )
        definitions_help.Wrap(660)
        self.task_choice = wx.Choice(
            definitions_box.GetStaticBox(),
            choices=[TASK_DEFINITIONS[key].title for key in TASK_DEFINITIONS],
        )
        self.task_types = list(TASK_DEFINITIONS)
        self.task_choice.SetSelection(0)
        open_raw = wx.Button(definitions_box.GetStaticBox(), label="Open selected task JSON")
        open_raw.Bind(wx.EVT_BUTTON, self._open_task_json)
        definitions_box.Add(definitions_help, 0, wx.ALL | wx.EXPAND, 8)
        definitions_box.Add(self.task_choice, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        definitions_box.Add(open_raw, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 8)
        pane_sizer.Add(definitions_box, 0, wx.ALL | wx.EXPAND, 6)
        root.Add(advanced, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)
        self._update_custom_state()

        self.error = wx.StaticText(self, label="")
        root.Add(self.error, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)
        buttons = self.CreateSeparatedButtonSizer(wx.OK | wx.CANCEL)
        root.Add(buttons, 0, wx.ALL | wx.EXPAND, 14)
        ok = self.FindWindowById(wx.ID_OK)
        if ok:
            ok.SetLabel("Save settings")
            ok.Bind(wx.EVT_BUTTON, self._save)

    def _selected_normal_adapter_id(self) -> str:
        index = self.provider_choice.GetSelection()
        if 0 <= index < len(self.normal_adapters):
            return self.normal_adapters[index].adapter_id
        return DEFAULT_ADAPTER_ID

    def _update_provider_help(self) -> None:
        adapter = ADAPTERS[self._selected_normal_adapter_id()]
        self.provider_help.SetLabel(adapter.description)
        self.provider_help.Wrap(680)
        self.Layout()

    def _on_provider_changed(self, _event: wx.CommandEvent) -> None:
        self.use_custom.SetValue(False)
        self._update_custom_state()
        self._update_provider_help()

    def _on_custom_changed(self, _event: wx.CommandEvent) -> None:
        self._update_custom_state()

    def _update_custom_state(self) -> None:
        enabled = self.use_custom.GetValue()
        self.custom_command.Enable(enabled)
        self.provider_choice.Enable(not enabled)

    def _custom_settings(self) -> dict[str, Any]:
        command = [line.strip() for line in self.custom_command.GetValue().splitlines() if line.strip()]
        return {"command": command}

    def _save(self, _event: wx.CommandEvent) -> None:
        automatic = [task_type for task_type, check in self.task_checks.items() if check.GetValue()]
        adapter_id = "custom_command" if self.use_custom.GetValue() else self._selected_normal_adapter_id()
        settings = self._custom_settings() if adapter_id == "custom_command" else {}
        try:
            save_workspace_settings(
                self.storage_path,
                automatic_preparation=automatic,
                provider_adapter_id=adapter_id,
                provider_adapter_settings=settings,
            )
            load_workspace_config(self.storage_path)
        except (ValueError, OSError) as exc:
            self.error.SetLabel(str(exc))
            self.Layout()
            return
        self.EndModal(wx.ID_OK)
        if self.on_saved:
            wx.CallAfter(self.on_saved)

    def _open_task_json(self, _event: wx.CommandEvent) -> None:
        index = self.task_choice.GetSelection()
        if not 0 <= index < len(self.task_types):
            return
        try:
            target = ensure_task_definition_file(self.storage_path, self.task_types[index])
        except (ValueError, OSError) as exc:
            self.error.SetLabel(str(exc))
            return
        if not wx.LaunchDefaultApplication(str(target)):
            self.error.SetLabel(f"Could not open {target}")
