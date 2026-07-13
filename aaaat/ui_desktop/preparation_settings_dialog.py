from __future__ import annotations

from typing import Callable

import wx  # type: ignore[import-not-found]

from aaaat.task_registry import TASK_DEFINITIONS
from aaaat.workspace_config import (
    ensure_task_definition_file,
    load_workspace_config,
    save_workspace_settings,
)


class PreparationSettingsDialog(wx.Dialog):
    """Human-facing settings for automatic preparation and the external runner."""

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
            size=(760, 720),
            style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER,
        )
        self.storage_path = storage_path
        self.on_saved = on_saved
        self.config = load_workspace_config(storage_path)
        self.task_checks: dict[str, wx.CheckBox] = {}

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

        runner_box = wx.StaticBoxSizer(wx.VERTICAL, self, "External LLM runner")
        runner_help = wx.StaticText(
            runner_box.GetStaticBox(),
            label=(
                "AAAAT does not provide or select an LLM. Configure the command that receives one bounded task "
                "packet on standard input and returns one JSON result on standard output. Enter one executable or argument per line. "
                "Leave this empty to create tasks for manual or agent-driven completion."
            ),
        )
        runner_help.Wrap(680)
        self.runner = wx.TextCtrl(runner_box.GetStaticBox(), style=wx.TE_MULTILINE)
        self.runner.SetMinSize((-1, 105))
        self.runner.SetValue("\n".join(self.config["runner_command"]))
        runner_box.Add(runner_help, 0, wx.ALL | wx.EXPAND, 8)
        runner_box.Add(self.runner, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        root.Add(runner_box, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        advanced = wx.CollapsiblePane(self, label="Advanced task definitions")
        pane = advanced.GetPane()
        pane_sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(pane_sizer)
        advanced_help = wx.StaticText(
            pane,
            label=(
                "Each task has an exact JSON definition containing its instructions, response contract and artifact mapping. "
                "Editing these files changes future task snapshots only. Invalid definitions are rejected when AAAAT loads them."
            ),
        )
        advanced_help.Wrap(680)
        self.task_choice = wx.Choice(
            pane,
            choices=[TASK_DEFINITIONS[key].title for key in TASK_DEFINITIONS],
        )
        self.task_types = list(TASK_DEFINITIONS)
        self.task_choice.SetSelection(0)
        open_raw = wx.Button(pane, label="Open selected task JSON")
        open_raw.Bind(wx.EVT_BUTTON, self._open_task_json)
        pane_sizer.Add(advanced_help, 0, wx.ALL | wx.EXPAND, 8)
        pane_sizer.Add(self.task_choice, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        pane_sizer.Add(open_raw, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 8)
        root.Add(advanced, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        self.error = wx.StaticText(self, label="")
        root.Add(self.error, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)
        buttons = self.CreateSeparatedButtonSizer(wx.OK | wx.CANCEL)
        root.Add(buttons, 0, wx.ALL | wx.EXPAND, 14)
        ok = self.FindWindowById(wx.ID_OK)
        if ok:
            ok.SetLabel("Save settings")
            ok.Bind(wx.EVT_BUTTON, self._save)

    def _runner_command(self) -> list[str]:
        return [line.strip() for line in self.runner.GetValue().splitlines() if line.strip()]

    def _save(self, _event: wx.CommandEvent) -> None:
        automatic = [task_type for task_type, check in self.task_checks.items() if check.GetValue()]
        try:
            save_workspace_settings(
                self.storage_path,
                automatic_preparation=automatic,
                runner_command=self._runner_command(),
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
