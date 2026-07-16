from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.artifacts import get_artifact, list_artifacts, save_artifact, update_artifact_state
from aaaat.candidature_fields import WRITABLE_CANDIDATURE_STORAGE_KEYS
from aaaat.candidatures import create_candidature, get_candidature, update_candidature
from aaaat.db import add_raw_intake, application_keywords, connect, delete_application, init_db, set_profile_variable, upsert_glossary_term
from aaaat.tasks import create_task, list_tasks, update_task

from .user_fields import WRITABLE_USER_STORAGE_KEYS

SUPPORTED_DETAIL_EDIT_FIELDS = set(WRITABLE_CANDIDATURE_STORAGE_KEYS)
SUPPORTED_PROFILE_VARIABLE_FIELDS = set(WRITABLE_USER_STORAGE_KEYS)

_ACTION_TASKS = {
    "infer_fields": ("field_inference", "Review offer details", "Infer every supported candidature field that can be grounded in the retained raw offer, current candidature data and bounded user profile. Preserve non-empty user edits unless the task result explicitly justifies a replacement.", "candidature:field_inference", "high"),
    "regenerate_strategy": ("career_plan_review", "Prepare application approach", "Produce or refresh the role-specific strategy using current candidature, profile and career context.", "candidature:role_strategy", "high"),
    "update_company_research": ("company_research", "Update company context", "Refresh company research and recruiter-call context.", "candidature:company_research", "normal"),
    "regenerate_keywords": ("field_inference", "Review relevant terms", "Extract meaningful technical, product, domain and recruiting keywords from the retained raw offer and current candidature data. Preserve manually-added keywords.", "candidature:keywords", "normal"),
    "prepare_form_answers": ("draft_form_responses", "Prepare form answers", "Generate application-form answers from the stored form, profile and current strategy.", "blob:form_responses", "normal"),
    "generate_cv": ("draft_cv", "Prepare tailored CV", "Generate CV material using the current evaluation, strategy, candidature data and profile.", "artifact:cv", "normal"),
    "generate_cover_letter": ("draft_cover_letter", "Prepare cover letter", "Generate cover-letter material using the current evaluation, strategy, candidature data and profile.", "artifact:cover_letter", "normal"),
    "prepare_recruiter_call": ("recruiter_call_material", "Prepare conversation notes", "Generate concise recruiter-call or interview material for this candidature.", "call:recruiter", "normal"),
}
_DOCUMENT_ACTIONS = {"generate_cv", "generate_cover_letter"}
_DOCUMENT_TASK_TYPES = {"draft_cv", "draft_cover_letter"}
_WAITING_FOR_INPUTS_NOTE = "Waiting for the fit review and application approach to be ready."


