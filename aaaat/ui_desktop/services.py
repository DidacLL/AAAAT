from __future__ import annotations

from pathlib import Path
from typing import Any

from aaaat.db import connect, update_application

SUPPORTED_DETAIL_EDIT_FIELDS = {
    "company",
    "role",
    "status",
    "priority",
    "location",
    "remote_mode",
    "source",
    "source_url",
    "next_action",
    "notes",
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
