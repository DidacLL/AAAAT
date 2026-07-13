from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.candidatures import CANDIDATURE_DETAIL_FIELDS, get_candidature, update_candidature
from aaaat.db import APPLICATION_UPDATE_FIELDS, add_raw_intake, connect, delete_application, set_profile_variable

SUPPORTED_DETAIL_EDIT_FIELDS = set(APPLICATION_UPDATE_FIELDS) | set(CANDIDATURE_DETAIL_FIELDS) | {"keywords", "source_text"}
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


class DesktopCommandService:
    """Small human-command adapter over AAAAT domain persistence."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.update_candidature_fields(candidature_ref, {"notes": body})

    def get_candidature_record(self, candidature_ref: str) -> dict[str, Any]:
        with connect(self.storage_path) as conn:
            candidature = get_candidature(conn, candidature_ref)
        record = dict(candidature)
        record.update(candidature.get("details") or {})
        raw = list(candidature.get("raw_intake") or [])
        record["source_text"] = "\n\n".join(str(item.get("content") or "") for item in reversed(raw)).strip()
        return record

    def update_candidature_fields(self, candidature_ref: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        safe_changes = {key: changes[key] for key in SUPPORTED_DETAIL_EDIT_FIELDS if key in changes}
        source_text = safe_changes.pop("source_text", None)
        if not safe_changes and source_text is None:
            return None
        with connect(self.storage_path) as conn:
            candidature = update_candidature(conn, candidature_ref, **safe_changes) if safe_changes else get_candidature(conn, candidature_ref)
            if source_text is not None:
                row = conn.execute(
                    "SELECT id FROM raw_intake WHERE application_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
                    (candidature_ref,),
                ).fetchone()
                if row is None:
                    add_raw_intake(conn, candidature_ref, str(source_text), "user")
                else:
                    conn.execute("UPDATE raw_intake SET content = ? WHERE id = ?", (str(source_text), row["id"]))
                    conn.commit()
                candidature = get_candidature(conn, candidature_ref)
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
