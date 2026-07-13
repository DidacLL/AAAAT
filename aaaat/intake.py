from __future__ import annotations

from pathlib import Path
from typing import Any

from .candidatures import create_candidature, get_candidature
from .db import application_keywords, connect, update_application
from .task_registry import task_definition
from .tasks import create_task
from .workspace_config import load_workspace_config, task_instructions


class IntakeService:
    """Create a candidature from one offer and plan its configured preparation."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def create_from_offer(
        self,
        offer_text: str,
        *,
        company: str = "",
        role: str = "",
        raw_application_form: str = "",
    ) -> dict[str, Any]:
        source = str(offer_text or "").strip()
        if not source:
            raise ValueError("Job offer text is required")
        company_value = str(company or "").strip()
        role_value = str(role or "").strip()
        config = load_workspace_config(self.storage_path)
        with connect(self.storage_path) as conn:
            candidature = create_candidature(
                conn,
                company=company_value,
                role=role_value,
                status="intake",
                priority="normal",
                raw_offer=source,
                raw_application_form=str(raw_application_form or "").strip(),
                include_field_inference_task=False,
                include_company_research_task=False,
                include_keyword_detection_task=False,
                include_cv_task=False,
                include_cover_letter_task=False,
                include_form_responses_task=False,
            )
            omitted: dict[str, str] = {}
            if not company_value:
                omitted["company"] = ""
            if not role_value:
                omitted["role"] = ""
            if omitted:
                update_application(conn, candidature["id"], **omitted)
            tasks = []
            requested = list(config["automatic_preparation"])
            if raw_application_form.strip() and "draft_form_responses" not in requested:
                requested.append("draft_form_responses")
            for task_type in requested:
                tasks.append(self._create_task(conn, candidature["id"], task_type, idempotent=True))
            return {
                "candidature": get_candidature(conn, candidature["id"]),
                "tasks": tasks,
                "runner_configured": bool(config["runner_command"]),
            }

    def create_task(self, application_id: str, task_type: str, *, force_new: bool = False) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return self._create_task(conn, application_id, task_type, idempotent=not force_new)

    def create_missing_keyword_tasks(self, application_id: str) -> list[dict[str, Any]]:
        with connect(self.storage_path) as conn:
            known = {
                str(row["term"]): str(row["definition"] or "")
                for row in conn.execute("SELECT term, definition FROM glossary_terms").fetchall()
            }
            tasks = []
            for keyword in application_keywords(conn, application_id):
                if known.get(keyword, "").strip():
                    continue
                definition = task_definition("keyword_definition")
                tasks.append(
                    create_task(
                        conn,
                        definition.task_type,
                        f"Define keyword: {keyword}",
                        application_id=application_id,
                        instructions=task_instructions(self.storage_path, definition.task_type, definition.instructions),
                        priority=definition.priority,
                        context_hint=f"keyword:{keyword}",
                        idempotent=True,
                    )
                )
            return tasks

    def _create_task(self, conn: Any, application_id: str, task_type: str, *, idempotent: bool) -> dict[str, Any]:
        definition = task_definition(task_type)
        return create_task(
            conn,
            definition.task_type,
            definition.title,
            application_id=application_id,
            instructions=task_instructions(self.storage_path, definition.task_type, definition.instructions),
            priority=definition.priority,
            context_hint=definition.context_hint,
            idempotent=idempotent,
        )
