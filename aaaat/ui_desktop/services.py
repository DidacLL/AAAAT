from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.candidature_fields import WRITABLE_CANDIDATURE_STORAGE_KEYS
from aaaat.candidatures import create_candidature, get_candidature, update_candidature
from aaaat.db import add_raw_intake, application_keywords, connect, delete_application, init_db, set_profile_variable, upsert_glossary_term
from aaaat.tasks import create_task

from .user_fields import WRITABLE_USER_STORAGE_KEYS

SUPPORTED_DETAIL_EDIT_FIELDS = set(WRITABLE_CANDIDATURE_STORAGE_KEYS)
SUPPORTED_PROFILE_VARIABLE_FIELDS = set(WRITABLE_USER_STORAGE_KEYS)

_ACTION_TASKS = {
    "infer_fields": (
        "field_inference",
        "Infer candidature fields",
        "Infer every supported candidature field that can be grounded in the retained raw offer, current candidature data and bounded user profile. Preserve non-empty user edits unless the task result explicitly justifies a replacement.",
        "candidature:field_inference",
        "high",
    ),
    "regenerate_strategy": (
        "career_plan_review",
        "Draft role strategy",
        "Produce or refresh the role-specific strategy using current candidature, profile and career context.",
        "candidature:role_strategy",
        "high",
    ),
    "update_company_research": (
        "company_research",
        "Research company",
        "Refresh company research and recruiter-call context.",
        "candidature:company_research",
        "normal",
    ),
    "regenerate_keywords": (
        "field_inference",
        "Extract candidature keywords",
        "Extract meaningful technical, product, domain and recruiting keywords from the retained raw offer and current candidature data. Preserve manually-added keywords.",
        "candidature:keywords",
        "normal",
    ),
    "prepare_form_answers": (
        "draft_form_responses",
        "Draft form answers",
        "Generate application-form answers from the stored form, profile and current strategy.",
        "blob:form_responses",
        "normal",
    ),
    "generate_cv": (
        "draft_cv",
        "Draft CV material",
        "Generate CV material using the current evaluation, strategy, candidature data and profile.",
        "artifact:cv",
        "normal",
    ),
    "generate_cover_letter": (
        "draft_cover_letter",
        "Draft cover letter",
        "Generate cover-letter material using the current evaluation, strategy, candidature data and profile.",
        "artifact:cover_letter",
        "normal",
    ),
    "prepare_recruiter_call": (
        "recruiter_call_material",
        "Prepare recruiter-call material",
        "Generate concise recruiter-call or interview material for this candidature.",
        "call:recruiter",
        "normal",
    ),
}

_DOCUMENT_ACTIONS = {"generate_cv", "generate_cover_letter"}


class DesktopCommandService:
    """Tiny local command adapter for desktop UI writes."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)
        init_db(self.storage_path)

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.update_candidature_fields(candidature_ref, {"notes": body})

    def create_raw_offer_candidature(
        self,
        raw_offer: str,
        *,
        company: str = "",
        role: str = "",
        source_url: str = "",
        raw_application_form: str = "",
        request_cv: bool = False,
        request_cover_letter: bool = False,
    ) -> dict[str, Any] | None:
        text = str(raw_offer or "").strip()
        if not text:
            return None
        with connect(self.storage_path) as conn:
            created = create_candidature(
                conn,
                company=str(company or "").strip() or "Pending company",
                role=str(role or "").strip() or "Pending role",
                source_url=str(source_url or "").strip(),
                raw_application_form=str(raw_application_form or "").strip(),
                status="active",
                priority="normal",
                raw_offer=text,
                created_by="desktop",
                include_field_inference_task=True,
                include_company_research_task=False,
                include_keyword_detection_task=True,
            )
            candidature_ref = str(created.get("id") or "")
            if request_cv:
                self._create_action_task(conn, candidature_ref, "generate_cv", force_blocked=True)
            if request_cover_letter:
                self._create_action_task(conn, candidature_ref, "generate_cover_letter", force_blocked=True)
            return get_candidature(conn, candidature_ref)

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

    def add_keyword(self, candidature_ref: str, term: str, definition: str = "") -> dict[str, Any] | None:
        cleaned = str(term or "").strip()
        if not candidature_ref or not cleaned:
            return None
        with connect(self.storage_path) as conn:
            terms = application_keywords(conn, candidature_ref)
            if cleaned not in terms:
                terms.append(cleaned)
            upsert_glossary_term(conn, cleaned, str(definition or ""))
            return update_candidature(conn, candidature_ref, keywords=terms)

    def save_keyword_definition(self, term: str, definition: str) -> dict[str, Any] | None:
        cleaned = str(term or "").strip()
        if not cleaned:
            return None
        with connect(self.storage_path) as conn:
            return upsert_glossary_term(conn, cleaned, str(definition or ""))

    def queue_candidature_action(self, candidature_ref: str, action_id: str) -> dict[str, Any] | None:
        if not candidature_ref:
            return None
        with connect(self.storage_path) as conn:
            return self._create_action_task(conn, candidature_ref, action_id)

    def _create_action_task(
        self,
        conn: Any,
        candidature_ref: str,
        action_id: str,
        *,
        force_blocked: bool = False,
    ) -> dict[str, Any] | None:
        spec = _ACTION_TASKS.get(action_id)
        if not spec or not candidature_ref:
            return None
        task_type, title, instructions, context_hint, priority = spec
        blocked = force_blocked or (action_id in _DOCUMENT_ACTIONS and not _document_inputs_ready(get_candidature(conn, candidature_ref)))
        notes = "Waiting for current candidature evaluation and role strategy." if blocked else ""
        return create_task(
            conn,
            task_type,
            title,
            application_id=candidature_ref,
            instructions=instructions,
            state="blocked" if blocked else "queued",
            priority=priority,
            context_hint=context_hint,
            created_by="desktop",
            notes=notes,
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


def _document_inputs_ready(candidature: dict[str, Any]) -> bool:
    return bool(str(candidature.get("candidature_evaluation") or "").strip() and str(candidature.get("role_strategy") or "").strip())
