from __future__ import annotations

from pathlib import Path
from typing import Any

from .provider_adapters import (
    RECOMMENDED_LOCAL_ADAPTER_ID,
    adapter_definition,
    adapter_health,
    standard_local_settings,
    validate_adapter_settings,
    visible_adapters,
)
from .workspace_config import load_workspace_config, save_workspace_settings


def integration_options(*, include_advanced: bool = False) -> list[dict[str, Any]]:
    """Return presentation-neutral integration choices for Welcome/User."""

    options: list[dict[str, Any]] = []
    for adapter in visible_adapters(include_advanced=include_advanced):
        options.append(
            {
                "id": adapter.adapter_id,
                "title": adapter.title,
                "description": adapter.description,
                "automatic": adapter.automatic_execution,
                "advanced": adapter.advanced,
                "standard_user": adapter.standard_user,
                "local_only": adapter.local_only,
                "network_access": adapter.network_access,
                "research_capable": adapter.research_capable,
                "fields": [dict(field) for field in adapter.fields],
                "recommended_settings": standard_local_settings(adapter.adapter_id),
            }
        )
    return options


def current_integration(storage_path: str | Path) -> dict[str, Any]:
    config = load_workspace_config(storage_path)
    selected = config["local_agent_adapter"]
    adapter_id = str(selected["id"])
    adapter = adapter_definition(adapter_id)
    return {
        "id": adapter_id,
        "title": adapter.title,
        "settings": dict(selected.get("settings") or {}),
        "automatic": adapter.automatic_execution,
        "standard_user": adapter.standard_user,
        "local_only": adapter.local_only,
        "network_access": adapter.network_access,
        "research_capable": adapter.research_capable,
    }


def configure_integration(
    storage_path: str | Path,
    adapter_id: str,
    settings: dict[str, Any] | None = None,
    *,
    automatic_preparation: list[str] | None = None,
) -> dict[str, Any]:
    """Validate, health-check and persist one explicitly selected integration."""

    current = load_workspace_config(storage_path)
    normalized = validate_adapter_settings(adapter_id, settings)
    health = adapter_health(adapter_id, normalized)
    if health.get("status") != "ready":
        return {
            "status": "error",
            "saved": False,
            "adapter_id": adapter_id,
            "settings": normalized,
            "health": health,
        }
    save_workspace_settings(
        storage_path,
        automatic_preparation=(
            list(automatic_preparation)
            if automatic_preparation is not None
            else list(current.get("automatic_preparation") or [])
        ),
        local_agent_adapter_id=adapter_id,
        local_agent_adapter_settings=normalized,
    )
    return {
        "status": "ready",
        "saved": True,
        "adapter_id": adapter_id,
        "settings": normalized,
        "health": health,
    }


def configure_recommended_local_integration(storage_path: str | Path) -> dict[str, Any]:
    """Run the standard-user local setup without requiring advanced choices."""

    return configure_integration(
        storage_path,
        RECOMMENDED_LOCAL_ADAPTER_ID,
        standard_local_settings(RECOMMENDED_LOCAL_ADAPTER_ID),
    )


def disable_automatic_integration(storage_path: str | Path) -> dict[str, Any]:
    """Return to the portable/manual path while preserving automatic task choices."""

    current = load_workspace_config(storage_path)
    save_workspace_settings(
        storage_path,
        automatic_preparation=list(current.get("automatic_preparation") or []),
        local_agent_adapter_id="manual_external_agent",
        local_agent_adapter_settings={},
    )
    return current_integration(storage_path)
