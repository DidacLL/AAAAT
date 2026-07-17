from __future__ import annotations

import json
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path
from typing import Any

from .agent_access import TASK_CAPABILITY_PREFIX, build_agent_work_item
from .agent_work import claim_candidature_work, release_claimed_work
from .db import connect
from .result_ingestion import ingest_task_result
from .workspace_config import storage_directory

TASK_PROTOCOL = "aaaat.task-file"
RESULT_PROTOCOL = "aaaat.result-file"
PROTOCOL_VERSION = 1
TASK_MEDIA_TYPE = "application/vnd.aaaat.task+json"
RESULT_MEDIA_TYPE = "application/vnd.aaaat.result+json"
TEXT_RESULT_BEGIN = "<AAAAT_RESULT>"
TEXT_RESULT_END = "</AAAAT_RESULT>"
EXCHANGE_DIRECTORY_NAME = "AAAAT Exchange"
_MAX_FILE_BYTES = 5_000_000
_EXCHANGE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,80}$")


def exchange_directory(storage_path: str | Path) -> Path:
    """Return the workspace-owned exchange directory without creating it."""

    return storage_directory(storage_path) / EXCHANGE_DIRECTORY_NAME


def ensure_exchange_directory(storage_path: str | Path) -> dict[str, Path]:
    """Create the small watched-folder layout used by the V1 mixed bridge."""

    root = exchange_directory(storage_path)
    paths = {
        "root": root,
        "pending": root / "pending",
        "results": root / "results",
        "processed": root / "processed",
        "rejected": root / "rejected",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    readme = root / "README.txt"
    if not readme.exists():
        _atomic_write_text(readme, _exchange_readme())
    return paths


def exchange_status(storage_path: str | Path) -> dict[str, Any]:
    paths = ensure_exchange_directory(storage_path)
    return {
        "path": str(paths["root"]),
        "pending_tasks": len(list(paths["pending"].glob("aaaat-task-*.json"))),
        "waiting_results": len(list(paths["results"].glob("*.json"))),
    }


def export_candidature_task_file(
    storage_path: str | Path,
    candidature_ref: str,
) -> dict[str, Any]:
    """Claim ready candidature work and write one uploadable JSON task file."""

    paths = ensure_exchange_directory(storage_path)
    with connect(storage_path) as conn:
        claimed = claim_candidature_work(
            conn,
            candidature_ref,
            notes="Prepared for AI file exchange.",
        )
    claimed_ids = [str(task["id"]) for task in claimed]
    if not claimed:
        return {
            "status": "empty",
            "task_count": 0,
            "path": str(paths["root"]),
            "message": "There is no assistance ready for this candidature.",
        }

    exchange_id = secrets.token_urlsafe(12)
    task_name = f"aaaat-task-{exchange_id}.json"
    result_name = f"aaaat-result-{exchange_id}.json"
    target = paths["pending"] / task_name
    try:
        with connect(storage_path) as conn:
            work_items = [build_agent_work_item(conn, task) for task in claimed]
        payload = {
            "protocol": TASK_PROTOCOL,
            "protocol_version": PROTOCOL_VERSION,
            "media_type": TASK_MEDIA_TYPE,
            "exchange_id": exchange_id,
            "result_filename": result_name,
            "instructions": [
                "Complete each bounded work item independently using only its supplied input_context.",
                "Prefer returning one UTF-8 JSON file with the exact result_filename and result_format below.",
                "Use each task_capability only for its matching result section.",
                "Do not add entity IDs, local paths, credentials, replacement controls or unsupported actions.",
                "A failed item must not prevent returning unrelated valid results.",
                f"If this host cannot create files, return the same result object once between {TEXT_RESULT_BEGIN} and {TEXT_RESULT_END}.",
            ],
            "result_format": {
                "protocol": RESULT_PROTOCOL,
                "protocol_version": PROTOCOL_VERSION,
                "media_type": RESULT_MEDIA_TYPE,
                "exchange_id": exchange_id,
                "results": [
                    {
                        "task_capability": "copy from the matching work item",
                        "result": {},
                        "provenance": {
                            "agent_name": "",
                            "agent_runtime": "",
                            "model_provider": "",
                        },
                    }
                ],
            },
            "text_fallback": {
                "begin": TEXT_RESULT_BEGIN,
                "end": TEXT_RESULT_END,
            },
            "work_items": work_items,
        }
        _atomic_write_json(target, payload)
    except Exception:
        target.unlink(missing_ok=True)
        with connect(storage_path) as conn:
            release_claimed_work(
                conn,
                claimed_ids,
                notes="AI file exchange failed before transfer.",
            )
        raise

    return {
        "status": "exported",
        "task_count": len(work_items),
        "path": str(target),
        "exchange_path": str(paths["root"]),
        "result_filename": result_name,
        "media_type": TASK_MEDIA_TYPE,
        "message": f"Created {task_name} with {len(work_items)} ready item(s).",
    }


def import_result_file(
    storage_path: str | Path,
    result_path: str | Path,
    *,
    default_agent_name: str = "file-exchange",
    default_agent_runtime: str = "file-exchange",
) -> dict[str, Any]:
    source = Path(result_path)
    if source.is_symlink():
        raise ValueError("AAAAT result file cannot be a symbolic link")
    if not source.is_file():
        raise ValueError("AAAAT result file was not found")
    if source.stat().st_size > _MAX_FILE_BYTES:
        raise ValueError("AAAAT result file is too large")
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("AAAAT result file must be one UTF-8 JSON object") from exc
    if not isinstance(payload, dict):
        raise ValueError("AAAAT result file must contain one JSON object")
    return import_result_payload(
        storage_path,
        payload,
        default_agent_name=default_agent_name,
        default_agent_runtime=default_agent_runtime,
    )


def import_result_text(
    storage_path: str | Path,
    text: str,
) -> dict[str, Any]:
    """Import the tagged compatibility result from hosts that cannot make files."""

    payload = extract_result_payload(text)
    outcome = import_result_payload(
        storage_path,
        payload,
        default_agent_name="text-exchange",
        default_agent_runtime="chat-text",
    )
    if outcome["status"] == "accepted":
        _archive_pending_task(storage_path, str(outcome.get("exchange_id") or ""))
    return outcome


def extract_result_payload(text: str) -> dict[str, Any]:
    value = str(text or "")
    matches = re.findall(
        re.escape(TEXT_RESULT_BEGIN) + r"\s*(.*?)\s*" + re.escape(TEXT_RESULT_END),
        value,
        flags=re.DOTALL,
    )
    if len(matches) > 1:
        raise ValueError("The copied response contains more than one AAAAT result")
    candidate = matches[0] if matches else value.strip()
    try:
        payload = json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ValueError("No valid AAAAT result object was found in the copied response") from exc
    if not isinstance(payload, dict):
        raise ValueError("AAAAT result must be one JSON object")
    return payload


def import_result_payload(
    storage_path: str | Path,
    payload: dict[str, Any],
    *,
    default_agent_name: str,
    default_agent_runtime: str,
) -> dict[str, Any]:
    _validate_result_envelope(payload)
    results = payload.get("results")
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, str]] = []
    provided_capabilities: set[str] = set()
    with connect(storage_path) as conn:
        for index, item in enumerate(results):
            try:
                capability, body, provenance = _validate_result_item(item)
                if capability in provided_capabilities:
                    raise ValueError("Result contains the same task capability more than once")
                provided_capabilities.add(capability)
                acknowledgement = ingest_task_result(
                    conn,
                    capability,
                    body,
                    provenance=provenance,
                    default_agent_name=default_agent_name,
                    default_agent_runtime=default_agent_runtime,
                )
                accepted.append(
                    {
                        "task_capability": capability,
                        "acknowledgement": acknowledgement,
                    }
                )
            except (KeyError, TypeError, ValueError, sqlite3.Error) as exc:
                rejected.append({"index": str(index), "error": str(exc)[:1000]})
    expected = _pending_task_capabilities(storage_path, str(payload.get("exchange_id") or ""))
    if expected is not None:
        missing = expected - provided_capabilities
        if missing:
            rejected.append(
                {
                    "index": "missing",
                    "error": f"Result omitted {len(missing)} bounded work item(s)",
                }
            )
    return {
        "status": "accepted" if accepted and not rejected else "partial" if accepted else "rejected",
        "exchange_id": str(payload.get("exchange_id") or ""),
        "accepted": accepted,
        "rejected": rejected,
    }


