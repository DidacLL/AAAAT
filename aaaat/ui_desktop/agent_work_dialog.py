from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import wx  # type: ignore[import-not-found]

from .agent_workflow import DESKTOP_TASK_TYPES, DesktopAgentWorkflowError, DesktopAgentWorkflowService


class AgentWorkDialog(wx.Dialog):
    """Small desktop workflow for dispatch, review, apply, and cover-letter render."""

    def __init__(
        self,
        parent: wx.Window,
        *,
        service: DesktopAgentWorkflowService,
        candidature_ref: str,
        can_write: bool,
        on_changed,
    ) -> None:
        super().__init__(parent, title="Agent work", size=(780, 620), style=wx.DEFAULT_DIALOG_STYLE | wx.RESIZE_BORDER)
        self.service = service
        self.candidature_ref = candidature_ref
        self.can_write = can_write
        self.on_changed = on_changed
        self.tasks: list[dict[str, Any]] = []

        root = wx.BoxSizer(wx.VERTICAL)
        self.SetSizer(root)

        create_row = wx.BoxSizer(wx.HORIZONTAL)
        self.task_type = wx.Choice(self, choices=[DESKTOP_TASK_TYPES[key][0] for key in DESKTOP_TASK_TYPES])
        self.task_type.SetSelection(0)
        self.create_button = wx.Button(self, label="Create task")
        create_row.Add(self.task_type, 1, wx.RIGHT | wx.EXPAND, 6)
        create_row.Add(self.create_button, 0)
        root.Add(create_row, 0, wx.ALL | wx.EXPAND, 10)

        self.task_list = wx.ListBox(self)
        root.Add(self.task_list, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        action_row = wx.BoxSizer(wx.HORIZONTAL)
        self.export_button = wx.Button(self, label="Export packet")
        self.import_button = wx.Button(self, label="Import result")
        self.render_button = wx.Button(self, label="Render cover letter")
        self.apply_button = wx.Button(self, label="Apply")
        self.reject_button = wx.Button(self, label="Reject")
        for button in (self.export_button, self.import_button, self.render_button, self.apply_button, self.reject_button):
            action_row.Add(button, 0, wx.RIGHT, 6)
        root.Add(action_row, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM, 10)

        self.result_text = wx.TextCtrl(self, style=wx.TE_MULTILINE | wx.TE_READONLY)
        root.Add(self.result_text, 1, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        self.status = wx.StaticText(self, label="")
        root.Add(self.status, 0, wx.LEFT | wx.RIGHT | wx.BOTTOM | wx.EXPAND, 10)

        close_button = wx.Button(self, wx.ID_CLOSE, "Close")
        root.Add(close_button, 0, wx.ALL | wx.ALIGN_RIGHT, 10)

        self.create_button.Bind(wx.EVT_BUTTON, self._on_create)
        self.task_list.Bind(wx.EVT_LISTBOX, self._on_select)
        self.export_button.Bind(wx.EVT_BUTTON, self._on_export)
        self.import_button.Bind(wx.EVT_BUTTON, self._on_import)
        self.render_button.Bind(wx.EVT_BUTTON, self._on_render)
        self.apply_button.Bind(wx.EVT_BUTTON, self._on_apply)
        self.reject_button.Bind(wx.EVT_BUTTON, self._on_reject)
        close_button.Bind(wx.EVT_BUTTON, lambda _event: self.EndModal(wx.ID_CLOSE))

        self.create_button.Enable(can_write)
        self.import_button.Enable(can_write)
        self.render_button.Enable(can_write)
        self.apply_button.Enable(can_write)
        self.reject_button.Enable(can_write)
        self._reload()

    def _selected_task(self) -> dict[str, Any] | None:
        index = self.task_list.GetSelection()
        return self.tasks[index] if 0 <= index < len(self.tasks) else None

    def _reload(self, *, preserve_id: str | None = None) -> None:
        self.tasks = self.service.list_tasks(self.candidature_ref)
        labels = [
            f"{task['title']} · {task['state']}"
            + (f" · {task['review_state']}" if task.get("review_state") else "")
            for task in self.tasks
        ]
        self.task_list.Set(labels)
        target = 0
        if preserve_id:
            for index, task in enumerate(self.tasks):
                if task["id"] == preserve_id:
                    target = index
                    break
        if self.tasks:
            self.task_list.SetSelection(target)
        self._show_selected()

    def _show_selected(self) -> None:
        task = self._selected_task()
        if not task:
            self.result_text.SetValue("")
            return
        body = str(task.get("result_body") or "")
        try:
            parsed = json.loads(body) if body else None
            body = json.dumps(parsed, indent=2, ensure_ascii=False) if parsed is not None else ""
        except json.JSONDecodeError:
            pass
        self.result_text.SetValue(body)
        self.render_button.Enable(self.can_write and task.get("task_type") == "draft_cover_letter" and bool(task.get("result_blob_id")))
        self.apply_button.Enable(self.can_write and bool(task.get("result_blob_id") or task.get("artifact_id")))
        self.reject_button.Enable(self.can_write and bool(task.get("result_blob_id")))

    def _run(self, operation, *, success: str, task_id: str | None = None) -> None:
        try:
            result = operation()
        except (DesktopAgentWorkflowError, ValueError, KeyError, OSError) as exc:
            self.status.SetLabel(str(exc))
            return
        selected_id = task_id
        if isinstance(result, dict):
            selected_id = str(result.get("id") or (result.get("task") or {}).get("id") or selected_id or "")
        self.status.SetLabel(success)
        self._reload(preserve_id=selected_id)
        self.on_changed()

    def _on_create(self, _event) -> None:
        task_type = list(DESKTOP_TASK_TYPES)[self.task_type.GetSelection()]
        self._run(
            lambda: self.service.create_task(self.candidature_ref, task_type),
            success="Task ready for dispatch.",
        )

    def _on_select(self, _event) -> None:
        self._show_selected()

    def _on_export(self, _event) -> None:
        task = self._selected_task()
        if not task:
            return
        try:
            path = self.service.export_packet(task["id"])
        except (DesktopAgentWorkflowError, ValueError, KeyError, OSError) as exc:
            self.status.SetLabel(str(exc))
            return
        if wx.TheClipboard.Open():
            wx.TheClipboard.SetData(wx.TextDataObject(path.read_text(encoding="utf-8")))
            wx.TheClipboard.Close()
        self.status.SetLabel(f"Packet exported and copied: {path}")

    def _on_import(self, _event) -> None:
        task = self._selected_task()
        if not task:
            return
        with wx.FileDialog(self, "Import structured result", wildcard="JSON files (*.json)|*.json", style=wx.FD_OPEN | wx.FD_FILE_MUST_EXIST) as dialog:
            if dialog.ShowModal() != wx.ID_OK:
                return
            path = Path(dialog.GetPath())
        self._run(
            lambda: self.service.submit_result_file(task["id"], path),
            success="Result stored for review.",
            task_id=task["id"],
        )

    def _on_render(self, _event) -> None:
        task = self._selected_task()
        if not task:
            return
        self._run(
            lambda: self.service.render_cover_letter(task["id"]),
            success="Cover-letter artifact rendered locally.",
            task_id=task["id"],
        )

    def _on_apply(self, _event) -> None:
        task = self._selected_task()
        if not task:
            return
        self._run(
            lambda: self.service.apply_result(task["id"]),
            success="Result applied.",
            task_id=task["id"],
        )

    def _on_reject(self, _event) -> None:
        task = self._selected_task()
        if not task:
            return
        self._run(
            lambda: self.service.reject_result(task["id"]),
            success="Result rejected.",
            task_id=task["id"],
        )
