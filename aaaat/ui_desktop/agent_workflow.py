from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from aaaat.agent_access import submit_agent_task_result, task_handle
from aaaat.db import connect
from aaaat.dispatch.manual import dispatch_manual
from aaaat.tasks import apply_task_result, create_task, get_task, list_tasks, update_task
from aaaat.templates import render_document_artifact, safe_artifact_output_path
from aaaat.text_blobs import get_text_blob, update_text_blob


DESKTOP_TASK_TYPES = {
    "company_research": (
        "Research company",
        "Prepare concise company research for review.",
        "candidature:company_research",
    ),
    "field_inference": (
        "Complete candidature fields",
        "Infer missing candidature fields from bounded source material.",
        "candidature:field_inference",
    ),
    "draft_cover_letter": (
        "Draft cover letter",
        "Draft a cover-letter body for local rendering and review.",
        "artifact:cover_letter",
    ),
}


class DesktopAgentWorkflowError(ValueError):
    pass


class DesktopAgentWorkflowService:
    """Desktop-facing orchestration over existing bounded task APIs."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def create_task(self, candidature_ref: str, task_type: str) -> dict[str, Any]:
        if task_type not in DESKTOP_TASK_TYPES:
            raise DesktopAgentWorkflowError(f"Unsupported desktop task type: {task_type}")
        title, instructions, context_hint = DESKTOP_TASK_TYPES[task_type]
        with connect(self.storage_path) as conn:
            task = create_task(
                conn,
                task_type,
                title,
                application_id=candidature_ref,
                instructions=instructions,
                context_hint=context_hint,
                created_by="user",
            )
        return self._task_view(task)

    def list_tasks(self, candidature_ref: str) -> list[dict[str, Any]]:
        with connect(self.storage_path) as conn:
            tasks = list_tasks(conn, application_id=candidature_ref)
            return [self._task_view(task, conn=conn) for task in tasks]

    def export_packet(self, task_id: str) -> Path:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            result = dispatch_manual(conn, self.storage_path, task_handle(task))
        return Path(result["packet_path"])

    def submit_result_file(
        self,
        task_id: str,
        result_path: str | Path,
        *,
        agent_name: str = "external agent",
        agent_runtime: str = "manual",
        model_provider: str = "",
    ) -> dict[str, Any]:
        try:
            result = json.loads(Path(result_path).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise DesktopAgentWorkflowError("Result file must contain one valid JSON object") from exc
        if not isinstance(result, dict):
            raise DesktopAgentWorkflowError("Result file must contain one JSON object")

        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            completed = submit_agent_task_result(
                conn,
                task_handle(task),
                json.dumps(result, ensure_ascii=False, sort_keys=True),
                result_title=f"External result: {task['title']}",
                agent_name=agent_name,
                agent_runtime=agent_runtime,
                model_provider=model_provider,
            )
            return self._task_view(completed, conn=conn)

    def render_cover_letter(self, task_id: str, *, compile_pdf: bool = False) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("task_type") != "draft_cover_letter":
                raise DesktopAgentWorkflowError("Only cover-letter tasks can render this artifact")
            if not task.get("result_blob_id"):
                raise DesktopAgentWorkflowError("The cover-letter task has no submitted result")
            blob = get_text_blob(conn, task["result_blob_id"])
            try:
                result = json.loads(str(blob.get("body") or ""))
            except json.JSONDecodeError as exc:
                raise DesktopAgentWorkflowError("Cover-letter result is not valid JSON") from exc
            body = str(result.get("cover_letter_body") or "").strip() if isinstance(result, dict) else ""
            if not body:
                raise DesktopAgentWorkflowError("Cover-letter result requires cover_letter_body")
            output_path = safe_artifact_output_path(
                self.storage_path,
                task.get("application_id"),
                "cover-letter",
            )
            rendered = render_document_artifact(
                conn,
                "cover-letter",
                output_path,
                task.get("application_id"),
                {"artifact.cover_letter.body": body},
                compile_pdf=compile_pdf,
            )
            updated = update_task(conn, task_id, artifact_id=rendered["artifact_id"])
            return {"task": self._task_view(updated, conn=conn), "artifact": rendered}

    def apply_result(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            applied = apply_task_result(conn, task_id)
            return self._task_view(applied, conn=conn)

    def reject_result(self, task_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            task = get_task(conn, task_id)
            if task.get("result_blob_id"):
                update_text_blob(
                    conn,
                    task["result_blob_id"],
                    review_state="archived",
                    notes="Rejected by user.",
                )
            rejected = update_task(conn, task_id, state="cancelled", notes="Result rejected by user.")
            return self._task_view(rejected, conn=conn)

    @staticmethod
    def _task_view(task: dict[str, Any], *, conn=None) -> dict[str, Any]:
        result_body = ""
        review_state = ""
        if conn is not None and task.get("result_blob_id"):
            blob = get_text_blob(conn, task["result_blob_id"])
            result_body = str(blob.get("body") or "")
            review_state = str(blob.get("review_state") or "")
        return {
            "id": task["id"],
            "task_handle": task_handle(task),
            "task_type": task.get("task_type", ""),
            "title": task.get("title", ""),
            "state": task.get("state", ""),
            "priority": task.get("priority", ""),
            "result_blob_id": task.get("result_blob_id"),
            "artifact_id": task.get("artifact_id"),
            "result_body": result_body,
            "review_state": review_state,
            "agent_name": task.get("agent_name", ""),
            "agent_runtime": task.get("agent_runtime", ""),
            "notes": task.get("notes", ""),
        }
