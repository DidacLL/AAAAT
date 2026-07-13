from __future__ import annotations

import json
from typing import Any, Callable

import wx  # type: ignore[import-not-found]

from aaaat.task_registry import sidebar_task_definitions


class CandidatureSidebar(wx.Panel):
    """Shared right-side candidature context for Smart and Detailed views."""

    MODULES = ("Preparation", "Keywords", "Artifacts", "Company", "Career fit", "Form answers")

    def __init__(
        self,
        parent: wx.Window,
        *,
        on_run_action: Callable[[str], None],
        on_apply_task: Callable[[str], None],
        on_reject_task: Callable[[str], None],
    ) -> None:
        super().__init__(parent)
        self.on_run_action = on_run_action
        self.on_apply_task = on_apply_task
        self.on_reject_task = on_reject_task
        self.detail: dict[str, Any] | None = None
        self.tasks: list[dict[str, Any]] = []

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)
        self.heading = wx.StaticText(self, label="Candidature context")
        self.heading.SetFont(self.heading.GetFont().Bold().Larger())
        self.module = wx.Choice(self, choices=list(self.MODULES))
        self.module.SetSelection(0)
        self.module.Bind(wx.EVT_CHOICE, lambda _event: self._render_body())
        root.Add(self.heading, 0, wx.ALL | wx.EXPAND, 8)
        root.Add(self.module, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

        self.scroll = wx.ScrolledWindow(self, style=wx.VSCROLL)
        self.scroll.SetScrollRate(0, 12)
        self.body = wx.BoxSizer(wx.VERTICAL)
        self.scroll.SetSizer(self.body)
        self.scroll.Bind(wx.EVT_SIZE, self._on_size)
        root.Add(self.scroll, 1, wx.EXPAND)

    def render(self, detail: dict[str, Any] | None, tasks: list[dict[str, Any]]) -> None:
        self.detail = detail
        self.tasks = tasks
        company = str((detail or {}).get("company") or "")
        role = str((detail or {}).get("role") or "")
        self.heading.SetLabel(" · ".join(part for part in (company, role) if part) or "Candidature context")
        self._render_body()

    def _render_body(self) -> None:
        self.body.Clear(delete_windows=True)
        if not self.detail:
            self._add_text("Select a candidature.")
        else:
            selected = self.module.GetStringSelection()
            if selected == "Preparation":
                self._render_preparation()
            elif selected == "Keywords":
                self._render_keywords()
            elif selected == "Artifacts":
                self._render_artifacts()
            elif selected == "Company":
                self._add_text(str(self.detail.get("company_research") or "No company research yet."))
            elif selected == "Career fit":
                self._render_latest_result("career_plan_review", "No career-path evaluation yet.")
            else:
                self._add_text(str(self.detail.get("form_answers") or "No application-form answers yet."))
        self._fit_width()

    def _render_preparation(self) -> None:
        actions = wx.CollapsiblePane(self.scroll, label="Prepare or refresh")
        pane = actions.GetPane()
        pane_sizer = wx.BoxSizer(wx.VERTICAL)
        pane.SetSizer(pane_sizer)
        for definition in sidebar_task_definitions():
            button = wx.Button(pane, label=definition.action_label)
            button.SetToolTip(definition.description)
            button.Bind(wx.EVT_BUTTON, lambda _event, key=definition.task_type: self.on_run_action(key))
            pane_sizer.Add(button, 0, wx.BOTTOM | wx.EXPAND, 5)
        self.body.Add(actions, 0, wx.ALL | wx.EXPAND, 8)

        visible = [task for task in self.tasks if task.get("task_type") != "keyword_definition"]
        if not visible:
            self._add_text("No preparation tasks yet.")
            return
        for task in visible:
            panel = wx.Panel(self.scroll, style=wx.BORDER_SIMPLE)
            sizer = wx.BoxSizer(wx.VERTICAL)
            panel.SetSizer(sizer)
            title = wx.StaticText(panel, label=str(task.get("title") or task.get("task_type") or "Preparation"))
            title.SetFont(title.GetFont().Bold())
            state = str(task.get("review_state") or task.get("state") or "")
            status = wx.StaticText(panel, label=state.replace("_", " ").title())
            sizer.Add(title, 0, wx.ALL | wx.EXPAND, 7)
            sizer.Add(status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
            if task.get("result_body"):
                result = wx.StaticText(panel, label=self._result_summary(str(task.get("result_body") or "")))
                sizer.Add(result, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
                if task.get("review_state") == "suggested":
                    buttons = wx.BoxSizer(wx.HORIZONTAL)
                    use = wx.Button(panel, label="Use")
                    discard = wx.Button(panel, label="Discard")
                    task_id = str(task.get("id") or "")
                    use.Bind(wx.EVT_BUTTON, lambda _event, value=task_id: self.on_apply_task(value))
                    discard.Bind(wx.EVT_BUTTON, lambda _event, value=task_id: self.on_reject_task(value))
                    buttons.Add(use, 0, wx.RIGHT, 5)
                    buttons.Add(discard, 0)
                    sizer.Add(buttons, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 7)
            elif task.get("state") == "blocked":
                sizer.Add(wx.StaticText(panel, label=str(task.get("notes") or "Preparation failed.")), 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
            self.body.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _render_keywords(self) -> None:
        keywords = list(self.detail.get("keywords") or [])
        definitions = self.detail.get("keyword_definitions") or {}
        if not keywords:
            self._add_text("No keywords extracted yet.")
            return
        for keyword in keywords:
            text = str(definitions.get(keyword) or "Definition pending") if isinstance(definitions, dict) else "Definition pending"
            self._add_section(str(keyword), text)

    def _render_artifacts(self) -> None:
        artifacts = list(self.detail.get("artifacts") or [])
        if not artifacts:
            self._add_text("No artifacts registered yet.")
            return
        for artifact in artifacts:
            if isinstance(artifact, dict):
                self._add_section(str(artifact.get("label") or artifact.get("artifact_type") or "Artifact"), str(artifact.get("review_state") or artifact.get("path") or ""))

    def _render_latest_result(self, task_type: str, fallback: str) -> None:
        for task in self.tasks:
            if task.get("task_type") == task_type and task.get("result_body"):
                self._add_text(self._result_summary(str(task["result_body"])))
                return
        self._add_text(fallback)

    @staticmethod
    def _result_summary(body: str) -> str:
        try:
            value = json.loads(body)
        except json.JSONDecodeError:
            return body
        if not isinstance(value, dict):
            return str(value)
        lines: list[str] = []
        for key, item in value.items():
            if key in {"replace_existing", "confidence_notes", "sources_checked"}:
                continue
            label = key.replace("_", " ").title()
            if isinstance(item, dict):
                lines.append(label + ":\n" + "\n".join(f"{name.replace('_', ' ').title()}: {content}" for name, content in item.items()))
            elif isinstance(item, list):
                lines.append(label + ":\n" + "\n".join(str(entry) for entry in item))
            else:
                lines.append(f"{label}: {item}")
        return "\n\n".join(lines)

    def _add_section(self, title: str, text: str) -> None:
        panel = wx.Panel(self.scroll, style=wx.BORDER_SIMPLE)
        sizer = wx.BoxSizer(wx.VERTICAL)
        panel.SetSizer(sizer)
        heading = wx.StaticText(panel, label=title)
        heading.SetFont(heading.GetFont().Bold())
        body = wx.StaticText(panel, label=text or "—")
        sizer.Add(heading, 0, wx.ALL | wx.EXPAND, 7)
        sizer.Add(body, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 7)
        self.body.Add(panel, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 8)

    def _add_text(self, text: str) -> None:
        self.body.Add(wx.StaticText(self.scroll, label=text or "—"), 0, wx.ALL | wx.EXPAND, 10)

    def _on_size(self, event: wx.SizeEvent) -> None:
        wx.CallAfter(self._fit_width)
        event.Skip()

    def _fit_width(self) -> None:
        width = max(1, self.scroll.GetClientSize().GetWidth())
        wrap = max(160, width - 30)
        for child in self.scroll.GetChildren():
            for nested in child.GetChildren():
                if isinstance(nested, wx.StaticText):
                    nested.Wrap(wrap)
            if isinstance(child, wx.StaticText):
                child.Wrap(wrap)
        self.scroll.Layout()
        self.scroll.FitInside()
        self.scroll.SetVirtualSize((width, self.scroll.GetVirtualSize().GetHeight()))
