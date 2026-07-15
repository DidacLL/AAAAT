from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol

from .provider_adapters import validate_adapter_settings


class StdioRunner(Protocol):
    def __call__(
        self,
        argv: list[str],
        input_body: str | None,
        timeout: int,
        *,
        validate_result: bool = True,
    ) -> str: ...


@dataclass(frozen=True)
class TransportExecution:
    body: str
    provenance: dict[str, str]


def execute_configured_transport(
    adapter_id: str,
    settings: dict[str, Any],
    context: dict[str, Any],
    *,
    run_stdio: StdioRunner,
) -> TransportExecution:
    """Execute the explicit Advanced user-owned command against one bounded task."""
    if adapter_id != "argv_custom_command":
        raise ValueError(f"Configured adapter '{adapter_id}' is not executable")
    normalized = validate_adapter_settings(adapter_id, settings)
    argv = list(normalized.get("argv") or [])
    if not argv:
        raise ValueError("User-owned command is not configured")
    body = run_stdio(
        argv,
        json.dumps(context, ensure_ascii=False),
        int(normalized.get("timeout_seconds") or 60),
    )
    return TransportExecution(
        body=body,
        provenance={"agent_runtime": "user-owned-command"},
    )
