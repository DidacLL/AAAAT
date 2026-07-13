from __future__ import annotations

import threading
from pathlib import Path
from typing import Callable, Iterable

import wx  # type: ignore[import-not-found]

from aaaat.intake import IntakeService
from aaaat.task_runner import TaskRunner, TaskRunnerError


class DesktopTaskWorker:
    """Execute configured preparation without blocking the wx event loop."""

    def __init__(self, storage_path: str | Path) -> None:
        self.runner = TaskRunner(storage_path)
        self.intake = IntakeService(storage_path)
        self._lock = threading.Lock()
        self._running: set[str] = set()

    def run_tasks(self, tasks: Iterable[dict], *, on_change: Callable[[], None]) -> None:
        task_list = list(tasks)
        if not task_list:
            return

        def work() -> None:
            ordered = sorted(task_list, key=lambda item: 0 if item.get("task_type") == "field_inference" else 1)
            for task in ordered:
                self._run_one(task, on_change)
                if task.get("task_type") == "field_inference":
                    for keyword_task in self.intake.create_missing_keyword_tasks(str(task.get("application_id") or "")):
                        self._run_one(keyword_task, on_change)
            wx.CallAfter(on_change)

        threading.Thread(target=work, name="aaaat-preparation", daemon=True).start()

    def run_task(self, task: dict, *, on_change: Callable[[], None]) -> None:
        self.run_tasks([task], on_change=on_change)

    def _run_one(self, task: dict, on_change: Callable[[], None]) -> None:
        task_id = str(task.get("id") or "")
        if not task_id:
            return
        with self._lock:
            if task_id in self._running:
                return
            self._running.add(task_id)
        try:
            wx.CallAfter(on_change)
            try:
                self.runner.run(task_id)
            except TaskRunnerError:
                pass
            wx.CallAfter(on_change)
        finally:
            with self._lock:
                self._running.discard(task_id)
