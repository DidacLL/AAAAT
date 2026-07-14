from __future__ import annotations

import queue
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .db import connect
from .task_runner import TaskRunner, TaskRunnerError
from .tasks import get_task, update_task

WorkerCallback = Callable[[dict], None]


@dataclass(frozen=True)
class WorkerEvent:
    task_id: str
    state: str
    message: str = ""

    def as_dict(self) -> dict:
        return {"task_id": self.task_id, "state": self.state, "message": self.message}


class OwnedTaskWorker:
    """Single owned non-daemon worker for local background task execution."""

    def __init__(self, storage_path: str | Path, *, on_event: WorkerCallback | None = None) -> None:
        self.storage_path = str(storage_path)
        self.runner = TaskRunner(storage_path)
        self.on_event = on_event or (lambda event: None)
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
        self._emit(task_id, "waiting")

    def cancel(self, task_id: str) -> dict:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("state") in {"completed", "cancelled"}:
                return task
            task = update_task(conn, task_id, state="cancelled", notes="Cancelled by user.")
        self._emit(task_id, "cancelled")
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
                self._emit(task_id, "cancelled")
                return
        self._emit(task_id, "running")
        try:
            self.runner.run(task_id)
        except TaskRunnerError as exc:
            self._emit(task_id, "failed", str(exc))
            return
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
        self._emit(task_id, str(task.get("state") or "completed"))

    def _emit(self, task_id: str, state: str, message: str = "") -> None:
        self.on_event(WorkerEvent(task_id, state, message).as_dict())
