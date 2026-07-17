from __future__ import annotations

from pathlib import Path
from typing import Callable, Iterable

import wx  # type: ignore[import-not-found]

from aaaat.background_worker import OwnedTaskWorker


class DesktopTaskWorker:
    """wx adapter for the single owned non-daemon background worker."""

    def __init__(self, storage_path: str | Path, *, on_event: Callable[[dict], None] | None = None) -> None:
        self._on_event = on_event or (lambda event: None)
        self._worker = OwnedTaskWorker(storage_path, on_event=self._call_after)

    def run_tasks(self, tasks: Iterable[dict], *, on_change: Callable[[], None]) -> None:
        submitted = False
        for task in tasks:
            task_id = str(task.get("id") or "")
            if task_id:
                self._worker.submit(task_id)
                submitted = True
        if submitted:
            wx.CallAfter(on_change)

    def run_task(self, task: dict, *, on_change: Callable[[], None]) -> None:
        self.run_tasks([task], on_change=on_change)

    def cancel_task(self, task_id: str, *, on_change: Callable[[], None]) -> None:
        self._worker.cancel(task_id)
        wx.CallAfter(on_change)

    def retry_task(self, task_id: str, *, on_change: Callable[[], None]) -> None:
        self._worker.retry(task_id)
        wx.CallAfter(on_change)

    def stop(self) -> None:
        self._worker.stop(wait=False)

    def _call_after(self, event: dict) -> None:
        wx.CallAfter(self._on_event, event)
