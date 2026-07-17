from __future__ import annotations

import json
import sqlite3
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

from .agent_access import TASK_CAPABILITY_PREFIX, build_agent_work_item
from .db import connect
from .result_ingestion import ingest_task_result
from .tasks import list_tasks, update_task

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
    states: tuple[str, ...] = ("queued",),
) -> dict[str, Any]:
    """Claim and write all ready complete work items for one candidature."""
    if set(states) != {"queued"}:
        raise ValueError("Portable export accepts ready queued work only")
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    claimed_ids: list[str] = []
    with connect(storage_path) as conn:
        eligible = [
            task
            for task in list_tasks(conn, application_id=candidature_ref)
            if str(task.get("state") or "") == "queued"
        ]
        work_items: list[dict[str, Any]] = []
        for task in eligible:
            task_id = str(task.get("id") or "")
            claimed = update_task(conn, task_id, state="claimed", notes="Exported through portable exchange.")
            claimed_ids.append(task_id)
            work_items.append(build_agent_work_item(conn, claimed))

    if not work_items:
        return {
            "status": "empty",
            "task_count": 0,
            "media_type": TASK_MEDIA_TYPE,
            "message": "There is no assistance ready to export for this candidature.",
        }

    manifest = {
        "protocol": BUNDLE_PROTOCOL,
        "protocol_version": BUNDLE_VERSION,
        "media_type": TASK_MEDIA_TYPE,
        "task_count": len(work_items),
        "instructions": [
            "Complete each bounded work item independently using only its supplied input_context.",
            "Return one result bundle containing results.json.",
            "Use task_capability only for the matching result section.",
            "Do not add entity IDs, file paths, storage paths, replacement controls or unsupported actions.",
            "A failed result must not prevent returning unrelated valid results.",
        ],
    }
    try:
        with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("manifest.json", _json_bytes(manifest))
            archive.writestr("work-items.json", _json_bytes({"work_items": work_items}))
            archive.writestr("README.txt", _bundle_readme(len(work_items)))
    except Exception:
        with connect(storage_path) as conn:
            for task_id in claimed_ids:
                row = conn.execute("SELECT state FROM tasks WHERE id = ?", (task_id,)).fetchone()
                if row and str(row["state"] or "") == "claimed":
                    update_task(conn, task_id, state="queued", notes="Portable export failed before transfer.")
        raise
    return {
        "status": "exported",
        "path": str(target),
        "task_count": len(work_items),
        "media_type": TASK_MEDIA_TYPE,
        "message": f"Created a file with {len(work_items)} ready item(s) for your selected AI.",
    }


def import_candidature_result_bundle(
    storage_path: str | Path,
    result_path: str | Path,
    *,
    agent_name: str = "portable-bundle",
    agent_runtime: str = "portable-exchange",
) -> dict[str, Any]:
    payload = _read_result_payload(result_path)
    results = payload.get("results")
    if not isinstance(results, list):
        raise ValueError("Portable result bundle must contain a results list")

    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, str]] = []
    with connect(storage_path) as conn:
        for index, item in enumerate(results):
            try:
                capability, body, provenance = _validate_result_item(item)
                acknowledgement = ingest_task_result(
                    conn,
                    capability,
                    body,
                    provenance=provenance,
                    default_agent_name=agent_name,
                    default_agent_runtime=agent_runtime,
                )
                accepted.append({"task_capability": capability, "acknowledgement": acknowledgement})
            except (KeyError, TypeError, ValueError, sqlite3.Error) as exc:
                rejected.append({"index": str(index), "error": str(exc)[:1000]})
    return {
        "status": "accepted" if accepted and not rejected else "partial" if accepted else "rejected",
        "accepted": accepted,
        "rejected": rejected,
    }


def write_result_bundle(output_path: str | Path, results: list[dict[str, Any]]) -> Path:
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
    capability = str(item.get("task_capability") or "").strip()
    if not capability.startswith(TASK_CAPABILITY_PREFIX):
        raise ValueError("Result section has an invalid task capability")
    body = item.get("result")
    if not isinstance(body, dict):
        raise ValueError("Result section must contain one result object")
    provenance_value = item.get("provenance") or {}
    if not isinstance(provenance_value, dict):
        raise ValueError("Result provenance must be an object")
    provenance = {
        key: str(provenance_value.get(key) or "")[:500]
        for key in ("agent_name", "agent_runtime", "model_provider")
    }
    return capability, body, provenance


def _json_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _bundle_readme(task_count: int) -> str:
    return (
        "AAAAT portable bounded work bundle\n\n"
        f"This archive contains {task_count} independent complete work item(s).\n"
        "Read manifest.json and work-items.json. Return one AAAAT result archive with results.json.\n"
        "Do not return internal IDs, local paths, credentials, replacement controls or unsupported actions.\n"
    )
