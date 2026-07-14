from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping


@dataclass(frozen=True)
class LocalAgentAdapter:
    adapter_id: str
    title: str
    description: str
    fields: tuple[dict[str, Any], ...] = ()
    automatic_execution: bool = False
    advanced: bool = False
    network_access: str = "host-controlled"
    research_capable: bool = False


_ADAPTERS = (
    LocalAgentAdapter(
        adapter_id="manual_external_agent",
        title="Manual external agent",
        description="Export a bounded packet to any LLM host and import its JSON result.",
    ),
    LocalAgentAdapter(
        adapter_id="codex_cli",
        title="Codex CLI",
        description="Runs the installed Codex CLI as a local subprocess using bounded JSON on stdin.",
        fields=(
            {"key": "executable", "label": "Codex executable", "help_text": "Usually codex.", "required": False, "multiline": False},
            {"key": "args", "label": "Additional arguments", "help_text": "One argument per line.", "required": False, "multiline": True},
            {"key": "timeout_seconds", "label": "Timeout seconds", "help_text": "Positive integer.", "required": False, "multiline": False},
        ),
        automatic_execution=True,
        research_capable=True,
    ),
    LocalAgentAdapter(
        adapter_id="file_exchange",
        title="File exchange",
        description="Writes one bounded request JSON file and reads a matching result JSON file. No host SDK or port is required.",
        fields=({"key": "directory", "label": "Exchange directory", "help_text": "Local directory shared with the host.", "required": True, "multiline": False},),
    ),
    LocalAgentAdapter(
        adapter_id="argv_custom_command",
        title="Custom argv command",
        description="Runs an executable without a shell; bounded context is stdin and one JSON result is stdout.",
        fields=(
            {"key": "argv", "label": "Command arguments", "help_text": "One executable or argument per line.", "required": True, "multiline": True},
            {"key": "timeout_seconds", "label": "Timeout seconds", "help_text": "Positive integer.", "required": False, "multiline": False},
        ),
        automatic_execution=True,
        advanced=True,
    ),
)
ADAPTERS: Mapping[str, LocalAgentAdapter] = {item.adapter_id: item for item in _ADAPTERS}
DEFAULT_ADAPTER_ID = "manual_external_agent"


def adapter_definition(adapter_id: str) -> LocalAgentAdapter:
    try:
        return ADAPTERS[adapter_id]
    except KeyError as exc:
        raise ValueError(f"Unknown local agent adapter: {adapter_id}") from exc


def visible_adapters(*, include_advanced: bool = False) -> tuple[LocalAgentAdapter, ...]:
    return tuple(item for item in _ADAPTERS if include_advanced or not item.advanced)


def adapter_can_run_automatically(adapter_id: str) -> bool:
    return adapter_definition(adapter_id).automatic_execution


def validate_adapter_settings(adapter_id: str, settings: Mapping[str, Any] | None) -> dict[str, Any]:
    adapter = adapter_definition(adapter_id)
    values = dict(settings or {})
    allowed = {str(field["key"]) for field in adapter.fields}
    unknown = set(values) - allowed
    if unknown:
        raise ValueError(f"Unsupported settings for {adapter.title}: {sorted(unknown)}")
    normalized: dict[str, Any] = {}
    for field in adapter.fields:
        key, label = str(field["key"]), str(field["label"])
        multiline, required = bool(field.get("multiline")), bool(field.get("required"))
        value = values.get(key, [] if multiline else "")
        if multiline:
            if isinstance(value, str):
                value = [line.strip() for line in value.splitlines() if line.strip()]
            if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
                raise ValueError(f"{label} must contain non-empty lines")
            normalized[key] = [item.strip() for item in value]
            present = bool(normalized[key])
        elif key == "timeout_seconds":
            normalized[key] = 60 if value in (None, "") else int(value)
            if normalized[key] <= 0:
                raise ValueError("Timeout seconds must be positive")
            present = True
        else:
            normalized[key] = str(value or "").strip()
            present = bool(normalized[key])
        if required and not present:
            raise ValueError(f"{label} is required for {adapter.title}")
    return normalized


def adapter_health(adapter_id: str, settings: Mapping[str, Any] | None = None) -> dict[str, Any]:
    adapter = adapter_definition(adapter_id)
    normalized = validate_adapter_settings(adapter_id, settings)
    if adapter_id == "manual_external_agent":
        return {"status": "ready", "message": "Manual packet export/import is available.", "network_access": adapter.network_access}
    if adapter_id == "file_exchange":
        directory = Path(normalized["directory"]).expanduser()
        try:
            directory.mkdir(parents=True, exist_ok=True)
            probe = directory / ".aaaat-health"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink()
        except OSError as exc:
            return {"status": "error", "message": str(exc), "network_access": adapter.network_access}
        return {"status": "ready", "message": f"Exchange directory is writable: {directory}", "network_access": adapter.network_access}
    executable = normalized.get("executable") or ((normalized.get("argv") or [""])[0] if adapter_id == "argv_custom_command" else "codex")
    resolved = shutil.which(str(executable))
    if not resolved:
        return {"status": "error", "message": f"Executable not found: {executable}", "network_access": adapter.network_access}
    return {"status": "ready", "message": f"Executable found: {resolved}", "network_access": adapter.network_access, "research_capable": adapter.research_capable}
