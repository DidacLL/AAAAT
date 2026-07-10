from __future__ import annotations

from pathlib import Path

from aaaat.db import connect, update_application


class DesktopCommandService:
    """Tiny local command adapter for desktop UI writes."""

    def __init__(self, storage_path: str | Path) -> None:
        self.storage_path = str(storage_path)

    def save_note(self, candidature_ref: str, body: str) -> None:
        with connect(self.storage_path) as conn:
            update_application(conn, candidature_ref, notes=body)
