from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.artifacts import get_artifact, list_artifacts, save_artifact, update_artifact_state
from aaaat.candidature_fields import WRITABLE_CANDIDATURE_STORAGE_KEYS
from aaaat.candidature_lifecycle import queue_field_task, queue_lifecycle_action, queue_lifecycle_task, release_ready_lifecycle_tasks
from aaaat.candidatures import create_candidature, get_candidature, update_candidature
from aaaat.db import add_raw_intake, application_keywords, connect, delete_application, ensure_workspace_database, set_profile_variable, upsert_glossary_term
from aaaat.templates import TemplateVariableError, render_document_artifact, safe_artifact_output_path

from .user_fields import WRITABLE_USER_STORAGE_KEYS

SUPPORTED_DETAIL_EDIT_FIELDS = set(WRITABLE_CANDIDATURE_STORAGE_KEYS)
SUPPORTED_PROFILE_VARIABLE_FIELDS = set(WRITABLE_USER_STORAGE_KEYS)
_DOCUMENT_ACTIONS = {"generate_cv", "generate_cover_letter"}
_FIELD_ACTION_PREFIX = "field:"


class DesktopCommandService:
    """Small local command adapter for desktop UI writes."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)
        ensure_workspace_database(self.storage_path)

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.update_candidature_fields(candidature_ref, {"notes": body})

    def create_offer_first_candidature(
        self,
        raw_offer: str,
        *,
        company: str = "",
        role: str = "",
        source_url: str = "",
        application_form: str = "",
        request_cv: bool = False,
        request_cover_letter: bool = False,
    ) -> dict[str, Any] | None:
        text = str(raw_offer or "").strip()
        if not text:
            return None
        with connect(self.storage_path) as conn:
            created = create_candidature(
                conn,
                company=str(company or "").strip(),
                role=str(role or "").strip(),
                source_url=str(source_url or "").strip(),
                raw_application_form=str(application_form or "").strip(),
                status="active",
                priority="normal",
                raw_offer=text,
                created_by="desktop",
            )
            candidature_ref = str(created.get("id") or "")
            if request_cv:
                queue_lifecycle_action(conn, candidature_ref, "generate_cv", force_blocked=True)
            if request_cover_letter:
                queue_lifecycle_action(conn, candidature_ref, "generate_cover_letter", force_blocked=True)
            return get_candidature(conn, candidature_ref)

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
        return self.create_offer_first_candidature(
            raw_offer,
            company=company,
            role=role,
            source_url=source_url,
            application_form=raw_application_form,
            request_cv=request_cv,
            request_cover_letter=request_cover_letter,
        )

    def update_candidature_fields(self, candidature_ref: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        safe_changes = {key: changes[key] for key in SUPPORTED_DETAIL_EDIT_FIELDS if key in changes}
        if not safe_changes:
            return None
        source_text = safe_changes.pop("source_text", None)
        with connect(self.storage_path) as conn:
            if source_text is not None:
                add_raw_intake(conn, candidature_ref, str(source_text), "user")
            updated = update_candidature(conn, candidature_ref, **safe_changes) if safe_changes else update_candidature(conn, candidature_ref)
            release_ready_lifecycle_tasks(conn, candidature_ref)
            return get_candidature(conn, candidature_ref)

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
            if str(action_id or "").startswith(_FIELD_ACTION_PREFIX):
                return queue_field_task(conn, candidature_ref, str(action_id).removeprefix(_FIELD_ACTION_PREFIX))
            return queue_lifecycle_action(
                conn,
                candidature_ref,
                action_id,
                force_blocked=action_id in _DOCUMENT_ACTIONS and not _document_inputs_ready(get_candidature(conn, candidature_ref)),
            )

    def render_candidature_artifact(self, candidature_ref: str, artifact_type: str) -> dict[str, Any]:
        kind = str(artifact_type or "").strip()
        if kind not in {"cv", "cover_letter"}:
            raise ValueError("Only CV and cover-letter rendering are supported")
        with connect(self.storage_path) as conn:
            candidature = get_candidature(conn, candidature_ref)
            name = "cv" if kind == "cv" else "cover-letter"
            extra: dict[str, Any] | None = None
            if kind == "cover_letter":
                body = str(candidature.get("cover_letter_material") or "").strip()
                if not body:
                    raise ValueError("Prepare the cover-letter content before rendering it")
                extra = {"artifact.cover_letter.body": body}
            elif not str(candidature.get("cv_material") or "").strip():
                raise ValueError("Prepare the tailored CV material before rendering it")
            output_path = safe_artifact_output_path(self.storage_path, candidature_ref, name)
            try:
                return render_document_artifact(
                    conn,
                    name,
                    output_path,
                    candidature_ref,
                    extra,
                    save_version=True,
                )
            except TemplateVariableError as exc:
                missing = str(exc).partition(":")[2].strip() or str(exc)
                raise ValueError(
                    "Complete the required profile fields in User/Profile before rendering: " + missing
                ) from exc

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
                state="draft",
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

    def change_token(self) -> tuple[Any, ...]:
        """Return a cheap local revision token for external-host refresh polling."""
        with connect(self.storage_path) as conn:
            applications = conn.execute("SELECT COUNT(*), COALESCE(MAX(updated_at), '') FROM applications").fetchone()
            tasks = conn.execute("SELECT COUNT(*), COALESCE(MAX(updated_at), '') FROM tasks").fetchone()
            artifacts = conn.execute("SELECT COUNT(*), COALESCE(MAX(created_at), '') FROM generated_artifacts").fetchone()
            return tuple(applications) + tuple(tasks) + tuple(artifacts)


def _document_inputs_ready(candidature: dict[str, Any]) -> bool:
    return bool(str(candidature.get("candidature_evaluation") or "").strip() and str(candidature.get("role_strategy") or "").strip())
