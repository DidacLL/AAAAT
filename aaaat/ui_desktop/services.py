from __future__ import annotations

from typing import Any, Mapping

from aaaat.application_commands import (
    ApplicationCommandService,
    CommandNotFoundError,
    CommandValidationError,
    SUPPORTED_PROFILE_VARIABLE_FIELDS,
)
from aaaat.candidature_fields import WRITABLE_CANDIDATURE_STORAGE_KEYS

SUPPORTED_DETAIL_EDIT_FIELDS = WRITABLE_CANDIDATURE_STORAGE_KEYS


class DesktopCommandService(ApplicationCommandService):
    """Thin wx adapter over shared human-local commands.

    The desktop boundary preserves its historical behavior of filtering unknown
    widget fields before delegating to the strict core command service. Durable
    persistence remains owned by ``ApplicationCommandService`` and its
    ``update_application`` storage boundary.
    """

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.save_primary_note(candidature_ref, body)

    def update_candidature_fields(
        self,
        candidature_ref: str,
        changes: Mapping[str, Any],
    ) -> dict[str, Any] | None:
        safe_changes = {
            key: value
            for key, value in changes.items()
            if key in SUPPORTED_DETAIL_EDIT_FIELDS
        }
        return super().update_candidature_fields(candidature_ref, safe_changes)

    def update_profile_variables(self, changes: Mapping[str, Any]) -> dict[str, str]:
        safe_changes = {
            key: value
            for key, value in changes.items()
            if key in SUPPORTED_PROFILE_VARIABLE_FIELDS
        }
        return super().update_profile_variables(safe_changes)


__all__ = [
    "CommandNotFoundError",
    "CommandValidationError",
    "DesktopCommandService",
    "SUPPORTED_DETAIL_EDIT_FIELDS",
    "SUPPORTED_PROFILE_VARIABLE_FIELDS",
]
