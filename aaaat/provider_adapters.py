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
class ProviderAdapter:
    adapter_id: str
    title: str
    description: str
    fields: tuple[AdapterField, ...] = ()
    advanced: bool = False
    automatic_execution: bool = True


_ADAPTERS = (
    ProviderAdapter(
        adapter_id="external_agent",
        title="Use my external agent",
        description=(
            "AAAAT creates bounded preparation tasks and keeps them ready for your preferred agent. "
            "Nothing is sent automatically and no provider account is required."
        ),
        automatic_execution=False,
    ),
    ProviderAdapter(
        adapter_id="custom_command",
        title="Custom command",
        description=(
            "Advanced integration for a local script or CLI that accepts one bounded task packet on standard input "
            "and returns one JSON result on standard output."
        ),
        fields=(
            AdapterField(
                key="command",
                label="Command and arguments",
                help_text="Enter one executable or argument per line.",
                required=True,
                multiline=True,
            ),
        ),
        advanced=True,
    ),
)

ADAPTERS: Mapping[str, ProviderAdapter] = {adapter.adapter_id: adapter for adapter in _ADAPTERS}
DEFAULT_ADAPTER_ID = "external_agent"


def adapter_definition(adapter_id: str) -> ProviderAdapter:
    try:
        return ADAPTERS[adapter_id]
    except KeyError as exc:
        raise ValueError(f"Unknown provider adapter: {adapter_id}") from exc


def visible_adapters(*, include_advanced: bool = False) -> tuple[ProviderAdapter, ...]:
    return tuple(adapter for adapter in _ADAPTERS if include_advanced or not adapter.advanced)


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
        else:
            normalized[field.key] = str(value or "").strip()
            present = bool(normalized[field.key])
        if field.required and not present:
            raise ValueError(f"{field.label} is required for {adapter.title}")
    return normalized


def adapter_can_run_automatically(adapter_id: str) -> bool:
    return adapter_definition(adapter_id).automatic_execution