class DesktopCommandService:
    """Small local command adapter for desktop UI writes."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)
        init_db(self.storage_path)

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.update_candidature_fields(candidature_ref, {"notes": body})

    def create_offer_first_candidature(self, raw_offer: str, *, company: str = "", role: str = "", source_url: str = "", application_form: str = "", request_cv: bool = False, request_cover_letter: bool = False) -> dict[str, Any] | None:
        text = str(raw_offer or "").strip()
        if not text:
            return None
        with connect(self.storage_path) as conn:
            created = create_candidature(
                conn,
                company=str(company or "").strip() or "Pending company",
                role=str(role or "").strip() or "Pending role",
                source_url=str(source_url or "").strip(),
                raw_application_form=str(application_form or "").strip(),
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

    def create_raw_offer_candidature(self, raw_offer: str, *, company: str = "", role: str = "", source_url: str = "", raw_application_form: str = "", request_cv: bool = False, request_cover_letter: bool = False) -> dict[str, Any] | None:
        return self.create_offer_first_candidature(raw_offer, company=company, role=role, source_url=source_url, application_form=raw_application_form, request_cv=request_cv, request_cover_letter=request_cover_letter)

    def update_candidature_fields(self, candidature_ref: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        safe_changes = {key: changes[key] for key in SUPPORTED_DETAIL_EDIT_FIELDS if key in changes}
        if not safe_changes:
            return None
        source_text = safe_changes.pop("source_text", None)
        with connect(self.storage_path) as conn:
            if source_text is not None:
                add_raw_intake(conn, candidature_ref, str(source_text), "user")
            updated = update_candidature(conn, candidature_ref, **safe_changes) if safe_changes else update_candidature(conn, candidature_ref)
            self._release_deferred_document_requests(conn, candidature_ref, updated)
            return get_candidature(conn, candidature_ref)

    def _release_deferred_document_requests(self, conn: Any, candidature_ref: str, candidature: dict[str, Any]) -> None:
        if not _document_inputs_ready(candidature):
            return
        for item in list_tasks(conn, application_id=candidature_ref):
            if item.get("task_type") in _DOCUMENT_TASK_TYPES and item.get("state") == "blocked":
                update_task(conn, str(item["id"]), state="queued", notes="Ready to begin when an integration is available.")

    def add_keyword(self, candidature_ref: str, term: str, definition: str = "") -> dict[str, Any] | None:
        cleaned = str(term or "").strip()
        if not candidature_ref or not cleaned:
            return None
        with connect(self.storage_path) as conn:
            terms = application_keywords(conn, candidature_ref)
            if cleaned not in terms:
                terms.append(cleaned)
            existing = conn.execute(
                "SELECT definition, category FROM glossary_terms WHERE term = ?",
                (cleaned,),
            ).fetchone()
            supplied_definition = str(definition or "").strip()
            if existing is None:
                upsert_glossary_term(conn, cleaned, supplied_definition)
            elif not str(existing["definition"] or "").strip() and supplied_definition:
                # Adding an association must not silently replace an established
                # canonical definition.  Definition changes use the explicit
                # save_keyword_definition path instead.
                upsert_glossary_term(conn, cleaned, supplied_definition, str(existing["category"] or ""))
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

    def _create_action_task(self, conn: Any, candidature_ref: str, action_id: str, *, force_blocked: bool = False) -> dict[str, Any] | None:
        spec = _ACTION_TASKS.get(action_id)
        if not spec or not candidature_ref:
            return None
        task_type, title, instructions, context_hint, priority = spec
        blocked = force_blocked or (action_id in _DOCUMENT_ACTIONS and not _document_inputs_ready(get_candidature(conn, candidature_ref)))
        return create_task(conn, task_type, title, application_id=candidature_ref, instructions=instructions, state="blocked" if blocked else "queued", priority=priority, context_hint=context_hint, created_by="desktop", notes=_WAITING_FOR_INPUTS_NOTE if blocked else "", idempotent=False)

    def attach_existing_material(self, candidature_ref: str, path: str | Path, material_type: str, label: str = "") -> dict[str, Any] | None:
        target = Path(path)
        if not candidature_ref or not target.is_file():
            return None
        cleaned_type = str(material_type or "other").strip() or "other"
        cleaned_label = str(label or "").strip() or target.stem
        with connect(self.storage_path) as conn:
            return save_artifact(
                conn,
                candidature_ref,
                cleaned_type,
                str(target),
                cleaned_label,
                source_context="desktop:attached",
                review_state="draft",
                notes="Attached from an existing local file.",
                lifecycle_event="attach",
            )

    def list_candidature_artifacts(self, candidature_ref: str) -> list[dict[str, Any]]:
        if not candidature_ref:
            return []
        with connect(self.storage_path) as conn:
            return list_artifacts(conn, candidature_ref)

    def update_artifact_details(self, artifact_id: str, *, label: str, notes: str) -> dict[str, Any] | None:
        if not artifact_id:
            return None
        cleaned_label = str(label or "").strip()
        with connect(self.storage_path) as conn:
            current = get_artifact(conn, artifact_id)
            conn.execute(
                "UPDATE generated_artifacts SET label = ?, notes = ? WHERE id = ?",
                (cleaned_label or str(current.get("label") or "Material"), str(notes or "").strip(), artifact_id),
            )
            conn.commit()
            return get_artifact(conn, artifact_id)

    def set_artifact_state(self, artifact_id: str, state: str, notes: str = "") -> dict[str, Any] | None:
        if not artifact_id:
            return None
        with connect(self.storage_path) as conn:
            return update_artifact_state(conn, artifact_id, state, notes or None)

    def artifact_path(self, artifact_id: str) -> str:
        if not artifact_id:
            return ""
        with connect(self.storage_path) as conn:
            return str(get_artifact(conn, artifact_id).get("path") or "")

    def list_profile_facts(self) -> list[dict[str, Any]]:
        from aaaat.profile_facts import list_profile_facts

        with connect(self.storage_path) as conn:
            return list_profile_facts(conn)

    def create_profile_fact(self, fields: dict[str, Any]) -> list[dict[str, Any]]:
        from aaaat.profile_facts import create_profile_fact, list_profile_facts

        with connect(self.storage_path) as conn:
            create_profile_fact(conn, **fields)
            return list_profile_facts(conn)

    def update_profile_fact(self, fact_id: str, fields: dict[str, Any]) -> list[dict[str, Any]]:
        from aaaat.profile_facts import list_profile_facts, update_profile_fact

        if not fact_id:
            return self.list_profile_facts()
        with connect(self.storage_path) as conn:
            update_profile_fact(conn, fact_id, **fields)
            return list_profile_facts(conn)

    def archive_profile_fact(self, fact_id: str) -> list[dict[str, Any]]:
        from aaaat.profile_facts import archive_profile_fact, list_profile_facts

        if not fact_id:
            return self.list_profile_facts()
        with connect(self.storage_path) as conn:
            archive_profile_fact(conn, fact_id)
            return list_profile_facts(conn)

    def delete_candidature(self, candidature_ref: str) -> bool:
        if not candidature_ref:
            return False
        with connect(self.storage_path) as conn:
            return delete_application(conn, candidature_ref)

    def update_profile_variables(self, changes: dict[str, Any]) -> dict[str, str]:
        safe_changes = {key: str(value) for key, value in changes.items() if key in SUPPORTED_PROFILE_VARIABLE_FIELDS}
        if not safe_changes:
            return {}
        with connect(self.storage_path) as conn:
            for key, value in safe_changes.items():
                set_profile_variable(conn, key, value)
        return safe_changes


def _document_inputs_ready(candidature: dict[str, Any]) -> bool:
    return bool(str(candidature.get("candidature_evaluation") or "").strip() and str(candidature.get("role_strategy") or "").strip())
