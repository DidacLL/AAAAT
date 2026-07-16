from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Any

from .browser_companion import browser_extension_bundle, native_host_manifest
from .db import connect
from .integration_setup import connection_modes, configure_integration, current_integration, disable_automatic_integration, integration_options
from .runtime_conformance import read_conformance_state, run_configured_runtime_conformance
from .tasks import create_task, list_tasks

_VISIBLE_STATES = {"queued", "claimed", "in_progress", "blocked", "failed", "cancelled", "completed"}


def assistance_snapshot(storage_path: str | Path, *, include_advanced: bool = False, progress_by_task: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    progress_by_task = progress_by_task or {}
    integration = current_integration(storage_path)
    advanced_command_active = bool(integration.get("automatic")) and str(integration.get("id") or "") == "argv_custom_command"
    with connect(storage_path) as conn:
        tasks = [{
            "id": str(task.get("id") or ""),
            "title": str(task.get("title") or task.get("task_type") or "Task"),
            "task_type": str(task.get("task_type") or ""),
            "state": str(task.get("state") or ""),
            "priority": str(task.get("priority") or "normal"),
            "notes": str(task.get("notes") or ""),
            "updated_at": str(task.get("updated_at") or ""),
            "can_run": advanced_command_active and str(task.get("state") or "") == "queued",
            "can_retry": str(task.get("state") or "") in {"failed", "cancelled"},
            "can_cancel": str(task.get("state") or "") in {"queued", "claimed", "in_progress", "blocked", "failed"},
            "progress": dict(progress_by_task.get(str(task.get("id") or "")) or {}),
        } for task in list_tasks(conn) if str(task.get("state") or "") in _VISIBLE_STATES]
    tasks.sort(key=lambda item: (item["state"] == "completed", item["updated_at"]), reverse=False)
    return {
        "integration": integration,
        "connection_modes": connection_modes(),
        "options": integration_options(include_advanced=include_advanced),
        "conformance": read_conformance_state(storage_path),
        "tasks": tasks,
    }


def create_profile_completion_task(storage_path: str | Path) -> dict[str, Any]:
    with connect(storage_path) as conn:
        return create_task(conn, "profile_completion", "Complete professional profile", instructions="Suggest bounded values for eligible missing profile fields. Preserve non-empty user values.", state="queued", priority="high", context_hint="profile:completion", created_by="desktop", idempotent=True)


def save_integration(storage_path: str | Path, adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    return configure_integration(storage_path, adapter_id, settings)


def use_manual_integration(storage_path: str | Path) -> dict[str, Any]:
    return disable_automatic_integration(storage_path)


def run_integration_conformance(storage_path: str | Path) -> dict[str, Any]:
    """Conformance applies only to an explicitly configured Advanced command."""
    return run_configured_runtime_conformance(storage_path)


def external_host_instructions(_storage_path: str | Path) -> str:
    return """Connect an external AI or agent host to AAAAT's existing bounded task queue.

The external host initiates every call. AAAAT does not launch, host, configure, or call an LLM.

Use only the existing bounded operations:
- obtain one complete eligible work item, including purpose-scoped context, response schema, privacy notes, and permitted actions;
- report progress using the work item's random task capability;
- submit one structured result using that same capability;
- submit one explicitly permitted bounded action.

The task capability is a random, attempt-scoped callback capability. It is not a task ID, candidature ID, database key, or permission to inspect other records.

A wrapper may use MCP, CLI, HTTP, files, browser messaging, or another host-owned transport. It must reuse AAAAT's existing queue and canonical result-ingestion path. It must not create another queue, expose broad entity listing or search, access SQLite directly, use internal IDs as authority, choose artifact paths, or read arbitrary local files.

Provider selection, model selection, credentials, network policy, provider SDKs, browser automation, and inference remain entirely owned by the external host.
"""


def export_browser_companion_package(storage_path: str | Path, output_path: str | Path, host_executable: str = "aaaat-browser-host") -> Path:
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    files = browser_extension_bundle()
    manifest = native_host_manifest(storage_path, host_executable)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(f"extension/{name}", content)
        archive.writestr("native-host-manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        archive.writestr("INSTALL.txt", "Install AAAAT normally, load extension/ as an unpacked extension, replace __AAAT_EXTENSION_ID__ in the native host manifest, then install that manifest in the browser's documented native-messaging host directory. The browser initiates complete bounded work-item calls; credentials remain with the browser or external AI host.\n")
    return target
