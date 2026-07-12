from __future__ import annotations

from pathlib import Path
from typing import Any

from .candidatures import create_candidature
from .db import connect
from .task_workflow import TaskWorkflowService
from .workspace_config import load_settings


class IntakeService:
    """Persist a pasted offer and create its configured preparation plan."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)
        self.tasks = TaskWorkflowService(storage_path)

    def create_from_offer(
        self,
        offer_text: str,
        *,
        company: str = "",
        role: str = "",
        raw_application_form: str = "",
    ) -> dict[str, Any]:
        offer = str(offer_text or "").strip()
        if not offer:
            raise ValueError("Paste the job offer text first")
        with connect(self.storage_path) as conn:
            candidature = create_candidature(
                conn,
                company=str(company or "").strip(),
                role=str(role or "").strip(),
                status="intake",
                priority="normal",
                raw_offer=offer,
                raw_application_form=str(raw_application_form or "").strip(),
                include_field_inference_task=False,
                include_company_research_task=False,
                include_keyword_detection_task=False,
                include_cv_task=False,
                include_cover_letter_task=False,
                include_form_responses_task=False,
            )

        settings = load_settings(self.storage_path)
        requested = list(settings.get("automatic_preparation") or [])
        conditional = settings.get("conditional_preparation") or {}
        if conditional.get("draft_form_responses") == "always":
            requested.append("draft_form_responses")
        elif conditional.get("draft_form_responses") == "when_form_present" and raw_application_form.strip():
            requested.append("draft_form_responses")
        if conditional.get("draft_cv") == "always":
            requested.append("draft_cv")
        if conditional.get("draft_cover_letter") == "always":
            requested.append("draft_cover_letter")

        task_views = []
        seen: set[str] = set()
        for task_type in requested:
            if task_type in seen:
                continue
            seen.add(task_type)
            task_views.append(
                self.tasks.create_task(
                    candidature["id"],
                    task_type,
                    created_by="system",
                    priority="high" if task_type == "field_inference" else "normal",
                )
            )
        return {
            "candidature": candidature,
            "tasks": task_views,
            "agent_configured": bool(str(settings.get("agent_command") or "").strip()),
        }

    def create_missing_keyword_tasks(self, candidature_ref: str) -> list[dict[str, Any]]:
        settings = load_settings(self.storage_path)
        mode = str((settings.get("conditional_preparation") or {}).get("keyword_definition") or "when_missing")
        if mode == "disabled":
            return []
        with connect(self.storage_path) as conn:
            rows = conn.execute(
                """SELECT ak.term
                FROM application_keywords ak
                JOIN glossary_terms gt ON gt.term = ak.term
                WHERE ak.application_id = ? AND TRIM(COALESCE(gt.definition, '')) = ''
                ORDER BY ak.term""",
                (candidature_ref,),
            ).fetchall()
        return [
            self.tasks.create_task(
                candidature_ref,
                "keyword_definition",
                context_hint=f"keyword:{row['term']}",
                created_by="system",
            )
            for row in rows
        ]
