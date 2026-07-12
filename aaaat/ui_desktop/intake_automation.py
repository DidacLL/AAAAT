from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.candidatures import create_candidature
from aaaat.db import connect, profile_variables, update_application
from aaaat.generation_policy import default_generation_tasks
from aaaat.task_definitions import get_task_definition, snapshot_task_definition
from aaaat.tasks import create_task, ensure_initial_tasks, list_tasks, update_task

from .agent_workflow import DesktopAgentWorkflowError, DesktopAgentWorkflowService

_TASK_CONTEXTS = {
    "field_inference": "candidature:field_inference",
    "company_research": "candidature:company_research",
    "career_plan_review": "candidature:career_plan_review",
    "draft_form_responses": "blob:form_responses",
    "draft_cv": "artifact:cv",
    "draft_cover_letter": "artifact:cover_letter",
}


class IntakeAutomationService:
    """Create one candidature from offer text and run its configured preparation pipeline."""

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
        company_value = company.strip()
        role_value = role.strip()

        with connect(self.storage_path) as conn:
            candidature = create_candidature(
                conn,
                company=company_value,
                role=role_value,
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
            placeholder_updates: dict[str, str] = {}
            if not company_value:
                placeholder_updates["company"] = ""
            if not role_value:
                placeholder_updates["role"] = ""
            if placeholder_updates:
                candidature = update_application(conn, candidature["id"], **placeholder_updates)
            configured = default_generation_tasks(conn)
            command = str(profile_variables(conn).get("agent.command") or "").strip()
            tasks = [self._create_configured_task(conn, candidature["id"], task_type) for task_type in configured]

        completed: list[str] = []
        pending: list[str] = []
        failed: dict[str, str] = {}

        # Field inference is executed first because it fills the complete candidature
        # model: offer facts, operational call material, strengths, risks, questions,
        # stack, keywords, and valuation. Later stages consume those results.
        tasks.sort(key=lambda task: 0 if task["task_type"] == "field_inference" else 1)
        for task in tasks:
            self._process_task(task, command, completed, pending, failed)

            if task["task_type"] == "field_inference" and task["task_type"] in completed:
                with connect(self.storage_path) as conn:
                    ensure_initial_tasks(
                        conn,
                        candidature["id"],
                        include_field_inference=False,
                        include_company_research=False,
                        include_keyword_detection=True,
                        include_cv=False,
                        include_cover_letter=False,
                        include_form_responses=False,
                    )

        # Keyword definitions are data-driven: only keywords extracted from this offer
        # and missing from the global glossary become tasks.
        with connect(self.storage_path) as conn:
            keyword_tasks = [
                task
                for task in list_tasks(conn, application_id=candidature["id"])
                if task["task_type"] == "keyword_definition" and task["state"] == "queued"
            ]
        for task in keyword_tasks:
            self._process_task(task, command, completed, pending, failed)

        return {
            "candidature": candidature,
            "completed": completed,
            "pending": pending,
            "failed": failed,
            "configured": configured,
            "connection_configured": bool(command),
        }

    def _process_task(
        self,
        task: dict[str, Any],
        command: str,
        completed: list[str],
        pending: list[str],
        failed: dict[str, str],
    ) -> None:
        task_type = str(task["task_type"])
        label = str(task.get("context_hint") or task_type)
        if not command:
            pending.append(label)
            return
        try:
            self.workflow.run_command(task["id"], command)
            if task_type in {"draft_cv", "draft_cover_letter"}:
                self.workflow.render_cover_letter(task["id"])
            self.workflow.apply_result(task["id"])
            completed.append(label)
        except (DesktopAgentWorkflowError, ValueError, KeyError, OSError) as exc:
            failed[label] = str(exc)
            with connect(self.storage_path) as conn:
                update_task(conn, task["id"], notes=f"Automatic generation failed: {exc}")

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
