from __future__ import annotations

import sqlite3
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .db import DEFAULT_PRIVATE_DIR, init_db


def local_storage_root(path: str | Path = DEFAULT_PRIVATE_DIR) -> Path:
    raw = Path(path)
    return raw.parent if raw.suffix == ".db" else raw


def _is_relative_to(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def _backup_filename() -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"aaaat-backup-{timestamp}.zip"


def _resolve_backup_path(storage: str | Path, output: str | Path | None, force: bool) -> Path:
    storage_root = local_storage_root(storage).resolve()
    if output is None:
        target = storage_root / "backups" / _backup_filename()
    else:
        requested = Path(output)
        target = requested / _backup_filename() if requested.suffix.lower() != ".zip" else requested
        target = target.resolve()
        if not force and not _is_relative_to(target, storage_root):
            raise ValueError("Backup output outside local storage requires --force")
    return target


def verify_local_backup(path: str | Path) -> dict[str, Any]:
    """Verify archive readability and SQLite integrity for a local backup."""

    backup = Path(path)
    with zipfile.ZipFile(backup) as archive:
        damaged = archive.testzip()
        if damaged:
            raise ValueError(f"Backup archive contains a damaged entry: {damaged}")
        names = archive.namelist()
        database_entries = [
            name
            for name in names
            if "/" not in name.rstrip("/") and Path(name).suffix.lower() in {".db", ".sqlite3"}
        ]
        if len(database_entries) != 1:
            raise ValueError("Backup archive must contain exactly one root SQLite database")
        database_entry = database_entries[0]
        artifact_count = sum(1 for name in names if name.startswith("artifacts/") and not name.endswith("/"))
        with tempfile.TemporaryDirectory(prefix="aaaat-backup-verify-") as tmp:
            extracted = Path(tmp) / "verified.sqlite3"
            with archive.open(database_entry) as source, extracted.open("wb") as output:
                shutil.copyfileobj(source, output)
            conn = sqlite3.connect(extracted)
            try:
                result = str(conn.execute("PRAGMA quick_check").fetchone()[0])
            finally:
                conn.close()
            if result.lower() != "ok":
                raise ValueError(f"Backup SQLite integrity check failed: {result}")
    return {
        "database": database_entry,
        "artifacts": artifact_count,
        "entries": len(names),
    }


def create_local_backup(
    storage: str | Path = DEFAULT_PRIVATE_DIR,
    output: str | Path | None = None,
    *,
    force: bool = False,
) -> Path:
    """Create and verify a timestamped backup zip for SQLite and artifact files."""

    source_db = init_db(storage)
    storage_root = source_db.parent
    backup_path = _resolve_backup_path(storage, output, force)
    backup_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="aaaat-backup-") as tmp:
        stable_db = Path(tmp) / source_db.name
        source = sqlite3.connect(source_db)
        destination = sqlite3.connect(stable_db)
        try:
            source.backup(destination)
        finally:
            # Windows keeps the temporary database locked until both handles are
            # closed. Do this before creating the archive or cleaning the temp dir.
            destination.close()
            source.close()
        with zipfile.ZipFile(backup_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.write(stable_db, arcname=source_db.name)
            artifacts_dir = storage_root / "artifacts"
            if artifacts_dir.exists():
                for artifact in sorted(artifacts_dir.rglob("*")):
                    if artifact.is_file():
                        archive.write(artifact, arcname=artifact.relative_to(storage_root).as_posix())
    verify_local_backup(backup_path)
    return backup_path


def restore_local_backup(backup: str | Path, destination: str | Path) -> dict[str, Any]:
    """Restore a verified archive into a new or empty workspace directory.

    Restore deliberately never replaces an existing workspace. It is a local
    maintenance operation intended for inspection before switching workspaces.
    """

    backup_path = Path(backup).resolve()
    workspace = Path(destination).resolve()
    if workspace.suffix:
        raise ValueError("Restore output must be a workspace directory")
    if workspace.exists() and any(workspace.iterdir()):
        raise ValueError("Restore destination must be a new or empty directory")

    summary = verify_local_backup(backup_path)
    database_entry = str(summary["database"])
    with tempfile.TemporaryDirectory(prefix="aaaat-backup-restore-") as tmp:
        staging = Path(tmp) / "workspace"
        staging.mkdir()
        with zipfile.ZipFile(backup_path) as archive:
            for name in archive.namelist():
                if name.endswith("/"):
                    continue
                target = staging / name
                if target != staging / database_entry and not str(name).startswith("artifacts/"):
                    continue
                resolved = target.resolve()
                if not _is_relative_to(resolved, staging.resolve()):
                    raise ValueError("Backup archive contains an unsafe path")
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(name) as source, target.open("wb") as output:
                    output.write(source.read())

        restored_db = staging / database_entry
        conn = sqlite3.connect(restored_db)
        try:
            result = str(conn.execute("PRAGMA quick_check").fetchone()[0])
        finally:
            conn.close()
        if result.lower() != "ok":
            raise ValueError(f"Restored SQLite integrity check failed: {result}")

        workspace.mkdir(parents=True, exist_ok=True)
        for item in staging.iterdir():
            target = workspace / item.name
            if item.is_dir():
                shutil.copytree(item, target)
            else:
                target.write_bytes(item.read_bytes())

    return {"workspace": str(workspace), **summary}
