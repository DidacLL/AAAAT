from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.db import connect
from aaaat.task_definitions import (
    TaskDefinitionError,
    get_editable_template,
    get_task_definition,
    reset_task_definition,
    save_editable_template,
    save_task_definition,
)
from .agent_workflow import DESKTOP_TASK_TYPES


class TaskDefinitionEditorService:
    """Load and save the advanced raw task configuration."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def load(self, task_type: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            definition = get_task_definition(conn, task_type)
            template = None
            if definition.get("artifact_template"):
                template = get_editable_template(conn, definition["artifact_template"])
            document = {
                "title": definition["title"],
                "instructions": definition["instructions"],
                "response_format": definition["response_format"],
                "artifact_template": definition.get("artifact_template") or "",
                "artifact_mapping": definition.get("artifact_mapping") or {},
            }
            return {
                "version": definition["version"],
                "is_custom": definition.get("is_custom", False),
                "document": document,
                "template": template,
            }

    def save(
        self,
        task_type: str,
        *,
        definition_text: str,
        template_body: str,
        required_variables_text: str,
    ) -> dict[str, Any]:
        try:
            document = json.loads(definition_text)
        except json.JSONDecodeError as exc:
            raise TaskDefinitionError("Task configuration must be valid JSON") from exc
        if not isinstance(document, dict):
            raise TaskDefinitionError("Task configuration must be one JSON object")
        required_keys = {
            "title",
            "instructions",
            "response_format",
            "artifact_template",
            "artifact_mapping",
        }
        missing = required_keys - document.keys()
        if missing:
            raise TaskDefinitionError(f"Task configuration is missing: {sorted(missing)}")

        required_variables = [item.strip() for item in required_variables_text.splitlines() if item.strip()]
        with connect(self.storage_path) as conn:
            saved = save_task_definition(
                conn,
                task_type,
                {key: document[key] for key in required_keys},
            )
            template_name = str(document.get("artifact_template") or "")
            if template_name:
                save_editable_template(conn, template_name, template_body, required_variables)
            return saved

    def reset(self, task_type: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return reset_task_definition(conn, task_type)


class TaskDefinitionDialog(wx.Dialog):
    """Advanced raw configuration, kept outside the normal candidature workflow."""

    def __init__(self, parent: wx.Window, *, service: TaskDefinitionEditorService, can_write: bool = True) -> None:
        super().__init__(
            parent,
            title="Advanced AI and template configuration",
            size=(850, 680),
            style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER,
        )
        self.service = service
        self.task_types = list(DESKTOP_TASK_TYPES)

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        heading = wx.StaticText(self, label="Advanced configuration")
        heading.SetFont(heading.GetFont().Bold().Larger().Larger())
        explanation = wx.StaticText(
            self,
            label=(
                "Most users never need this screen. It exposes the raw task definition and the linked "
                "template for users who deliberately customize their AI workflow."
            ),
        )
        explanation.Wrap(790)
        root.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        root.Add(explanation, 0, wx.ALL | wx.EXPAND, 14)

        self.task_choice = wx.Choice(
            self,
            choices=[DESKTOP_TASK_TYPES[key][0] for key in self.task_types],
        )
        self.task_choice.SetSelection(0)
        root.Add(self.task_choice, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        self.status = wx.StaticText(self, label="")
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        notebook = wx.Notebook(self)
        root.Add(notebook, 1, wx.LEFT | wx.RIGHT | wx.EXPAND, 14)

        definition_panel = wx.Panel(notebook)
        definition_sizer = wx.BoxSizer(wx.VERTICAL)
        definition_panel.SetSizer(definition_sizer)
        self.definition_text = wx.TextCtrl(definition_panel, style=wx.TE_MULTILINE)
        definition_sizer.Add(self.definition_text, 1, wx.ALL | wx.EXPAND, 8)
        notebook.AddPage(definition_panel, "Task definition JSON")

        template_panel = wx.Panel(notebook)
        template_sizer = wx.BoxSizer(wx.VERTICAL)
        template_panel.SetSizer(template_sizer)
        variables_label = wx.StaticText(template_panel, label="Required template variables, one per line")
        self.required_variables_text = wx.TextCtrl(template_panel, style=wx.TE_MULTILINE)
        self.required_variables_text.SetMinSize((-1, 100))
        template_label = wx.StaticText(template_panel, label="Template source")
        self.template_body_text = wx.TextCtrl(template_panel, style=wx.TE_MULTILINE)
        template_sizer.Add(variables_label, 0, wx.ALL, 8)
        template_sizer.Add(self.required_variables_text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        template_sizer.Add(template_label, 0, wx.LEFT | wx.RIGHT | wx.TOP, 8)
        template_sizer.Add(self.template_body_text, 1, wx.ALL | wx.EXPAND, 8)
        notebook.AddPage(template_panel, "Linked template")

        actions = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(self, label="Save configuration")
        reset = wx.Button(self, label="Restore default")
        close = wx.Button(self, wx.ID_CLOSE, "Close")
        save.Enable(can_write)
        reset.Enable(can_write)
        self.definition_text.Enable(can_write)
        self.required_variables_text.Enable(can_write)
        self.template_body_text.Enable(can_write)
        actions.Add(save, 0, wx.RIGHT, 6)
        actions.Add(reset, 0, wx.RIGHT, 6)
        actions.AddStretchSpacer(1)
        actions.Add(close, 0)
        root.Add(actions, 0, wx.ALL | wx.EXPAND, 14)

        self.task_choice.Bind(wx.EVT_CHOICE, lambda _event: self._load())
        save.Bind(wx.EVT_BUTTON, self._on_save)
        reset.Bind(wx.EVT_BUTTON, self._on_reset)
        close.Bind(wx.EVT_BUTTON, lambda _event: self.EndModal(wx.ID_CLOSE))
        self._load()

    def _task_type(self) -> str:
        return self.task_types[self.task_choice.GetSelection()]

    def _load(self) -> None:
        loaded = self.service.load(self._task_type())
        self.definition_text.SetValue(json.dumps(loaded["document"], indent=2, ensure_ascii=False))
        template = loaded.get("template") or {"body": "", "required_variables": []}
        self.required_variables_text.SetValue("\n".join(template.get("required_variables") or []))
        self.template_body_text.SetValue(str(template.get("body") or ""))
        state = "custom" if loaded.get("is_custom") else "default"
        self.status.SetLabel(f"Version {loaded['version']} · {state}")

    def _on_save(self, _event) -> None:
        try:
            saved = self.service.save(
                self._task_type(),
                definition_text=self.definition_text.GetValue(),
                template_body=self.template_body_text.GetValue(),
                required_variables_text=self.required_variables_text.GetValue(),
            )
        except (TaskDefinitionError, ValueError, KeyError) as exc:
            self.status.SetLabel(str(exc))
            return
        self.status.SetLabel(f"Saved version {saved['version']}")

    def _on_reset(self, _event) -> None:
        self.service.reset(self._task_type())
        self._load()
