from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from aaaat.db import connect, profile_variables, set_profile_variable
from .agent_workflow import DesktopAgentWorkflowError, DesktopAgentWorkflowService
from .candidature_actions import ACTIONS

_ACTION_BY_KEY = {action.key: action for action in ACTIONS}


class AgentActionDialog(wx.Dialog):
    """One supplementary preparation request for one candidature."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        service: DesktopAgentWorkflowService,
        candidature_ref: str,
        candidature_label: str,
        action_key: str,
        on_changed,
    ) -> None:
        action = _ACTION_BY_KEY[action_key]
        super().__init__(
            parent,
            title=action.label,
            size=(700, 560),
            style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER,
        )
        self.service = service
        self.candidature_ref = candidature_ref
        self.action_key = action_key
        self.on_changed = on_changed
        self.task: dict[str, Any] | None = self._existing_task()

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        title = wx.StaticText(self, label=action.label)
        title.SetFont(title.GetFont().Bold().Larger().Larger())
        subtitle = wx.StaticText(self, label=candidature_label)
        subtitle.SetFont(subtitle.GetFont().Bold().Larger())
        description = wx.StaticText(self, label=action.description)
        description.Wrap(650)
        root.Add(title, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        root.Add(subtitle, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        root.Add(description, 0, wx.ALL | wx.EXPAND, 14)

        primary = wx.BoxSizer(wx.HORIZONTAL)
        self.ask_button = wx.Button(self, label="Prepare")
        self.ask_button.SetDefault()
        self.configure_button = wx.Button(self, label="AI connection…")
        primary.Add(self.ask_button, 0, wx.RIGHT, 8)
        primary.Add(self.configure_button, 0)
        root.Add(primary, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 14)

        alternatives = wx.CollapsiblePane(self, label="Other ways")
        alternative_panel = alternatives.GetPane()
        alternative_sizer = wx.BoxSizer(wx.HORIZONTAL)
        alternative_panel.SetSizer(alternative_sizer)
        self.copy_button = wx.Button(alternative_panel, label="Copy request")
        self.import_button = wx.Button(alternative_panel, label="Import answer…")
        alternative_sizer.Add(self.copy_button, 0, wx.ALL, 6)
        alternative_sizer.Add(self.import_button, 0, wx.ALL, 6)
        root.Add(alternatives, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        self.result_label = wx.StaticText(self, label="Prepared result")
        self.result_label.SetFont(self.result_label.GetFont().Bold())
        self.result_text = wx.TextCtrl(self, style=wx.TE_MULTILINE)
        root.Add(self.result_label, 0, wx.LEFT | wx.RIGHT | wx.TOP, 14)
        root.Add(self.result_text, 1, wx.ALL | wx.EXPAND, 14)

        result_actions = wx.BoxSizer(wx.HORIZONTAL)
        self.use_button = wx.Button(self, label="Use this")
        self.discard_button = wx.Button(self, label="Discard")
        result_actions.Add(self.use_button, 0, wx.RIGHT, 8)
        result_actions.Add(self.discard_button, 0)
        root.Add(result_actions, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 14)

        self.status = wx.StaticText(self, label="")
        self.status.Wrap(650)
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 14)

        close = wx.Button(self, wx.ID_CLOSE, "Close")
        root.Add(close, 0, wx.ALL | wx.ALIGN_RIGHT, 14)

        self.ask_button.Bind(wx.EVT_BUTTON, self._on_ask)
        self.configure_button.Bind(wx.EVT_BUTTON, self._on_configure)
        self.copy_button.Bind(wx.EVT_BUTTON, self._on_copy)
        self.import_button.Bind(wx.EVT_BUTTON, self._on_import)
        self.use_button.Bind(wx.EVT_BUTTON, self._on_use)
        self.discard_button.Bind(wx.EVT_BUTTON, self._on_discard)
        close.Bind(wx.EVT_BUTTON, lambda _event: self.EndModal(wx.ID_CLOSE))
        self._reload()

    def _existing_task(self) -> dict[str, Any] | None:
        tasks = self.service.list_tasks(self.candidature_ref)
        return next(
            (
                item
                for item in tasks
                if item.get("task_type") == self.action_key
                and item.get("state") not in {"cancelled"}
            ),
            None,
        )

    def _ensure_task(self) -> dict[str, Any]:
        if self.task is None:
            self.task = self.service.create_task(self.candidature_ref, self.action_key)
        return self.task

    def _agent_command(self) -> str:
        with connect(self.service.storage_path) as conn:
            return str(profile_variables(conn).get("agent.command") or "").strip()

    def _reload(self) -> None:
        if self.task is not None:
            tasks = self.service.list_tasks(self.candidature_ref)
            self.task = next((item for item in tasks if item["id"] == self.task["id"]), self.task)
        current = self.task or {}
        body = str(current.get("result_body") or "")
        if body:
            try:
                value = json.loads(body)
                body = json.dumps(value, indent=2, ensure_ascii=False)
            except json.JSONDecodeError:
                pass
        self.result_text.SetValue(body)
        has_result = bool(current.get("result_blob_id")) and current.get("review_state") == "suggested"
        self.result_label.Show(has_result)
        self.result_text.Show(has_result)
        self.use_button.Show(has_result)
        self.discard_button.Show(has_result)
        self.Layout()

    def _on_ask(self, _event) -> None:
        command = self._agent_command()
        if not command:
            self.status.SetLabel("Connect your preferred AI once, then use this action from any candidature.")
            self._on_configure(None)
            return
        task = self._ensure_task()
        self.status.SetLabel("Preparing…")
        wx.YieldIfNeeded()
        try:
            self.task = self.service.run_command(task["id"], command)
        except DesktopAgentWorkflowError as exc:
            self.status.SetLabel(f"The AI connection did not return a usable answer: {exc}")
            return
        self.status.SetLabel("Ready. Review it, change it if needed, then choose Use this.")
        self._reload()

    def _on_configure(self, _event) -> None:
        dialog = wx.TextEntryDialog(
            self,
            "Command used to call your preferred AI. It receives JSON on stdin and returns JSON on stdout.",
            "AI connection",
            value=self._agent_command(),
            style=wx.OK | wx.CANCEL | wx.TE_MULTILINE,
        )
        try:
            if dialog.ShowModal() != wx.ID_OK:
                return
            command = dialog.GetValue().strip()
        finally:
            dialog.Destroy()
        with connect(self.service.storage_path) as conn:
            set_profile_variable(conn, "agent.command", command)
        self.status.SetLabel("AI connection saved locally.")

    def _on_copy(self, _event) -> None:
        task = self._ensure_task()
        try:
            path = self.service.export_packet(task["id"])
            text = path.read_text(encoding="utf-8")
        except (DesktopAgentWorkflowError, OSError, ValueError, KeyError) as exc:
            self.status.SetLabel(str(exc))
            return
        if wx.TheClipboard.Open():
            wx.TheClipboard.SetData(wx.TextDataObject(text))
            wx.TheClipboard.Close()
            self.status.SetLabel("Request copied. Paste it into another AI, then import its JSON answer here.")
        else:
            self.status.SetLabel(f"Request saved at {path}")

    def _on_import(self, _event) -> None:
        task = self._ensure_task()
        with wx.FileDialog(
            self,
            "Import AI answer",
            wildcard="JSON files (*.json)|*.json",
            style=wx.FD_OPEN | wx.FD_FILE_MUST_EXIST,
        ) as dialog:
            if dialog.ShowModal() != wx.ID_OK:
                return
            path = Path(dialog.GetPath())
        try:
            self.task = self.service.submit_result_file(task["id"], path)
        except DesktopAgentWorkflowError as exc:
            self.status.SetLabel(f"This answer does not match the requested result: {exc}")
            return
        self.status.SetLabel("Ready. Review it, change it if needed, then choose Use this.")
        self._reload()

    def _on_use(self, _event) -> None:
        if self.task is None:
            return
        try:
            self.task = self.service.update_result(self.task["id"], self.result_text.GetValue())
            if self.action_key in {"draft_cv", "draft_cover_letter"}:
                self.service.render_cover_letter(self.task["id"])
            self.task = self.service.apply_result(self.task["id"])
        except DesktopAgentWorkflowError as exc:
            self.status.SetLabel(str(exc))
            return
        self.on_changed()
        self.status.SetLabel("Done. The prepared result is now available in this candidature.")
        self._reload()

    def _on_discard(self, _event) -> None:
        if self.task is None:
            return
        try:
            self.task = self.service.reject_result(self.task["id"])
        except DesktopAgentWorkflowError as exc:
            self.status.SetLabel(str(exc))
            return
        self.on_changed()
        self.status.SetLabel("Discarded.")
        self._reload()
