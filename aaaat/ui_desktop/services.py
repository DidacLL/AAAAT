from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.db import connect, delete_application, set_profile_variable, update_application

SUPPORTED_DETAIL_EDIT_FIELDS = {
    "company",
    "role",
    "status",
    "priority",
    "source",
    "source_url",
    "location",
    "remote_mode",
    "next_action",
    "notes",
    "keywords",
    "call_signals",
    "pitch",
    "smart_question",
    "risks_to_avoid",
    "prepare_first",
    "prepare_later",
    "offer_snapshot",
    "company_research",
    "form_answers",
}

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
    """Tiny local command adapter for desktop UI writes."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.update_candidature_fields(candidature_ref, {"notes": body})

    def update_candidature_fields(self, candidature_ref: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        safe_changes = {key: changes[key] for key in SUPPORTED_DETAIL_EDIT_FIELDS if key in changes}
        if not safe_changes:
            return None
        with connect(self.storage_path) as conn:
            return update_application(conn, candidature_ref, **safe_changes)

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
