from __future__ import annotations

from pathlib import Path
from typing import Any

from .provider_adapters import (
    RECOMMENDED_LOCAL_ADAPTER_ID,
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
        "id": "manual",
        "title": "Continue manually",
        "description": "Use AAAAT without an automatic AI connection. Portable task bundles remain available when needed.",
        "automatic": False,
        "setup_complexity": "guided",
        "adapter_ids": ("manual_external_agent",),
    },
    {
        "id": "automatic",
        "title": "Connect my AI",
        "description": "Use an existing compatible AI automatically through a bounded connection selected during setup.",
        "automatic": True,
        "setup_complexity": "guided",
        "adapter_ids": ("llama_cpp_server", "argv_custom_command", "ollama_cli", "codex_cli"),
    },
    {
        "id": "browser_or_files",
        "title": "Use a browser or chat AI",
        "description": "Exchange one bounded task bundle and one result bundle, or use a supported browser companion.",
        "automatic": False,
        "setup_complexity": "guided",
        "adapter_ids": ("manual_external_agent", "file_exchange"),
    },
    {
        "id": "advanced",
        "title": "Advanced integration",
        "description": "Configure a command, endpoint, exchange directory, or generated connector explicitly.",
        "automatic": None,
        "setup_complexity": "advanced",
        "adapter_ids": tuple(item.adapter_id for item in visible_adapters(include_advanced=True)),
    },
)


def connection_modes() -> list[dict[str, Any]]:
    return [
        {
            **mode,
            "adapter_ids": list(mode["adapter_ids"]),
        }
        for mode in _CONNECTION_MODES
    ]


def integration_options(*, include_advanced: bool = False) -> list[dict[str, Any]]:
    """Return presentation-neutral adapter choices for advanced setup."""

    options: list[dict[str, Any]] = []
    for adapter in visible_adapters(include_advanced=include_advanced):
        options.append(
            {
                "id": adapter.adapter_id,
                "title": adapter.title,
                "description": adapter.description,
                "advanced": adapter.advanced,
                "fields": [dict(field) for field in adapter.fields],
                "recommended_settings": standard_local_settings(adapter.adapter_id),
                "capabilities": adapter_capabilities(adapter.adapter_id),
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
        "capabilities": adapter_capabilities(adapter_id),
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
            "capabilities": adapter_capabilities(adapter_id),
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
        "capabilities": adapter_capabilities(adapter_id),
        "health": health,
    }


def configure_recommended_local_integration(storage_path: str | Path) -> dict[str, Any]:
    """Compatibility helper for the existing guided local setup."""

    return configure_integration(
        storage_path,
        RECOMMENDED_LOCAL_ADAPTER_ID,
        standard_local_settings(RECOMMENDED_LOCAL_ADAPTER_ID),
    )


def disable_automatic_integration(storage_path: str | Path) -> dict[str, Any]:
    """Return to manual operation while preserving automatic task choices."""

    current = load_workspace_config(storage_path)
    save_workspace_settings(
        storage_path,
        automatic_preparation=list(current.get("automatic_preparation") or []),
        local_agent_adapter_id="manual_external_agent",
        local_agent_adapter_settings={},
    )
    return current_integration(storage_path)
