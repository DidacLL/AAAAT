from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.candidatures import create_candidature
from aaaat.db import connect, profile_variables
from aaaat.generation_policy import default_generation_tasks
from aaaat.task_definitions import get_task_definition, snapshot_task_definition
from aaaat.tasks import create_task, update_task

from .agent_workflow import DesktopAgentWorkflowError, DesktopAgentWorkflowService

_TASK_CONTEXTS = {
    "field_inference": "candidature:field_inference",
    "company_research": "candidature:company_research",
    "draft_cv": "artifact:cv",
    "draft_cover_letter": "artifact:cover_letter",
}


class IntakeAutomationService:
    """Create one candidature from offer text and run its configured generation bundle."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)
        self.workflow = DesktopAgentWorkflowService(storage_path)

    def create_from_offer(
        self,
        offer_text: str,
        *,
        company: str = "",
        role: str = "",
    ) -> dict[str, Any]:
        offer = offer_text.strip()
        if not offer:
            raise ValueError("Paste the job offer text first")

        with connect(self.storage_path) as conn:
            candidature = create_candidature(
                conn,
                company=company.strip(),
                role=role.strip(),
                raw_offer=offer,
                status="draft",
                priority="normal",
                include_field_inference_task=False,
                include_company_research_task=False,
                include_keyword_detection_task=False,
                include_cv_task=False,
                include_cover_letter_task=False,
                include_form_responses_task=False,
            )
            task_types = default_generation_tasks(conn)
            command = str(profile_variables(conn).get("agent.command") or "").strip()
            tasks = [self._create_configured_task(conn, candidature["id"], task_type) for task_type in task_types]

        completed: list[str] = []
        pending: list[str] = []
        failed: dict[str, str] = {}
        for task in tasks:
            task_type = str(task["task_type"])
            if not command:
                pending.append(task_type)
                continue
            try:
                self.workflow.run_command(task["id"], command)
                if task_type in {"draft_cv", "draft_cover_letter"}:
                    self.workflow.render_cover_letter(task["id"])
                self.workflow.apply_result(task["id"])
                completed.append(task_type)
            except (DesktopAgentWorkflowError, ValueError, KeyError, OSError) as exc:
                failed[task_type] = str(exc)
                with connect(self.storage_path) as conn:
                    update_task(conn, task["id"], notes=f"Automatic generation failed: {exc}")

        return {
            "candidature": candidature,
            "completed": completed,
            "pending": pending,
            "failed": failed,
            "configured": task_types,
            "connection_configured": bool(command),
        }

    @staticmethod
    def _create_configured_task(conn, candidature_ref: str, task_type: str) -> dict[str, Any]:
        definition = get_task_definition(conn, task_type)
        task = create_task(
            conn,
            task_type,
            str(definition["title"]),
            application_id=candidature_ref,
            instructions=str(definition["instructions"]),
            context_hint=_TASK_CONTEXTS[task_type],
            created_by="system",
        )
        snapshot_task_definition(conn, task)
        return task
