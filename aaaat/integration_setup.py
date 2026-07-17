from __future__ import annotations

from pathlib import Path
from typing import Any

from .provider_adapters import (
    adapter_capabilities,
    adapter_definition,
    adapter_health,
    standard_local_settings,
    validate_adapter_settings,
    visible_adapters,
)
from .workspace_config import load_workspace_config, save_workspace_settings


_CONNECTION_MODES: tuple[dict[str, Any], ...] = (
    {
        "id": "guided_connector",
        "title": "Connect my AI",
        "description": "Your AI chooses the best connection it supports and helps with selected preparation work.",
        "automatic": True,
        "setup_complexity": "guided",
        "adapter_ids": (),
    },
    {
        "id": "manual",
        "title": "Use AAAAT without AI",
        "description": "Keep all work in the local desktop app.",
        "automatic": False,
        "setup_complexity": "guided",
        "adapter_ids": ("no_ai_connection",),
    },
    {
        "id": "advanced_integration",
        "title": "Advanced integration",
        "description": "Configure a controlled file exchange or a user-owned command explicitly.",
        "automatic": None,
        "setup_complexity": "advanced",
        "adapter_ids": ("manual_external_agent", "file_exchange", "argv_custom_command"),
    },
)


def connection_modes() -> list[dict[str, Any]]:
    return [{**mode, "adapter_ids": list(mode["adapter_ids"])} for mode in _CONNECTION_MODES]


def _capability_projection(capabilities: dict[str, Any]) -> dict[str, Any]:
    return {
        "automatic": bool(capabilities["automatic"]),
        "standard_user": capabilities["setup_complexity"] == "guided",
        "local_only": bool(capabilities["local_only"]),
        "network_access": str(capabilities["network_access"]),
        "research_capable": bool(capabilities["research"]),
    }


def disclosure_summary(capabilities: dict[str, Any]) -> dict[str, Any]:
    network_access = str(capabilities.get("network_access") or "host-controlled")
    if not capabilities.get("automatic"):
        route = "user-mediated"
    elif network_access in {"runtime-controlled", "host-controlled"}:
        route = "selected-host-controlled"
    else:
        route = network_access
    return {
        "route": route,
        "context_scope": "Only purpose-specific bounded task context is exchanged.",
        "identity_policy": "Purpose-dependent; identity may be omitted or redacted unless required by the task scope.",
        "credentials": str(capabilities.get("credential_ownership") or "external-host"),
        "research_available": bool(capabilities.get("research")),
        "automatic": bool(capabilities.get("automatic")),
        "transport_kind": str(capabilities.get("transport_kind") or "manual"),
    }


def integration_options(*, include_advanced: bool = False) -> list[dict[str, Any]]:
    options: list[dict[str, Any]] = []
    for adapter in visible_adapters(include_advanced=include_advanced):
        capabilities = adapter_capabilities(adapter.adapter_id)
        options.append({
            "id": adapter.adapter_id,
            "title": adapter.title,
            "description": adapter.description,
            "advanced": adapter.advanced,
            "fields": [dict(field) for field in adapter.fields],
            "recommended_settings": standard_local_settings(adapter.adapter_id),
            "capabilities": capabilities,
            "disclosure": disclosure_summary(capabilities),
            **_capability_projection(capabilities),
        })
    return options


def current_integration(storage_path: str | Path) -> dict[str, Any]:
    config = load_workspace_config(storage_path)
    selected = config["local_agent_adapter"]
    adapter_id = str(selected["id"])
    adapter = adapter_definition(adapter_id)
    capabilities = adapter_capabilities(adapter_id)
    return {
        "id": adapter_id,
        "title": adapter.title,
        "settings": dict(selected.get("settings") or {}),
        "capabilities": capabilities,
        "disclosure": disclosure_summary(capabilities),
        **_capability_projection(capabilities),
    }


def configure_integration(
    storage_path: str | Path,
    adapter_id: str,
    settings: dict[str, Any] | None = None,
    *,
    automatic_preparation: list[str] | None = None,
) -> dict[str, Any]:
    current = load_workspace_config(storage_path)
    normalized = validate_adapter_settings(adapter_id, settings)
    capabilities = adapter_capabilities(adapter_id)
    health = adapter_health(adapter_id, normalized)
    common = {
        "adapter_id": adapter_id,
        "settings": normalized,
        "capabilities": capabilities,
        "disclosure": disclosure_summary(capabilities),
        "health": health,
    }
    if health.get("status") != "ready":
        return {"status": "error", "saved": False, **common}
    save_workspace_settings(
        storage_path,
        automatic_preparation=list(automatic_preparation) if automatic_preparation is not None else list(current.get("automatic_preparation") or []),
        local_agent_adapter_id=adapter_id,
        local_agent_adapter_settings=normalized,
    )
    return {"status": "ready", "saved": True, **common}


def disable_automatic_integration(storage_path: str | Path) -> dict[str, Any]:
    current = load_workspace_config(storage_path)
    save_workspace_settings(
        storage_path,
        automatic_preparation=list(current.get("automatic_preparation") or []),
        local_agent_adapter_id="no_ai_connection",
        local_agent_adapter_settings={},
    )
    return current_integration(storage_path)
