from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.artifacts import save_artifact, update_artifact_state
from aaaat.candidatures import CANDIDATURE_DETAIL_FIELDS, update_candidature
from aaaat.db import (
    APPLICATION_UPDATE_FIELDS,
    connect,
    delete_application,
    set_profile_variable,
    update_latest_raw_intake,
)
from aaaat.profile_facts import (
    archive_profile_fact,
    create_profile_fact,
    list_profile_facts,
    update_profile_fact,
)

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
SUPPORTED_DETAIL_EDIT_FIELDS = set(APPLICATION_UPDATE_FIELDS) | set(CANDIDATURE_DETAIL_FIELDS) | {"keywords", "source_text"}


class DesktopCommandService:
    """Local human-command adapter for desktop writes."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.update_candidature_fields(candidature_ref, {"notes": body})

    def update_candidature_fields(self, candidature_ref: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        safe_changes = {key: changes[key] for key in SUPPORTED_DETAIL_EDIT_FIELDS if key in changes}
        raw_offer = safe_changes.pop("source_text", None)
        if not safe_changes and raw_offer is None:
            return None
        with connect(self.storage_path) as conn:
            if safe_changes:
                candidature = update_candidature(conn, candidature_ref, **safe_changes)
            else:
                from aaaat.candidatures import get_candidature

                candidature = get_candidature(conn, candidature_ref)
            if raw_offer is not None:
                update_latest_raw_intake(conn, candidature_ref, str(raw_offer))
            return candidature

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

    def list_profile_facts(self) -> list[dict[str, Any]]:
        with connect(self.storage_path) as conn:
            return list_profile_facts(conn, include_archived=True)

    def create_profile_fact(self, fields: dict[str, Any]) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return create_profile_fact(conn, **fields)

    def update_profile_fact(self, fact_id: str, fields: dict[str, Any]) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return update_profile_fact(conn, fact_id, **fields)

    def archive_profile_fact(self, fact_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return archive_profile_fact(conn, fact_id)

    def register_external_artifact(
        self,
        candidature_ref: str,
        artifact_type: str,
        path: str,
        label: str,
    ) -> dict[str, Any]:
        candidate = Path(path).expanduser().resolve()
        if not candidate.is_file():
            raise ValueError("Select an existing artifact file")
        with connect(self.storage_path) as conn:
            return save_artifact(
                conn,
                candidature_ref,
                artifact_type,
                str(candidate),
                label or candidate.name,
                source_context="user:external-artifact",
                review_state="reviewed",
                notes="Registered by the user from an existing local file.",
            )

    def archive_artifact(self, artifact_id: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            return update_artifact_state(conn, artifact_id, "archived")
