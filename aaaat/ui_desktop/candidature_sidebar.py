from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from aaaat.task_registry import sidebar_task_definitions
from .scrolling import bind_parent_wheel_scroll


class CandidatureSidebar(wx.Panel):
    """Shared right-side context and assistance for Smart and Detailed views."""

    MODULES = (
        ("preparation", "Preparation"),
        ("keywords", "Keywords"),
        ("artifacts", "Artifacts"),
        ("company", "Company"),
        ("career", "Career fit"),
        ("forms", "Form answers"),
    )

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_run_action: Callable[[str], None],
        on_apply_task: Callable[[str], None],
        on_reject_task: Callable[[str], None],
        on_open_artifact: Callable[[str], None],
        on_register_artifact: Callable[[], None],
    ) -> None:
        super().__init__(parent)
        self.on_run_action = on_run_action
        self.on_apply_task = on_apply_task
        self.on_reject_task = on_reject_task
        self.on_open_artifact = on_open_artifact
        self.on_register_artifact = on_register_artifact
        self.detail: dict[str, Any] | None = None
        self.tasks: list[dict[str, Any]] = []
        self.module_id = "preparation"

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        self.heading = wx.StaticText(self, label="Candidature context")
        self.heading.SetFont(self.heading.GetFont().Bold().Larger())
        root.Add(self.heading, 0, wx.ALL | wx.EXPAND, 8)

        self.module_buttons = wx.WrapSizer(wx.HORIZONTAL)
        self._buttons: dict[str, wx.Button] = {}
        for module_id, label in self.MODULES:
            button = wx.Button(self, label=label, style=wx.BU_EXACTFIT)
            button.Bind(wx.EVT_BUTTON, lambda _event, key=module_id: self._select_module(key))
            self._buttons[module_id] = button
            self.module_buttons.Add(button, 0, wx.RIGHT | wx.BOTTOM, 4)
        root.Add(self.module_buttons, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        self.scroll = wx.ScrolledWindow(self, style=wx.VSCROLL)
        self.scroll.SetScrollRate(0, 12)
        self.body_sizer = wx.BoxSizer(wx.VERTICAL)
        self.scroll.SetSizer(self.body_sizer)
        root.Add(self.scroll, 1, wx.EXPAND)
        self.scroll.Bind(wx.EVT_SIZE, self._on_size)

    def render(self, detail: dict[str, Any] | None, tasks: list[dict[str, Any]]) -> None:
        self.detail = detail
        self.tasks = tasks
        company = str((detail or {}).get("company") or "")
        role = str((detail or {}).get("role") or "")
        self.heading.SetLabel(" · ".join(part for part in (company, role) if part) or "Candidature context")
        self._render_module()

    def _select_module(self, module_id: str) -> None:
        self.module_id = module_id
        self._render_module()

    def _render_module(self) -> None:
        self.body_sizer.Clear(delete_windows=True)
        for module_id, button in self._buttons.items():
            button.Enable(module_id != self.module_id)
        if not self.detail:
            self._add_text("Select a candidature to see its context and preparation.")
        elif self.module_id == "preparation":
            self._render_preparation()
        elif self.module_id == "keywords":
            self._render_keywords()
        elif self.module_id == "artifacts":
            self._render_artifacts()
        elif self.module_id == "company":
            self._add_text(str(self.detail.get("company_research") or "No company research yet."))
        elif self.module_id == "career":
            self._render_task_result("career_plan_review", "No career-fit evaluation yet.")
        elif self.module_id == "forms":
            self._add_text(str(self.detail.get("form_answers") or "No application form answers yet."))
        self._fit_width()
        bind_parent_wheel_scroll(self.scroll, self.scroll)

    def _render_preparation(self) -> None:
        actions = wx.CollapsiblePane(self.scroll, label="Prepare or refresh")
        panel = actions.GetPane()
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        for definition in sidebar_task_definitions():
            button = wx.Button(panel, label=definition.action_label)
            button.SetToolTip(definition.description)
            button.Bind(wx.EVT_BUTTON, lambda _event, key=definition.task_type: self.on_run_action(key))
            sizer.Add(button, 0, wx.BOTTOM | wx.EXPAND, 5)
        self.body_sizer.Add(actions, 0, wx.ALL | wx.EXPAND, 8)

        if not self.tasks:
            self._add_text("No preparation has been queued yet.")
            return
        for task in self.tasks:
            if task.get("task_type") == "keyword_definition":
                continue
            panel = wx.Panel(self.scroll, style=wx.BORDER_SIMPLE)
            panel_sizer = wx.BoxSizer(wx.VERTICAL)
            panel.SetSizer(panel_sizer)
            title = wx.StaticText(panel, label=str(task.get("title") or task.get("task_type") or "Preparation"))
            title.SetFont(title.GetFont().Bold())
            state = str(task.get("review_state") or task.get("state") or "")
            status = wx.StaticText(panel, label=state.replace("_", " ").title())
            panel_sizer.Add(title, 0, wx.ALL | wx.EXPAND, 7)
            panel_sizer.Add(status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
            if task.get("review_state") == "suggested":
                result = wx.StaticText(panel, label=self._result_summary(task))
                panel_sizer.Add(result, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
                buttons = wx.BoxSizer(wx.HORIZONTAL)
                use = wx.Button(panel, label="Use")
                discard = wx.Button(panel, label="Discard")
                use.Bind(wx.EVT_BUTTON, lambda _event, task_id=str(task["id"]): self.on_apply_task(task_id))
                discard.Bind(wx.EVT_BUTTON, lambda _event, task_id=str(task["id"]): self.on_reject_task(task_id))
                buttons.Add(use, 0, wx.RIGHT, 5)
                buttons.Add(discard, 0)
                panel_sizer.Add(buttons, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 7)
            elif task.get("state") == "blocked":
                error = wx.StaticText(panel, label=str(task.get("notes") or "Preparation failed."))
                panel_sizer.Add(error, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
            self.body_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _render_keywords(self) -> None:
        keywords = list(self.detail.get("keywords") or [])
        if not keywords:
            self._add_text("No keywords extracted yet.")
            return
        definitions = self.detail.get("keyword_definitions") or {}
        for keyword in keywords:
            body = str(definitions.get(keyword) or "Definition pending") if isinstance(definitions, dict) else "Definition pending"
            self._add_section(str(keyword), body)

    def _render_artifacts(self) -> None:
        add = wx.Button(self.scroll, label="Register existing file…")
        add.Bind(wx.EVT_BUTTON, lambda _event: self.on_register_artifact())
        self.body_sizer.Add(add, 0, wx.ALL, 8)
        artifacts = list(self.detail.get("artifacts") or [])
        if not artifacts:
            self._add_text("No artifacts registered yet.")
            return
        for artifact in artifacts:
            if not isinstance(artifact, dict):
                continue
            panel = wx.Panel(self.scroll, style=wx.BORDER_SIMPLE)
            sizer = wx.BoxSizer(wx.VERTICAL)
            panel.SetSizer(sizer)
            label = wx.StaticText(panel, label=str(artifact.get("label") or artifact.get("artifact_type") or "Artifact"))
            label.SetFont(label.GetFont().Bold())
            state = wx.StaticText(panel, label=str(artifact.get("review_state") or ""))
            open_button = wx.Button(panel, label="Open")
            open_button.Bind(wx.EVT_BUTTON, lambda _event, path=str(artifact.get("path") or ""): self.on_open_artifact(path))
            sizer.Add(label, 0, wx.ALL | wx.EXPAND, 7)
            sizer.Add(state, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
            sizer.Add(open_button, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 7)
            self.body_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _render_task_result(self, task_type: str, fallback: str) -> None:
        task = next((item for item in self.tasks if item.get("task_type") == task_type and item.get("result_body")), None)
        self._add_text(self._result_summary(task) if task else fallback)

    def _result_summary(self, task: dict[str, Any] | None) -> str:
        if not task:
            return ""
        body = str(task.get("result_body") or "")
        try:
            value = json.loads(body)
        except json.JSONDecodeError:
            return body
        if isinstance(value, dict):
            parts = []
            for key, item in value.items():
                if key in {"replace_existing", "confidence_notes", "sources_checked"}:
                    continue
                if isinstance(item, dict):
                    parts.append("\n".join(f"{field.replace('_', ' ').title()}: {content}" for field, content in item.items()))
                elif isinstance(item, list):
                    parts.append("\n".join(str(entry) for entry in item))
                else:
                    parts.append(str(item))
            return "\n\n".join(part for part in parts if part)
        return str(value)

    def _add_section(self, title: str, body: str) -> None:
        panel = wx.Panel(self.scroll, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        heading = wx.StaticText(panel, label=title)
        heading.SetFont(heading.GetFont().Bold())
        text = wx.StaticText(panel, label=body or "—")
        sizer.Add(heading, 0, wx.ALL | wx.EXPAND, 7)
        sizer.Add(text, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
        self.body_sizer.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _add_text(self, text: str) -> None:
        label = wx.StaticText(self.scroll, label=text or "—")
        self.body_sizer.Add(label, 0, wx.ALL | wx.EXPAND, 10)

    def _on_size(self, event: wx.SizeEvent) -> None:
        wx.CallAfter(self._fit_width)
        event.Skip()

    def _fit_width(self) -> None:
        width = max(1, self.scroll.GetClientSize().GetWidth())
        wrap = max(180, width - 28)
        for child in self.scroll.GetChildren():
            child.SetMinSize((max(1, width - 16), -1))
            for nested in child.GetChildren():
                if isinstance(nested, wx.StaticText):
                    nested.Wrap(wrap)
        for child in self.scroll.GetChildren():
            if isinstance(child, wx.StaticText):
                child.Wrap(wrap)
        self.scroll.Layout()
        self.scroll.FitInside()
        virtual_height = max(self.scroll.GetClientSize().GetHeight(), self.scroll.GetVirtualSize().GetHeight())
        self.scroll.SetVirtualSize((width, virtual_height))
