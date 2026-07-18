from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Mapping

from .workspace_config import load_workspace_config, save_workspace_settings

_NO_AI = "no_ai_connection"
_PORTABLE = "portable_bundle"
_FILE_EXCHANGE = "file_exchange"
_USER_COMMAND = "user_command"

def _method(method_id: str) -> dict[str, Any]:
    definitions = {
        _NO_AI: {
            "id": _NO_AI,
            "title": "Not connected",
            "description": "AAAAT remains fully usable locally.",
            "advanced": False,
            "automatic": False,
            "fields": [],
        },
        _PORTABLE: {
            "id": _PORTABLE,
            "title": "Portable task bundle",
            "description": "Export bounded work and import one validated result bundle.",
            "advanced": True,
            "automatic": False,
            "fields": [],
        },
        _FILE_EXCHANGE: {
            "id": _FILE_EXCHANGE,
            "title": "Controlled file exchange",
            "description": "Use a user-selected directory for bounded task and result files.",
            "advanced": True,
            "automatic": False,
            "fields": [
                {
                    "key": "directory",
                    "label": "Exchange directory",
                    "help_text": "Controlled local directory shared with the selected AI host.",
                    "required": True,
                    "multiline": False,
                }
            ],
        },
        _USER_COMMAND: {
            "id": _USER_COMMAND,
            "title": "User-owned command",
            "description": "Run one explicit executable without a shell, passing one bounded task on stdin and reading one result on stdout.",
            "advanced": True,
            "automatic": True,
            "fields": [
                {
                    "key": "argv",
                    "label": "Command arguments",
                    "help_text": "One executable or fixed argument per line.",
                    "required": True,
                    "multiline": True,
                },
                {
                    "key": "timeout_seconds",
                    "label": "Timeout seconds",
                    "help_text": "Maximum duration for one bounded task.",
                    "required": False,
                    "multiline": False,
                },
            ],
        },
    }
    try:
        return dict(definitions[method_id])
    except KeyError as exc:
        raise ValueError(f"Unknown integration method: {method_id}") from exc


def validate_integration_settings(method_id: str, settings: Mapping[str, Any] | None) -> dict[str, Any]:
    method = _method(method_id)
    values = dict(settings or {})
    allowed = {str(field["key"]) for field in method["fields"]}
    unknown = set(values) - allowed
    if unknown:
        raise ValueError(f"Unsupported settings for {method['title']}: {sorted(unknown)}")
    normalized: dict[str, Any] = {}
    for field in method["fields"]:
        key = str(field["key"])
        value = values.get(key, [] if field.get("multiline") else "")
        if field.get("multiline"):
            if isinstance(value, str):
                value = [line.strip() for line in value.splitlines() if line.strip()]
            if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
                raise ValueError(f"{field['label']} must contain non-empty lines")
            normalized[key] = [item.strip() for item in value]
        elif key == "timeout_seconds":
            timeout = 60 if value in (None, "") else int(value)
            if timeout <= 0:
                raise ValueError("Timeout seconds must be positive")
            normalized[key] = timeout
        else:
            normalized[key] = str(value or "").strip()
        if field.get("required") and not normalized.get(key):
            raise ValueError(f"{field['label']} is required for {method['title']}")
    return normalized


def integration_health(method_id: str, settings: Mapping[str, Any] | None = None) -> dict[str, Any]:
    normalized = validate_integration_settings(method_id, settings)
    if method_id == _NO_AI:
        return {"status": "ready", "message": "AAAAT is ready to use locally."}
    if method_id == _PORTABLE:
        return {"status": "ready", "message": "Portable bounded task bundles are available."}
    if method_id == _FILE_EXCHANGE:
        directory = Path(normalized["directory"]).expanduser()
        try:
            directory.mkdir(parents=True, exist_ok=True)
            probe = directory / ".aaaat-write-check"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink()
        except OSError as exc:
            return {"status": "error", "message": str(exc)}
        return {"status": "ready", "message": f"Exchange directory is writable: {directory}"}
    executable = str((normalized.get("argv") or [""])[0])
    resolved = shutil.which(executable)
    if not resolved:
        return {"status": "error", "message": f"Executable not found: {executable}"}
    return {"status": "ready", "message": f"Executable verified: {resolved}", "executable": resolved}


def integration_options(*, include_advanced: bool = False) -> list[dict[str, Any]]:
    result = []
    for method_id in (_NO_AI, _PORTABLE, _FILE_EXCHANGE, _USER_COMMAND):
        method = _method(method_id)
        if method["advanced"] and not include_advanced:
            continue
        method["recommended_settings"] = {}
        result.append(method)
    return result


def current_integration(storage_path: str | Path) -> dict[str, Any]:
    selected = load_workspace_config(storage_path)["integration"]
    method = _method(str(selected["id"]))
    settings = dict(selected.get("settings") or {})
    return {
        **method,
        "settings": settings,
        "health": integration_health(method["id"], settings),
    }


def configure_integration(
    storage_path: str | Path,
    method_id: str,
    settings: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized = validate_integration_settings(method_id, settings)
    health = integration_health(method_id, normalized)
    common = {"method_id": method_id, "settings": normalized, "health": health}
    if health.get("status") != "ready":
        return {"status": "error", "saved": False, **common}
    save_workspace_settings(storage_path, integration_method_id=method_id, integration_settings=normalized)
    return {"status": "ready", "saved": True, **common}


def disconnect_integration(storage_path: str | Path) -> dict[str, Any]:
    save_workspace_settings(storage_path, integration_method_id=_NO_AI, integration_settings={})
    return current_integration(storage_path)
