from __future__ import annotations

import shutil
import subprocess
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
    standard_user: bool = False


_TIMEOUT_FIELD = {
    "key": "timeout_seconds",
    "label": "Timeout seconds",
    "help_text": "Maximum duration for one bounded task.",
    "required": False,
    "multiline": False,
}

_ADAPTERS = (
    LocalAgentAdapter(
        adapter_id="ollama_cli",
        title="Local AI with Ollama",
        description=(
            "Runs a configured local Ollama model as a child process. AAAAT sends one bounded task and validates one result; "
            "it does not use an Ollama HTTP API, expose a port, manage credentials, or host the model."
        ),
        fields=(
            {
                "key": "model",
                "label": "Model",
                "help_text": "Recommended standard-user model or an advanced override.",
                "required": False,
                "multiline": False,
            },
            {
                "key": "executable",
                "label": "Ollama executable",
                "help_text": "Usually ollama. Advanced users may select another path.",
                "required": False,
                "multiline": False,
            },
            {
                "key": "args",
                "label": "Additional arguments",
                "help_text": "Optional arguments placed after the model, one per line.",
                "required": False,
                "multiline": True,
            },
            _TIMEOUT_FIELD,
        ),
        automatic_execution=True,
        network_access="local-runtime-controlled",
        local_only=True,
        standard_user=True,
    ),
    LocalAgentAdapter(
        adapter_id="llama_cpp_cli",
        title="Local AI with llama.cpp",
        description=(
            "Runs llama-cli directly with a local GGUF model and a task-specific prompt file. AAAAT remains port-free and "
            "uses the same bounded result validation as every other integration."
        ),
        fields=(
            {
                "key": "model_path",
                "label": "GGUF model file",
                "help_text": "Path to the local model file used by llama-cli.",
                "required": True,
                "multiline": False,
            },
            {
                "key": "executable",
                "label": "llama-cli executable",
                "help_text": "Usually llama-cli. Advanced users may select another path.",
                "required": False,
                "multiline": False,
            },
            {
                "key": "args",
                "label": "Additional arguments",
                "help_text": "Optional llama-cli arguments, one per line.",
                "required": False,
                "multiline": True,
            },
            _TIMEOUT_FIELD,
        ),
        automatic_execution=True,
        network_access="none",
        local_only=True,
    ),
    LocalAgentAdapter(
        adapter_id="manual_external_agent",
        title="Portable task bundle",
        description=(
            "Groups bounded work for export and validates the returned result bundle. This is the compatibility floor for "
            "browser-only conversational LLMs, not the preferred automatic workflow."
        ),
    ),
    LocalAgentAdapter(
        adapter_id="file_exchange",
        title="File-capable external host",
        description=(
            "Writes one bounded request into a controlled exchange directory and reads a matching result. No provider SDK, "
            "credentials, listening port, or broad AAAAT API is required."
        ),
        fields=(
            {
                "key": "directory",
                "label": "Exchange directory",
                "help_text": "Controlled local directory shared with the user-owned host.",
                "required": True,
                "multiline": False,
            },
        ),
    ),
    LocalAgentAdapter(
        adapter_id="argv_custom_command",
        title="Existing connector command",
        description="Runs a user-owned executable without a shell; bounded context is stdin and one result is stdout.",
        fields=(
            {
                "key": "argv",
                "label": "Command arguments",
                "help_text": "One executable or argument per line.",
                "required": True,
                "multiline": True,
            },
            _TIMEOUT_FIELD,
        ),
        automatic_execution=True,
        advanced=True,
    ),
    LocalAgentAdapter(
        adapter_id="codex_cli",
        title="Codex CLI (advanced example)",
        description="Compatibility adapter for an already configured Codex CLI. It is not a v1 accessibility proof.",
        fields=(
            {
                "key": "executable",
                "label": "Codex executable",
                "help_text": "Usually codex.",
                "required": False,
                "multiline": False,
            },
            {
                "key": "args",
                "label": "Additional arguments",
                "help_text": "One argument per line.",
                "required": False,
                "multiline": True,
            },
            _TIMEOUT_FIELD,
        ),
        automatic_execution=True,
        advanced=True,
        research_capable=True,
    ),
)

ADAPTERS: Mapping[str, LocalAgentAdapter] = {item.adapter_id: item for item in _ADAPTERS}
DEFAULT_ADAPTER_ID = "manual_external_agent"
RECOMMENDED_LOCAL_ADAPTER_ID = "ollama_cli"
RECOMMENDED_OLLAMA_MODEL = "qwen3:8b"


def adapter_definition(adapter_id: str) -> LocalAgentAdapter:
    try:
        return ADAPTERS[adapter_id]
    except KeyError as exc:
        raise ValueError(f"Unknown local agent adapter: {adapter_id}") from exc


def visible_adapters(*, include_advanced: bool = False) -> tuple[LocalAgentAdapter, ...]:
    return tuple(item for item in _ADAPTERS if include_advanced or not item.advanced)


def adapter_can_run_automatically(adapter_id: str) -> bool:
    return adapter_definition(adapter_id).automatic_execution


def standard_local_settings(adapter_id: str) -> dict[str, Any]:
    if adapter_id == "ollama_cli":
        return {"model": RECOMMENDED_OLLAMA_MODEL, "executable": "ollama", "args": [], "timeout_seconds": 600}
    if adapter_id == "llama_cpp_cli":
        return {"model_path": "", "executable": "llama-cli", "args": [], "timeout_seconds": 600}
    return {}


def validate_adapter_settings(adapter_id: str, settings: Mapping[str, Any] | None) -> dict[str, Any]:
    adapter = adapter_definition(adapter_id)
    defaults = standard_local_settings(adapter_id)
    values = {**defaults, **dict(settings or {})}
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
    base = {
        "network_access": adapter.network_access,
        "research_capable": adapter.research_capable,
        "local_only": adapter.local_only,
    }
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

    if adapter_id == "argv_custom_command":
        executable = str((normalized.get("argv") or [""])[0])
        probe_argv: list[str] | None = None
    elif adapter_id == "ollama_cli":
        executable = str(normalized.get("executable") or "ollama")
        probe_argv = [executable, "--version"]
    elif adapter_id == "llama_cpp_cli":
        executable = str(normalized.get("executable") or "llama-cli")
        probe_argv = [executable, "--version"]
        model = Path(str(normalized["model_path"])).expanduser()
        if not model.is_file():
            return {"status": "error", "message": f"GGUF model file not found: {model}", **base}
    else:
        executable = str(normalized.get("executable") or "codex")
        probe_argv = [executable, "--version"]

    resolved = shutil.which(executable)
    if not resolved:
        return {"status": "error", "message": f"Executable not found: {executable}", **base}
    if probe_argv is not None:
        try:
            completed = subprocess.run(
                [resolved, *probe_argv[1:]],
                text=True,
                capture_output=True,
                check=False,
                timeout=min(int(normalized.get("timeout_seconds") or 15), 15),
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            return {"status": "error", "message": f"Health probe failed: {exc}", **base}
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout or f"exit {completed.returncode}").strip()
            return {"status": "error", "message": f"Health probe failed: {detail[:1000]}", **base}
        version = (completed.stdout or completed.stderr).strip()
    else:
        version = ""
    message = f"Executable verified: {resolved}"
    if version:
        message += f" ({version.splitlines()[0]})"
    if adapter_id == "ollama_cli":
        message += f"; configured model: {normalized['model']}"
    return {"status": "ready", "message": message, "executable": resolved, **base}
