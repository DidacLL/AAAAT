from __future__ import annotations

import queue
import threading
from pathlib import Path
from typing import Any, Callable

from .db import connect, utc_now
from .task_runner import TaskRunner, TaskRunnerError
from .tasks import get_task, update_task

WorkerCallback = Callable[[dict[str, Any]], None]


class OwnedTaskWorker:
    """Single owned non-daemon worker for local background task execution."""

    def __init__(self, storage_path: str | Path, *, on_event: WorkerCallback | None = None) -> None:
        self.storage_path = str(storage_path)
        self.on_event = on_event or (lambda _event: None)
        self.runner = TaskRunner(storage_path, on_progress=self.on_event)
        self._queue: queue.Queue[str | None] = queue.Queue()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._stopping = False
        self._running_task_id: str | None = None

    @property
    def running_task_id(self) -> str | None:
        with self._lock:
            return self._running_task_id

    def start(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stopping = False
            self._thread = threading.Thread(target=self._work_loop, name="aaaat-owned-task-worker", daemon=False)
            self._thread.start()

    def stop(self, *, wait: bool = True) -> None:
        with self._lock:
            self._stopping = True
        self._queue.put(None)
        thread = self._thread
        if wait and thread:
            thread.join(timeout=5)

    def submit(self, task_id: str) -> None:
        self.start()
        self._queue.put(task_id)
        self._emit(task_id, "waiting", "Task queued", 0, 0)

    def cancel(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") in {"completed", "cancelled"}:
                return task
            task = update_task(conn, task_id, state="cancelled", notes="Cancelled by user.")
        self._emit(task_id, "cancelled", "Cancelled by user", 100, 0)
        return task

    def retry(self, task_id: str) -> None:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") not in {"failed", "blocked", "cancelled"}:
                raise ValueError(f"Task cannot be retried from state {task.get('state')}")
            update_task(conn, task_id, state="queued", notes="")
        self.submit(task_id)

    def _work_loop(self) -> None:
        while True:
            task_id = self._queue.get()
            if task_id is None:
                self._queue.task_done()
                break
            with self._lock:
                if self._stopping:
                    self._queue.task_done()
                    continue
                self._running_task_id = task_id
            try:
                self._run_one(task_id)
            finally:
                with self._lock:
                    if self._running_task_id == task_id:
                        self._running_task_id = None
                self._queue.task_done()

    def _run_one(self, task_id: str) -> None:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") == "cancelled":
                self._emit(task_id, "cancelled", "Task already cancelled", 100, 0)
                return
        try:
            self.runner.run(task_id)
        except TaskRunnerError:
            return

    def _emit(self, task_id: str, phase: str, message: str, percent: int, sequence: int) -> None:
        self.on_event({
            "task_id": task_id,
            "state": phase,
            "phase": phase,
            "message": message,
            "percent": percent,
            "sequence": sequence,
            "occurred_at": utc_now(),
        })
