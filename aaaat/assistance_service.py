from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Any

from .browser_companion import browser_extension_bundle, native_host_manifest
from .connector_packages import connector_construction_prompt, install_and_activate_connector, preview_connector_package
from .db import connect
from .integration_setup import connection_modes, configure_integration, current_integration, disable_automatic_integration, integration_options
from .runtime_conformance import negotiate_configured_runtime, read_conformance_state, run_configured_runtime_conformance
from .tasks import create_task, list_tasks

_VISIBLE_STATES = {"queued", "claimed", "in_progress", "blocked", "failed", "cancelled", "completed"}


def assistance_snapshot(storage_path: str | Path, *, include_advanced: bool = False, progress_by_task: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    progress_by_task = progress_by_task or {}
    with connect(storage_path) as conn:
        tasks = [{
            "id": str(task.get("id") or ""),
            "title": str(task.get("title") or task.get("task_type") or "Task"),
            "task_type": str(task.get("task_type") or ""),
            "state": str(task.get("state") or ""),
            "priority": str(task.get("priority") or "normal"),
            "notes": str(task.get("notes") or ""),
            "updated_at": str(task.get("updated_at") or ""),
            "can_run": str(task.get("state") or "") in {"queued", "blocked"},
            "can_retry": str(task.get("state") or "") in {"failed", "cancelled"},
            "can_cancel": str(task.get("state") or "") in {"queued", "claimed", "in_progress", "blocked", "failed"},
            "progress": dict(progress_by_task.get(str(task.get("id") or "")) or {}),
        } for task in list_tasks(conn) if str(task.get("state") or "") in _VISIBLE_STATES]
    tasks.sort(key=lambda item: (item["state"] == "completed", item["updated_at"]), reverse=False)
    return {
        "integration": current_integration(storage_path),
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
    return run_configured_runtime_conformance(storage_path)


def negotiate_integration(storage_path: str | Path) -> dict[str, Any]:
    return negotiate_configured_runtime(storage_path)


def connector_prompt(storage_path: str | Path) -> str:
    selected = current_integration(storage_path)
    return connector_construction_prompt(str(selected.get("id") or "argv_custom_command"), dict(selected.get("settings") or {}))


def preview_generated_connector(payload: str) -> dict[str, Any]:
    return preview_connector_package(payload)


def install_generated_connector(storage_path: str | Path, payload: str) -> dict[str, Any]:
    return install_and_activate_connector(storage_path, payload)


def export_browser_companion_package(storage_path: str | Path, output_path: str | Path, host_executable: str = "aaaat-browser-host") -> Path:
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    files = browser_extension_bundle()
    manifest = native_host_manifest(storage_path, host_executable)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(f"extension/{name}", content)
        archive.writestr("native-host-manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        archive.writestr("INSTALL.txt", "Install AAAAT normally, load extension/ as an unpacked extension, replace __AAAT_EXTENSION_ID__ in the native host manifest, then install that manifest in the browser's documented native-messaging host directory. The companion carries bounded task commands only; credentials remain with the selected browser or external host.\n")
    return target
