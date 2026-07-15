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
    local_only: bool = False
    transport_kind: str = "manual"
    setup_complexity: str = "guided"
    disclosure: str = "user-approved-bounded-context"
    credential_ownership: str = "external-host"
    progress_capable: bool = False
    cancellation_capable: bool = False


_TIMEOUT_FIELD = {
    "key": "timeout_seconds",
    "label": "Timeout seconds",
    "help_text": "Maximum duration for one bounded task.",
    "required": False,
    "multiline": False,
}

_ADAPTERS = (
    LocalAgentAdapter(
        adapter_id="manual_external_agent",
        title="Portable task bundle",
        description="Groups bounded work for export and validates one returned result bundle.",
        transport_kind="portable_bundle",
        setup_complexity="guided",
    ),
    LocalAgentAdapter(
        adapter_id="file_exchange",
        title="File-capable external host",
        description="Uses a controlled exchange directory for bounded task and result files.",
        fields=(
            {
                "key": "directory",
                "label": "Exchange directory",
                "help_text": "Controlled local directory shared with the selected external host.",
                "required": True,
                "multiline": False,
            },
        ),
        advanced=True,
        transport_kind="file_exchange",
        setup_complexity="advanced",
    ),
    LocalAgentAdapter(
        adapter_id="argv_custom_command",
        title="User-owned command",
        description=(
            "Advanced option. Runs one user-owned executable without a shell, writes one bounded task to stdin, "
            "reads one bounded result from stdout, and treats stderr as diagnostics or structured progress."
        ),
        fields=(
            {
                "key": "argv",
                "label": "Command arguments",
                "help_text": "One executable or fixed argument per line.",
                "required": True,
                "multiline": True,
            },
            _TIMEOUT_FIELD,
        ),
        automatic_execution=True,
        advanced=True,
        transport_kind="stdio",
        setup_complexity="advanced",
        progress_capable=True,
    ),
)

ADAPTERS: Mapping[str, LocalAgentAdapter] = {item.adapter_id: item for item in _ADAPTERS}
DEFAULT_ADAPTER_ID = "manual_external_agent"


def adapter_definition(adapter_id: str) -> LocalAgentAdapter:
    try:
        return ADAPTERS[adapter_id]
    except KeyError as exc:
        raise ValueError(f"Unknown integration adapter: {adapter_id}") from exc


def adapter_capabilities(adapter_id: str) -> dict[str, Any]:
    adapter = adapter_definition(adapter_id)
    return {
        "automatic": adapter.automatic_execution,
        "transport_kind": adapter.transport_kind,
        "network_access": adapter.network_access,
        "local_only": adapter.local_only,
        "research": adapter.research_capable,
        "progress": adapter.progress_capable,
        "cancellation": adapter.cancellation_capable,
        "setup_complexity": adapter.setup_complexity,
        "disclosure": adapter.disclosure,
        "credential_ownership": adapter.credential_ownership,
    }


def visible_adapters(*, include_advanced: bool = False) -> tuple[LocalAgentAdapter, ...]:
    return tuple(item for item in _ADAPTERS if include_advanced or not item.advanced)


def adapter_can_run_automatically(adapter_id: str) -> bool:
    return bool(adapter_capabilities(adapter_id)["automatic"])


def standard_local_settings(_adapter_id: str) -> dict[str, Any]:
    return {}


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
    normalized = validate_adapter_settings(adapter_id, settings)
    base = adapter_capabilities(adapter_id)
    if adapter_id == "manual_external_agent":
        return {"status": "ready", "message": "Portable bounded task bundles are available.", **base}
    if adapter_id == "file_exchange":
        directory = Path(normalized["directory"]).expanduser()
        try:
            directory.mkdir(parents=True, exist_ok=True)
            probe = directory / ".aaaat-health"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink()
        except OSError as exc:
            return {"status": "error", "message": str(exc), **base}
        return {"status": "ready", "message": f"Exchange directory is writable: {directory}", **base}
    executable = str((normalized.get("argv") or [""])[0])
    resolved = shutil.which(executable)
    if not resolved:
        return {"status": "error", "message": f"Executable not found: {executable}", **base}
    return {"status": "ready", "message": f"Executable verified: {resolved}", "executable": resolved, **base}
