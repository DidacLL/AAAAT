from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.candidature_fields import WRITABLE_CANDIDATURE_STORAGE_KEYS
from aaaat.candidatures import update_candidature
from aaaat.db import add_raw_intake, connect, delete_application, set_profile_variable
from aaaat.tasks import create_task

SUPPORTED_DETAIL_EDIT_FIELDS = set(WRITABLE_CANDIDATURE_STORAGE_KEYS)
SUPPORTED_PROFILE_VARIABLE_FIELDS = {
    "profile.display_name",
    "profile.email",
    "profile.phone",
    "profile.location",
    "profile.linkedin_url",
    "profile.github_url",
    "profile.portfolio_url",
    "profile.summary.default",
}

_ACTION_TASKS = {
    "regenerate_evaluation": ("field_inference", "Regenerate offer evaluation", "Regenerate the current candidature evaluation from retained source and current editable data.", "candidature:field_inference", "high"),
    "regenerate_strategy": ("career_plan_review", "Regenerate role strategy", "Produce or refresh the role-specific strategy using current candidature, profile and career context.", "candidature:role_strategy", "high"),
    "update_company_research": ("company_research", "Update company research", "Refresh company research and recruiter-call context.", "candidature:company_research", "normal"),
    "regenerate_keywords": ("keyword_definition", "Regenerate keyword definitions", "Define missing or weak technical keywords for this candidature.", "keyword:all", "normal"),
    "prepare_form_answers": ("draft_form_responses", "Prepare form answers", "Generate application-form answers from the stored form, profile and current strategy.", "blob:form_responses", "normal"),
    "generate_cv": ("draft_cv", "Generate tailored CV", "Generate CV material using the current evaluation, strategy, candidature data and profile.", "artifact:cv", "normal"),
    "generate_cover_letter": ("draft_cover_letter", "Generate cover letter", "Generate cover-letter material using the current evaluation, strategy, candidature data and profile.", "artifact:cover_letter", "normal"),
    "prepare_recruiter_call": ("recruiter_call_material", "Prepare recruiter-call material", "Generate concise recruiter-call or interview material for this candidature.", "call:recruiter", "normal"),
}


class DesktopCommandService:
    """Tiny local command adapter for desktop UI writes."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.update_candidature_fields(candidature_ref, {"notes": body})

    def update_candidature_fields(self, candidature_ref: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        safe_changes = {key: changes[key] for key in SUPPORTED_DETAIL_EDIT_FIELDS if key in changes}
        if not safe_changes:
            return None
        source_text = safe_changes.pop("source_text", None)
        with connect(self.storage_path) as conn:
            if source_text is not None:
                add_raw_intake(conn, candidature_ref, str(source_text), "user")
            if safe_changes:
                return update_candidature(conn, candidature_ref, **safe_changes)
            return update_candidature(conn, candidature_ref)

    def queue_candidature_action(self, candidature_ref: str, action_id: str) -> dict[str, Any] | None:
        spec = _ACTION_TASKS.get(action_id)
        if not spec or not candidature_ref:
            return None
        task_type, title, instructions, context_hint, priority = spec
        with connect(self.storage_path) as conn:
            return create_task(
                conn,
                task_type,
                title,
                application_id=candidature_ref,
                instructions=instructions,
                priority=priority,
                context_hint=context_hint,
                created_by="desktop",
                idempotent=False,
            )

    def delete_candidature(self, candidature_ref: str) -> bool:
        if not candidature_ref:
            return False
        with connect(self.storage_path) as conn:
            return delete_application(conn, candidature_ref)

    def update_profile_variables(self, changes: dict[str, Any]) -> dict[str, str]:
        safe_changes = {
            key: str(value)
            for key, value in changes.items()
            if key in SUPPORTED_PROFILE_VARIABLE_FIELDS
        }
        if not safe_changes:
            return {}
        with connect(self.storage_path) as conn:
            for key, value in safe_changes.items():
                set_profile_variable(conn, key, value)
        return safe_changes
