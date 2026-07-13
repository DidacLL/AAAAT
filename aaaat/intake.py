from __future__ import annotations

from pathlib import Path
from typing import Any

from .candidatures import create_candidature, get_candidature
from .db import application_keywords, connect, update_application
from .provider_adapters import adapter_can_run_automatically
from .task_registry import task_definition
from .tasks import create_task
from .workspace_config import effective_task_snapshot, load_workspace_config


class IntakeService:
    """Create one candidature from an offer and plan its configured preparation."""

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
        form_value = str(raw_application_form or "").strip()
        config = load_workspace_config(self.storage_path)
        with connect(self.storage_path) as conn:
            candidature = create_candidature(
                conn,
                company=company_value,
                role=role_value,
                status="intake",
                priority="normal",
                raw_offer=source,
                raw_application_form=form_value,
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

            requested = list(config["automatic_preparation"])
            if form_value and "draft_form_responses" not in requested:
                requested.append("draft_form_responses")
            tasks = [self._create_task(conn, candidature["id"], task_type, config, idempotent=True) for task_type in requested]
            adapter_id = str(config["provider_adapter"]["id"])
            return {
                "candidature": get_candidature(conn, candidature["id"]),
                "tasks": tasks,
                "runner_configured": adapter_can_run_automatically(adapter_id),
            }

    def create_task(self, application_id: str, task_type: str, *, force_new: bool = False) -> dict[str, Any]:
        config = load_workspace_config(self.storage_path)
        with connect(self.storage_path) as conn:
            return self._create_task(conn, application_id, task_type, config, idempotent=not force_new)

    def create_missing_keyword_tasks(self, application_id: str) -> list[dict[str, Any]]:
        config = load_workspace_config(self.storage_path)
        with connect(self.storage_path) as conn:
            known = {
                str(row["term"]): str(row["definition"] or "")
                for row in conn.execute("SELECT term, definition FROM glossary_terms").fetchall()
            }
            tasks = []
            for keyword in application_keywords(conn, application_id):
                if known.get(keyword, "").strip():
                    continue
                tasks.append(
                    self._create_task(
                        conn,
                        application_id,
                        "keyword_definition",
                        config,
                        idempotent=True,
                        title=f"Define keyword: {keyword}",
                        context_hint=f"keyword:{keyword}",
                    )
                )
            return tasks

    def _create_task(
        self,
        conn: Any,
        application_id: str,
        task_type: str,
        config: dict[str, Any],
        *,
        idempotent: bool,
        title: str | None = None,
        context_hint: str | None = None,
    ) -> dict[str, Any]:
        definition = task_definition(task_type)
        snapshot = effective_task_snapshot(config, task_type)
        return create_task(
            conn,
            definition.task_type,
            title or str(snapshot["title"]),
            application_id=application_id,
            instructions=str(snapshot["instructions"]),
            priority=definition.priority,
            context_hint=context_hint if context_hint is not None else str(snapshot["context_hint"]),
            idempotent=idempotent,
            definition_version=int(snapshot["version"]),
            response_format=dict(snapshot["response_format"]),
            artifact_template=str(snapshot["artifact_template"]),
            artifact_mapping=dict(snapshot["artifact_mapping"]),
        )
