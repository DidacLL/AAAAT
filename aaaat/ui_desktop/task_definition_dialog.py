from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.agent_access import TASK_PURPOSES
from aaaat.db import connect
from aaaat.task_definitions import (
    TaskDefinitionError,
    get_editable_template,
    get_task_definition,
    reset_task_definition,
    save_editable_template,
    save_task_definition,
)


class TaskDefinitionEditorService:
    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def load(self, task_type: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            definition = get_task_definition(conn, task_type)
            template = None
            if definition.get("artifact_template"):
                template = get_editable_template(conn, definition["artifact_template"])
            return {"definition": definition, "template": template}

    def save(
        self,
        task_type: str,
        *,
        title: str,
        instructions: str,
        response_format_text: str,
        artifact_template: str,
        artifact_mapping_text: str,
        template_body: str,
        required_variables_text: str,
    ) -> dict[str, Any]:
        try:
            response_format = json.loads(response_format_text)
            artifact_mapping = json.loads(artifact_mapping_text or "{}")
        except json.JSONDecodeError as exc:
            raise TaskDefinitionError("Response contract and artifact mapping must be valid JSON") from exc
        required_variables = [item.strip() for item in required_variables_text.splitlines() if item.strip()]
        with connect(self.storage_path) as conn:
            saved = save_task_definition(
                conn,
                task_type,
                {
                    "title": title,
                    "instructions": instructions,
                    "response_format": response_format,
                    "artifact_template": artifact_template,
                    "artifact_mapping": artifact_mapping,
                },
            )
            if artifact_template:
                save_editable_template(conn, artifact_template, template_body, required_variables)
            return saved

    def reset(self, task_type: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return reset_task_definition(conn, task_type)


class TaskDefinitionDialog(wx.Dialog):
    def __init__(self, parent: wx.Window, *, service: TaskDefinitionEditorService, can_write: bool) -> None:
        super().__init__(parent, title="Advanced task definitions", size=(960, 760), style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER)
        self.service = service
        self.can_write = can_write
        self.task_types = sorted(TASK_PURPOSES)

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        header = wx.StaticText(self, label="Task definitions control what AAAAT asks for and how structured results map into local artifacts. Authority, privacy scope, task binding, review, and apply rules are fixed by AAAAT.")
        header.Wrap(900)
        root.Add(header, 0, wx.ALL | wx.EXPAND, 10)

        self.task_choice = wx.Choice(self, choices=[item.replace("_", " ").title() for item in self.task_types])
        self.task_choice.SetSelection(0)
        root.Add(self.task_choice, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        notebook = wx.Notebook(self)
        root.Add(notebook, 1, wx.LEFT | wx.RIGHT | wx.EXPAND, 10)

        definition_panel = wx.Panel(notebook)
        definition_sizer = wx.BoxSizer(wx.VERTICAL)
        definition_panel.SetSizer(definition_sizer)
        self.status_label = wx.StaticText(definition_panel, label="")
        self.title_text = self._field(definition_panel, definition_sizer, "Title")
        self.instructions_text = self._field(definition_panel, definition_sizer, "Instructions", multiline=True)
        self.response_text = self._field(definition_panel, definition_sizer, "Response JSON contract", multiline=True)
        self.mapping_text = self._field(definition_panel, definition_sizer, "Result → template variable mapping", multiline=True)
        self.template_name_text = self._field(definition_panel, definition_sizer, "Linked template name")
        definition_sizer.Add(self.status_label, 0, wx.ALL | wx.EXPAND, 8)
        notebook.AddPage(definition_panel, "Task contract")

        template_panel = wx.Panel(notebook)
        template_sizer = wx.BoxSizer(wx.VERTICAL)
        template_panel.SetSizer(template_sizer)
        self.required_text = self._field(template_panel, template_sizer, "Required template variables (one per line)", multiline=True)
        self.template_body_text = self._field(template_panel, template_sizer, "TeX template", multiline=True, min_height=380)
        notebook.AddPage(template_panel, "Artifact template")

        preview_panel = wx.Panel(notebook)
        preview_sizer = wx.BoxSizer(wx.VERTICAL)
        preview_panel.SetSizer(preview_sizer)
        self.preview_text = wx.TextCtrl(preview_panel, style=wx.TE_MULTILINE | wx.TE_READONLY)
        preview_sizer.Add(self.preview_text, 1, wx.ALL | wx.EXPAND, 8)
        notebook.AddPage(preview_panel, "Structural packet preview")

        actions = wx.BoxSizer(wx.HORIZONTAL)
        save = wx.Button(self, label="Validate and save override")
        reset = wx.Button(self, label="Reset task definition")
        close = wx.Button(self, wx.ID_CLOSE, "Close")
        save.Enable(can_write)
        reset.Enable(can_write)
        actions.Add(save, 0, wx.RIGHT, 6)
        actions.Add(reset, 0, wx.RIGHT, 6)
        actions.AddStretchSpacer(1)
        actions.Add(close, 0)
        root.Add(actions, 0, wx.ALL | wx.EXPAND, 10)

        self.task_choice.Bind(wx.EVT_CHOICE, lambda _event: self._load())
        save.Bind(wx.EVT_BUTTON, self._on_save)
        reset.Bind(wx.EVT_BUTTON, self._on_reset)
        close.Bind(wx.EVT_BUTTON, lambda _event: self.EndModal(wx.ID_CLOSE))
        for control in (self.title_text, self.instructions_text, self.response_text, self.mapping_text, self.template_name_text, self.required_text, self.template_body_text):
            control.Enable(can_write)
            control.Bind(wx.EVT_TEXT, lambda _event: self._refresh_preview())
        self._load()

    def _field(self, parent, sizer, label: str, *, multiline: bool = False, min_height: int = 90):
        heading = wx.StaticText(parent, label=label)
        heading.SetFont(heading.GetFont().Bold())
        style = wx.TE_MULTILINE if multiline else 0
        control = wx.TextCtrl(parent, style=style)
        if multiline:
            control.SetMinSize((-1, min_height))
        sizer.Add(heading, 0, wx.LEFT | wx.RIGHT | wx.TOP | wx.EXPAND, 8)
        sizer.Add(control, 0 if not multiline else 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)
        return control

    def _task_type(self) -> str:
        return self.task_types[self.task_choice.GetSelection()]

    def _load(self) -> None:
        loaded = self.service.load(self._task_type())
        definition = loaded["definition"]
        template = loaded["template"] or {"body": "", "required_variables": []}
        self.title_text.SetValue(str(definition["title"]))
        self.instructions_text.SetValue(str(definition["instructions"]))
        self.response_text.SetValue(json.dumps(definition["response_format"], indent=2, ensure_ascii=False))
        self.mapping_text.SetValue(json.dumps(definition.get("artifact_mapping") or {}, indent=2, ensure_ascii=False))
        self.template_name_text.SetValue(str(definition.get("artifact_template") or ""))
        self.required_text.SetValue("\n".join(template.get("required_variables") or []))
        self.template_body_text.SetValue(str(template.get("body") or ""))
        status = f"Version {definition['version']} · {'custom override' if definition.get('is_custom') else 'default'}"
        self.status_label.SetLabel(status)
        self._refresh_preview()

    def _refresh_preview(self) -> None:
        try:
            response = json.loads(self.response_text.GetValue() or "{}")
            mapping = json.loads(self.mapping_text.GetValue() or "{}")
        except json.JSONDecodeError:
            response = {"error": "Invalid JSON"}
            mapping = {}
        preview = {
            "task_type": self._task_type(),
            "instructions": {"default": self.instructions_text.GetValue()},
            "input_context": "<purpose-scoped candidature data is inserted when a task is created>",
            "response_format": response,
            "artifact_contract": {
                "template": self.template_name_text.GetValue(),
                "variable_mapping": mapping,
            },
            "fixed_by_aaaat": {
                "task_binding": "opaque task handle",
                "allowed_actions": ["context", "submit"],
                "review_state": "suggested",
                "auto_apply": False,
            },
        }
        self.preview_text.SetValue(json.dumps(preview, indent=2, ensure_ascii=False))

    def _on_save(self, _event) -> None:
        try:
            saved = self.service.save(
                self._task_type(),
                title=self.title_text.GetValue(),
                instructions=self.instructions_text.GetValue(),
                response_format_text=self.response_text.GetValue(),
                artifact_template=self.template_name_text.GetValue().strip(),
                artifact_mapping_text=self.mapping_text.GetValue(),
                template_body=self.template_body_text.GetValue(),
                required_variables_text=self.required_text.GetValue(),
            )
        except (TaskDefinitionError, ValueError, KeyError) as exc:
            self.status_label.SetLabel(str(exc))
            return
        self.status_label.SetLabel(f"Saved version {saved['version']} · custom override")
        self._refresh_preview()

    def _on_reset(self, _event) -> None:
        self.service.reset(self._task_type())
        self._load()