def scan_exchange_results(
    storage_path: str | Path,
    *,
    minimum_age_seconds: float = 1.5,
) -> dict[str, Any]:
    """Process stable JSON files from results and archive each deterministic outcome."""

    paths = ensure_exchange_directory(storage_path)
    accepted_total = 0
    rejected_total = 0
    processed_files = 0
    skipped_files = 0
    details: list[dict[str, Any]] = []
    now = time.time()

    for source in sorted(paths["results"].glob("*.json")):
        try:
            if not source.is_file():
                continue
            if now - source.stat().st_mtime < minimum_age_seconds:
                skipped_files += 1
                continue
            outcome = import_result_file(storage_path, source)
            accepted = len(outcome.get("accepted") or [])
            rejected = len(outcome.get("rejected") or [])
            accepted_total += accepted
            rejected_total += rejected
            processed_files += 1
            destination_root = paths["processed"] if accepted else paths["rejected"]
            destination = _move_unique(source, destination_root)
            details.append({"file": destination.name, **outcome})
            if rejected:
                _write_rejection_report(paths["rejected"], source.name, outcome["rejected"])
            if outcome["status"] == "accepted":
                _archive_pending_task(storage_path, str(outcome.get("exchange_id") or ""))
        except Exception as exc:
            rejected_total += 1
            processed_files += 1
            destination = _move_unique(source, paths["rejected"])
            error = str(exc)[:1000]
            _write_rejection_report(paths["rejected"], source.name, [{"index": "file", "error": error}])
            details.append(
                {
                    "file": destination.name,
                    "status": "rejected",
                    "accepted": [],
                    "rejected": [{"index": "file", "error": error}],
                }
            )

    return {
        "status": "processed" if processed_files else "idle",
        "processed_files": processed_files,
        "skipped_files": skipped_files,
        "accepted_count": accepted_total,
        "rejected_count": rejected_total,
        "details": details,
        "path": str(paths["root"]),
    }


