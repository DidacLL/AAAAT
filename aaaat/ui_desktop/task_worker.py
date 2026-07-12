from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Callable, Iterable

import wx  # type: ignore[import-not-found]

from aaaat.intake import IntakeService
from aaaat.task_workflow import TaskWorkflowError, TaskWorkflowService


@dataclass(frozen=True)
class TaskProgress:
    task_id: str
    task_type: str
    state: str
    message: str = ""


class DesktopTaskWorker:
    """Execute bounded preparation tasks without blocking the wx event loop."""

    def __init__(self, storage_path: str) -> None:
        self.storage_path = storage_path
        self.workflow = TaskWorkflowService(storage_path)
        self.intake = IntakeService(storage_path)
        self._lock = threading.Lock()
        self._running: set[str] = set()

    def run_tasks(
        self,
        tasks: Iterable[dict],
        *,
        on_progress: Callable[[TaskProgress], None],
        on_complete: Callable[[], None],
    ) -> None:
        task_list = list(tasks)
        if not task_list:
            wx.CallAfter(on_complete)
            return

        def work() -> None:
            try:
                ordered = sorted(task_list, key=lambda item: 0 if item.get("task_type") == "field_inference" else 1)
                for task in ordered:
                    self._run_one(task, on_progress)
                    if task.get("task_type") == "field_inference":
                        refreshed = self.workflow.get_task(str(task["id"]))
                        if refreshed.get("review_state") == "applied":
                            keyword_tasks = self.intake.create_missing_keyword_tasks(str(task.get("application_id") or ""))
                            for keyword_task in keyword_tasks:
                                self._run_one(keyword_task, on_progress)
            finally:
                wx.CallAfter(on_complete)

        threading.Thread(target=work, name="aaaat-preparation", daemon=True).start()

    def run_task(
        self,
        task: dict,
        *,
        on_progress: Callable[[TaskProgress], None],
        on_complete: Callable[[], None],
    ) -> None:
        self.run_tasks([task], on_progress=on_progress, on_complete=on_complete)

    def _run_one(self, task: dict, on_progress: Callable[[TaskProgress], None]) -> None:
        task_id = str(task["id"])
        with self._lock:
            if task_id in self._running:
                return
            self._running.add(task_id)
        try:
            wx.CallAfter(
                on_progress,
                TaskProgress(task_id, str(task.get("task_type") or "task"), "in_progress", "Preparing…"),
            )
            result = self.workflow.run_configured(task_id)
            if result.get("artifact_template"):
                result = self.workflow.render_artifact(task_id)["task"]
            result = self.workflow.apply(task_id)
            wx.CallAfter(
                on_progress,
                TaskProgress(task_id, str(result.get("task_type") or "task"), "applied", "Ready"),
            )
        except (TaskWorkflowError, ValueError, KeyError, OSError) as exc:
            wx.CallAfter(
                on_progress,
                TaskProgress(task_id, str(task.get("task_type") or "task"), "blocked", str(exc)),
            )
        finally:
            with self._lock:
                self._running.discard(task_id)
