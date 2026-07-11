from __future__ import annotations

from aaaat.application_commands import (
    ApplicationCommandService,
    CommandNotFoundError,
    CommandValidationError,
    SUPPORTED_PROFILE_VARIABLE_FIELDS,
)
from aaaat.candidature_fields import WRITABLE_CANDIDATURE_STORAGE_KEYS

SUPPORTED_DETAIL_EDIT_FIELDS = WRITABLE_CANDIDATURE_STORAGE_KEYS


class DesktopCommandService(ApplicationCommandService):
    """Backward-compatible desktop alias for shared human-local commands."""

    def save_note(self, candidature_ref: str, body: str) -> None:
        self.save_primary_note(candidature_ref, body)


__all__ = [
    "CommandNotFoundError",
    "CommandValidationError",
    "DesktopCommandService",
    "SUPPORTED_DETAIL_EDIT_FIELDS",
    "SUPPORTED_PROFILE_VARIABLE_FIELDS",
]
