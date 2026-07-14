from __future__ import annotations

import json
import sqlite3
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

from .agent_access import build_agent_task_context, submit_agent_task_result, task_handle
from .db import connect
from .tasks import list_tasks

BUNDLE_PROTOCOL = "aaaat.portable-bundle"
BUNDLE_VERSION = 1
TASK_MEDIA_TYPE = "application/vnd.aaaat.task+zip"
RESULT_MEDIA_TYPE = "application/vnd.aaaat.result+zip"
_MAX_ENTRY_BYTES = 5_000_000


def export_candidature_task_bundle(
    storage_path: str | Path,
    candidature_ref: str,
    output_path: str | Path,
    *,
    states: tuple[str, ...] = ("queued", "blocked", "failed"),
) -> dict[str, Any]:
    """Write all eligible bounded tasks for one candidature into one archive."""

    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with connect(storage_path) as conn:
        eligible = [
            task
            for task in list_tasks(conn, application_id=candidature_ref)
            if str(task.get("state") or "") in states
        ]
        contexts = [build_agent_task_context(conn, task_handle(task)) for task in eligible]

    manifest = {
        "protocol": BUNDLE_PROTOCOL,
        "protocol_version": BUNDLE_VERSION,
        "media_type": TASK_MEDIA_TYPE,
        "task_count": len(contexts),
        "instructions": [
            "Complete each bounded task independently using only its supplied context.",
            "Return one result bundle containing results.json.",
            "Do not add entity IDs, file paths, storage paths, or unsupported actions.",
            "A failed task result must not prevent returning valid results for other tasks.",
        ],
    }
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", _json_bytes(manifest))
        archive.writestr("tasks.json", _json_bytes({"tasks": contexts}))
        archive.writestr("README.txt", _bundle_readme(len(contexts)))
    return {"path": str(target), "task_count": len(contexts), "media_type": TASK_MEDIA_TYPE}


def import_candidature_result_bundle(
    storage_path: str | Path,
    result_path: str | Path,
    *,
    agent_name: str = "portable-bundle",
    agent_runtime: str = "browser-or-manual",
) -> dict[str, Any]:
    """Validate and submit each returned result independently.

    One invalid section is reported without discarding unrelated valid sections.
    """

    payload = _read_result_payload(result_path)
    results = payload.get("results")
    if not isinstance(results, list):
        raise ValueError("Portable result bundle must contain a results list")

    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, str]] = []
    with connect(storage_path) as conn:
        for index, item in enumerate(results):
            try:
                handle, body, provenance = _validate_result_item(item)
                acknowledgement = submit_agent_task_result(
                    conn,
                    handle,
                    json.dumps(body, ensure_ascii=False),
                    agent_name=str(provenance.get("agent_name") or agent_name),
                    agent_runtime=str(provenance.get("agent_runtime") or agent_runtime),
                    model_provider=str(provenance.get("model_provider") or ""),
                )
                accepted.append({"task_handle": handle, "acknowledgement": acknowledgement})
            except (KeyError, TypeError, ValueError, sqlite3.Error) as exc:
                rejected.append({"index": str(index), "error": str(exc)[:1000]})
    return {
        "status": "accepted" if accepted and not rejected else "partial" if accepted else "rejected",
        "accepted": accepted,
        "rejected": rejected,
    }


def write_result_bundle(output_path: str | Path, results: list[dict[str, Any]]) -> Path:
    """Write a deterministic result archive for connectors and tests."""

    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    manifest = {
        "protocol": BUNDLE_PROTOCOL,
        "protocol_version": BUNDLE_VERSION,
        "media_type": RESULT_MEDIA_TYPE,
        "result_count": len(results),
    }
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", _json_bytes(manifest))
        archive.writestr("results.json", _json_bytes({"results": results}))
    return target


def _read_result_payload(path: str | Path) -> dict[str, Any]:
    source = Path(path)
    with zipfile.ZipFile(source) as archive:
        names = set(archive.namelist())
        for name in names:
            pure = PurePosixPath(name)
            if pure.is_absolute() or ".." in pure.parts:
                raise ValueError(f"Unsafe bundle entry: {name}")
        if "manifest.json" not in names or "results.json" not in names:
            raise ValueError("Portable result bundle requires manifest.json and results.json")
        manifest = _read_json_entry(archive, "manifest.json")
        if manifest.get("protocol") != BUNDLE_PROTOCOL or manifest.get("protocol_version") != BUNDLE_VERSION:
            raise ValueError("Unsupported portable result bundle protocol")
        if manifest.get("media_type") != RESULT_MEDIA_TYPE:
            raise ValueError("Archive is not an AAAAT result bundle")
        return _read_json_entry(archive, "results.json")


def _read_json_entry(archive: zipfile.ZipFile, name: str) -> dict[str, Any]:
    info = archive.getinfo(name)
    if info.file_size > _MAX_ENTRY_BYTES:
        raise ValueError(f"Bundle entry is too large: {name}")
    value = json.loads(archive.read(info).decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Bundle entry must be a JSON object: {name}")
    return value


def _validate_result_item(item: Any) -> tuple[str, dict[str, Any], dict[str, str]]:
    if not isinstance(item, dict):
        raise ValueError("Result section must be an object")
    handle = str(item.get("task_handle") or "").strip()
    if not handle.startswith("taskh_"):
        raise ValueError("Result section has an invalid opaque task handle")
    body = item.get("result")
    if not isinstance(body, dict):
        raise ValueError("Result section must contain one result object")
    forbidden = {"application_id", "candidature_id", "artifact_id", "storage_path", "file_path"}
    if forbidden.intersection(body):
        raise ValueError("Result section contains forbidden authority fields")
    provenance_value = item.get("provenance") or {}
    if not isinstance(provenance_value, dict):
        raise ValueError("Result provenance must be an object")
    provenance = {
        key: str(provenance_value.get(key) or "")[:500]
        for key in ("agent_name", "agent_runtime", "model_provider")
    }
    return handle, body, provenance


def _json_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _bundle_readme(task_count: int) -> str:
    return (
        "AAAAT portable bounded task bundle\n\n"
        f"This archive contains {task_count} independent task section(s).\n"
        "Read manifest.json and tasks.json. Return one AAAAT result archive with results.json.\n"
        "Do not return internal IDs, local paths, credentials, or unsupported actions.\n"
    )
