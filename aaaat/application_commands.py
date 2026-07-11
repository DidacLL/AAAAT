from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Mapping

from .candidature_fields import WRITABLE_CANDIDATURE_STORAGE_KEYS
from .db import connect, delete_application, set_profile_variable, update_application

SUPPORTED_PROFILE_VARIABLE_FIELDS = frozenset({
    "profile.display_name",
    "profile.email",
    "profile.phone",
    "profile.location",
    "profile.linkedin_url",
    "profile.github_url",
    "profile.portfolio_url",
    "profile.summary.default",
})


class CommandValidationError(ValueError):
    pass


class CommandNotFoundError(LookupError):
    pass


class ApplicationCommandService:
    """Human-local application commands shared by first-party UI adapters."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def save_primary_note(self, candidature_ref: str, body: str) -> dict[str, Any]:
        result = self.update_candidature_fields(candidature_ref, {"notes": body})
        if result is None:
            raise CommandValidationError("Primary note update requires a change")
        return result

    def update_candidature_fields(
        self,
        candidature_ref: str,
        changes: Mapping[str, Any],
    ) -> dict[str, Any] | None:
        if not candidature_ref:
            raise CommandValidationError("Candidature reference is required")
        unsupported = set(changes) - WRITABLE_CANDIDATURE_STORAGE_KEYS
        if unsupported:
            raise CommandValidationError(f"Unsupported candidature fields: {sorted(unsupported)}")
        safe_changes = {
            key: self._normalize_candidature_value(key, value)
            for key, value in changes.items()
            if key in WRITABLE_CANDIDATURE_STORAGE_KEYS
        }
        if not safe_changes:
            return None
        try:
            with connect(self.storage_path) as conn:
                return update_application(conn, candidature_ref, **safe_changes)
        except KeyError as exc:
            raise CommandNotFoundError(f"Candidature not found: {candidature_ref}") from exc

    def delete_candidature(self, candidature_ref: str) -> bool:
        if not candidature_ref:
            raise CommandValidationError("Candidature reference is required")
        with connect(self.storage_path) as conn:
            return delete_application(conn, candidature_ref)

    def update_profile_variables(self, changes: Mapping[str, Any]) -> dict[str, str]:
        unsupported = set(changes) - SUPPORTED_PROFILE_VARIABLE_FIELDS
        if unsupported:
            raise CommandValidationError(f"Unsupported profile fields: {sorted(unsupported)}")
        safe_changes = {
            key: str(value).strip()
            for key, value in changes.items()
            if key in SUPPORTED_PROFILE_VARIABLE_FIELDS
        }
        if not safe_changes:
            return {}
        with connect(self.storage_path) as conn:
            for key, value in safe_changes.items():
                set_profile_variable(conn, key, value)
        return safe_changes

    @staticmethod
    def _normalize_candidature_value(key: str, value: Any) -> Any:
        if key == "keywords":
            if isinstance(value, str):
                parts = re.split(r"[,\n]", value)
            else:
                parts = list(value or [])
            normalized: list[str] = []
            seen: set[str] = set()
            for part in parts:
                item = str(part).strip()
                if not item or item in seen:
                    continue
                seen.add(item)
                normalized.append(item)
            return normalized
        if value is None:
            return ""
        return str(value)