def write_result_file(
    output_path: str | Path,
    *,
    exchange_id: str,
    results: list[dict[str, Any]],
) -> Path:
    """Write a canonical result file; useful to hosts, fixtures and automations."""

    payload = {
        "protocol": RESULT_PROTOCOL,
        "protocol_version": PROTOCOL_VERSION,
        "media_type": RESULT_MEDIA_TYPE,
        "exchange_id": exchange_id,
        "results": results,
    }
    target = Path(output_path)
    _atomic_write_json(target, payload)
    return target


def _validate_result_envelope(payload: dict[str, Any]) -> None:
    if payload.get("protocol") != RESULT_PROTOCOL:
        raise ValueError("File is not an AAAAT result")
    if payload.get("protocol_version") != PROTOCOL_VERSION:
        raise ValueError("Unsupported AAAAT result version")
    if payload.get("media_type") != RESULT_MEDIA_TYPE:
        raise ValueError("File is not an AAAAT JSON result")
    exchange_id = str(payload.get("exchange_id") or "")
    if not _EXCHANGE_ID_RE.fullmatch(exchange_id):
        raise ValueError("AAAAT result has an invalid exchange identifier")
    results = payload.get("results")
    if not isinstance(results, list) or not results:
        raise ValueError("AAAAT result must contain at least one result section")


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


def _pending_task_capabilities(storage_path: str | Path, exchange_id: str) -> set[str] | None:
    if not _EXCHANGE_ID_RE.fullmatch(exchange_id):
        return None
    paths = ensure_exchange_directory(storage_path)
    source = paths["pending"] / f"aaaat-task-{exchange_id}.json"
    if not source.is_file() or source.is_symlink():
        return None
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    work_items = payload.get("work_items") if isinstance(payload, dict) else None
    if not isinstance(work_items, list):
        return None
    capabilities: set[str] = set()
    for item in work_items:
        task = item.get("task") if isinstance(item, dict) else None
        capability = str(task.get("task_capability") or "") if isinstance(task, dict) else ""
        if capability.startswith(TASK_CAPABILITY_PREFIX):
            capabilities.add(capability)
    return capabilities or None


def _archive_pending_task(storage_path: str | Path, exchange_id: str) -> None:
    if not _EXCHANGE_ID_RE.fullmatch(exchange_id):
        return
    paths = ensure_exchange_directory(storage_path)
    source = paths["pending"] / f"aaaat-task-{exchange_id}.json"
    if source.exists():
        _move_unique(source, paths["processed"])


def _move_unique(source: Path, directory: Path) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / source.name
    if target.exists():
        target = directory / f"{source.stem}-{secrets.token_hex(4)}{source.suffix}"
    return source.replace(target)


def _write_rejection_report(directory: Path, source_name: str, errors: list[dict[str, str]]) -> None:
    report = directory / f"{source_name}.errors.json"
    if report.exists():
        report = directory / f"{source_name}.{secrets.token_hex(4)}.errors.json"
    _atomic_write_json(report, {"source": source_name, "errors": errors})


def _atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    _atomic_write_text(
        path,
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    )


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.{secrets.token_hex(4)}.tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def _exchange_readme() -> str:
    return (
        "AAAAT AI exchange\n\n"
        "pending: task files created by AAAAT for upload to an AI.\n"
        "results: save or move returned AAAAT JSON result files here. AAAAT checks this folder automatically.\n"
        "processed: accepted task and result files.\n"
        "rejected: files or result sections that AAAAT could not validate.\n\n"
        "Direct MCP remains the preferred live connection. This folder is the safe file carrier when a live connection is unavailable.\n"
    )
