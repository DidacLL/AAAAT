from __future__ import annotations

from pathlib import Path
from typing import Any

from .db import connect
from .intake import IntakeService
from .tasks import apply_task_result, get_task, list_tasks, update_task
from .text_blobs import get_text_blob, update_text_blob


class AssistanceService:
    """Candidature-scoped preparation commands and query model."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)
        self.intake = IntakeService(storage_path)

    def create_task(self, application_id: str, task_type: str, *, force_new: bool = True) -> dict[str, Any]:
        return self.intake.create_task(application_id, task_type, force_new=force_new)

    def list_tasks(self, application_id: str) -> list[dict[str, Any]]:
        with connect(self.storage_path) as conn:
            result = []
            for task in reversed(list_tasks(conn, application_id=application_id)):
                item = dict(task)
                blob_id = item.get("result_blob_id")
                if blob_id:
                    blob = get_text_blob(conn, str(blob_id))
                    item["result_body"] = str(blob.get("body") or "")
                    item["review_state"] = str(blob.get("review_state") or "")
                result.append(item)
            return result

    def apply(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return apply_task_result(conn, task_id)

    def reject(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            blob_id = task.get("result_blob_id")
            if blob_id:
                update_text_blob(conn, str(blob_id), review_state="rejected")
            return update_task(conn, task_id, state="cancelled")
