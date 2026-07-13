from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class AdapterField:
    key: str
    label: str
    help_text: str
    required: bool = False
    multiline: bool = False


@dataclass(frozen=True)
class LocalAgentAdapter:
    adapter_id: str
    title: str
    description: str
    fields: tuple[AdapterField, ...] = ()
    automatic_execution: bool = False
    advanced: bool = False


_ADAPTERS = (
    LocalAgentAdapter(
        adapter_id="manual_external_agent",
        title="Manual external agent",
        description=(
            "AAAAT writes bounded task packets and keeps results reviewable locally. "
            "Copy the packet into whichever LLM app you use; paste the JSON result back into AAAAT."
        ),
    ),
    LocalAgentAdapter(
        adapter_id="codex_cli_guided",
        title="Guided Codex CLI",
        description=(
            "Guided local workflow for Codex CLI. AAAAT prepares task packets but does not assume a provider, "
            "account, model, API key, or stable command contract."
        ),
    ),
    LocalAgentAdapter(
        adapter_id="claude_code_guided",
        title="Guided Claude Code",
        description=(
            "Guided local workflow for Claude Code. AAAAT prepares bounded task packets for user-directed execution."
        ),
    ),
    LocalAgentAdapter(
        adapter_id="gemini_cli_guided",
        title="Guided Gemini CLI",
        description=(
            "Guided local workflow for Gemini CLI. AAAAT prepares bounded task packets for user-directed execution."
        ),
    ),
    LocalAgentAdapter(
        adapter_id="argv_custom_command",
        title="Custom argv command",
        description=(
            "Advanced local adapter. AAAAT runs the configured executable with the bounded task context on stdin "
            "and expects one JSON result on stdout."
        ),
        fields=(
            AdapterField(
                key="argv",
                label="Command arguments",
                help_text="One executable or argument per line. No shell expansion is used.",
                required=True,
                multiline=True,
            ),
            AdapterField(
                key="timeout_seconds",
                label="Timeout seconds",
                help_text="Positive integer timeout for one task run.",
            ),
        ),
        automatic_execution=True,
        advanced=True,
    ),
)

ADAPTERS: Mapping[str, LocalAgentAdapter] = {adapter.adapter_id: adapter for adapter in _ADAPTERS}
DEFAULT_ADAPTER_ID = "manual_external_agent"


def adapter_definition(adapter_id: str) -> LocalAgentAdapter:
    try:
        return ADAPTERS[adapter_id]
    except KeyError as exc:
        raise ValueError(f"Unknown local agent adapter: {adapter_id}") from exc


def visible_adapters(*, include_advanced: bool = False) -> tuple[LocalAgentAdapter, ...]:
    return tuple(adapter for adapter in _ADAPTERS if include_advanced or not adapter.advanced)


def adapter_can_run_automatically(adapter_id: str) -> bool:
    return adapter_definition(adapter_id).automatic_execution


def validate_adapter_settings(adapter_id: str, settings: Mapping[str, Any] | None) -> dict[str, Any]:
    adapter = adapter_definition(adapter_id)
    values = dict(settings or {})
    allowed = {field.key for field in adapter.fields}
    unknown = set(values) - allowed
    if unknown:
        raise ValueError(f"Unsupported settings for {adapter.title}: {sorted(unknown)}")

    normalized: dict[str, Any] = {}
    for field in adapter.fields:
        value = values.get(field.key, [] if field.multiline else "")
        if field.multiline:
            if isinstance(value, str):
                value = [line.strip() for line in value.splitlines() if line.strip()]
            if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
                raise ValueError(f"{field.label} must contain non-empty lines")
            normalized[field.key] = [item.strip() for item in value]
            present = bool(normalized[field.key])
        elif field.key == "timeout_seconds":
            if value in (None, ""):
                normalized[field.key] = 60
            else:
                timeout = int(value)
                if timeout <= 0:
                    raise ValueError("Timeout seconds must be positive")
                normalized[field.key] = timeout
            present = True
        else:
            normalized[field.key] = str(value or "").strip()
            present = bool(normalized[field.key])
        if field.required and not present:
            raise ValueError(f"{field.label} is required for {adapter.title}")
    return normalized
