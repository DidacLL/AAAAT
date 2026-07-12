from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.db import connect
from aaaat.generation_policy import (
    SUPPORTED_GENERATION_TASKS,
    default_generation_tasks,
    save_default_generation_tasks,
)
from aaaat.task_definitions import (
    TaskDefinitionError,
    get_editable_template,
    get_task_definition,
    reset_task_definition,
    save_editable_template,
    save_task_definition,
)
from .agent_workflow import DESKTOP_TASK_TYPES

_TASK_LABELS = {
    "field_inference": "Analyze the full candidature from the offer",
    "company_research": "Research company context",
    "career_plan_review": "Evaluate fit against my career path",
    "draft_form_responses": "Prepare application form answers when a form is stored",
    "draft_cv": "Prepare a role-specific CV",
    "draft_cover_letter": "Prepare a cover letter",
}


class TaskDefinitionEditorService:
    """Load and save automatic-generation policy and advanced raw task configuration."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def load_policy(self) -> list[str]:
        with connect(self.storage_path) as conn:
            return default_generation_tasks(conn)

    def save_policy(self, task_types: list[str]) -> list[str]:
        with connect(self.storage_path) as conn:
            return save_default_generation_tasks(conn, task_types)

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
    """Automatic intake policy plus advanced raw task configuration."""

    def __init__(self, parent: wx.Window, *, service: TaskDefinitionEditorService, can_write: bool = True) -> None:
        super().__init__(
            parent,
            title="AI and document configuration",
            size=(850, 680),
            style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER,
        )
        self.service = service
        self.task_types = list(SUPPORTED_GENERATION_TASKS)

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        heading = wx.StaticText(self, label="AI and document configuration")
        heading.SetFont(heading.GetFont().Bold().Larger().Larger())
        explanation = wx.StaticText(
            self,
            label=(
                "AAAAT analyzes each pasted offer into the complete candidature workspace. "
                "Choose which additional preparation should run automatically. Document generation is optional."
            ),
        )
        explanation.Wrap(790)
        root.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        root.Add(explanation, 0, wx.ALL | wx.EXPAND, 14)

        notebook = wx.Notebook(self)
        root.Add(notebook, 1, wx.LEFT | wx.RIGHT | wx.EXPAND, 14)

        policy_panel = wx.Panel(notebook)
        policy_sizer = wx.BoxSizer(wx.VERTICAL)
        policy_panel.SetSizer(policy_sizer)
        policy_note = wx.StaticText(
            policy_panel,
            label="Automatic preparation for each new offer:",
        )
        policy_note.SetFont(policy_note.GetFont().Bold())
        policy_sizer.Add(policy_note, 0, wx.ALL, 12)
        self.policy_checks: dict[str, wx.CheckBox] = {}
        selected = set(self.service.load_policy())
        for task_type in SUPPORTED_GENERATION_TASKS:
            checkbox = wx.CheckBox(policy_panel, label=_TASK_LABELS[task_type])
            checkbox.SetValue(task_type in selected)
            checkbox.Enable(can_write)
            self.policy_checks[task_type] = checkbox
            policy_sizer.Add(checkbox, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 12)
        glossary_note = wx.StaticText(
            policy_panel,
            label="Missing definitions for keywords extracted from the offer are prepared automatically after analysis.",
        )
        glossary_note.Wrap(760)
        policy_sizer.Add(glossary_note, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 12)
        save_policy = wx.Button(policy_panel, label="Save automatic preparation")
        save_policy.Enable(can_write)
        save_policy.Bind(wx.EVT_BUTTON, self._on_save_policy)
        policy_sizer.Add(save_policy, 0, wx.ALL, 12)
        notebook.AddPage(policy_panel, "Automatic preparation")

        advanced_panel = wx.Panel(notebook)
        advanced_sizer = wx.BoxSizer(wx.VERTICAL)
        advanced_panel.SetSizer(advanced_sizer)
        advanced_note = wx.StaticText(
            advanced_panel,
            label="Advanced: edit the raw configuration for one preparation type.",
        )
        advanced_sizer.Add(advanced_note, 0, wx.ALL, 8)
        self.task_choice = wx.Choice(
            advanced_panel,
            choices=[_TASK_LABELS[key] for key in self.task_types],
        )
        self.task_choice.SetSelection(0)
        advanced_sizer.Add(self.task_choice, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        self.status = wx.StaticText(advanced_panel, label="")
        advanced_sizer.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        raw_notebook = wx.Notebook(advanced_panel)
        advanced_sizer.Add(raw_notebook, 1, wx.EXPAND)

        definition_panel = wx.Panel(raw_notebook)
        definition_sizer = wx.BoxSizer(wx.VERTICAL)
        definition_panel.SetSizer(definition_sizer)
        self.definition_text = wx.TextCtrl(definition_panel, style=wx.TE_MULTILINE)
        definition_sizer.Add(self.definition_text, 1, wx.ALL | wx.EXPAND, 8)
        raw_notebook.AddPage(definition_panel, "Task definition JSON")

        template_panel = wx.Panel(raw_notebook)
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
        raw_notebook.AddPage(template_panel, "Linked template")

        advanced_actions = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(advanced_panel, label="Save advanced configuration")
        reset = wx.Button(advanced_panel, label="Restore task default")
        save.Enable(can_write)
        reset.Enable(can_write)
        self.definition_text.Enable(can_write)
        self.required_variables_text.Enable(can_write)
        self.template_body_text.Enable(can_write)
        advanced_actions.Add(save, 0, wx.RIGHT, 6)
        advanced_actions.Add(reset, 0)
        advanced_sizer.Add(advanced_actions, 0, wx.ALL, 8)
        notebook.AddPage(advanced_panel, "Advanced")

        close = wx.Button(self, wx.ID_CLOSE, "Close")
        root.Add(close, 0, wx.ALL | wx.ALIGN_RIGHT, 14)

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

    def _on_save_policy(self, _event) -> None:
        selected = [task_type for task_type, checkbox in self.policy_checks.items() if checkbox.GetValue()]
        self.service.save_policy(selected)
        wx.MessageBox("Automatic preparation updated.", "AAAAT", wx.OK | wx.ICON_INFORMATION, self)

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
