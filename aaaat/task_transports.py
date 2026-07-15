from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable

from .llama_cpp_http import chat_completion, task_response_json_schema
from .local_cli_runtime import build_local_cli_invocation
from .local_model_protocol import build_local_model_prompt, extract_json_object
from .provider_adapters import validate_adapter_settings

StdioRunner = Callable[[list[str], str | None, int], str]


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
    """Execute one bounded task through a configured transport adapter.

    This module owns transport-specific dispatch. The task runner remains
    responsible for task state, bounded context, canonical result submission,
    domain application, progress persistence and cancellation checks.
    """

    normalized = validate_adapter_settings(adapter_id, settings)
    timeout = int(normalized.get("timeout_seconds") or 60)
    prompt = build_local_model_prompt(context)

    if adapter_id == "llama_cpp_server":
        body, provenance = chat_completion(
            normalized["endpoint"],
            normalized.get("model") or "local",
            prompt,
            task_response_json_schema(context),
            timeout,
        )
        return TransportExecution(body=body, provenance=provenance)

    if adapter_id == "ollama_cli":
        with build_local_cli_invocation(adapter_id, normalized, prompt) as invocation:
            output = run_stdio(list(invocation.argv), invocation.input_body, timeout, validate_result=False)
            return TransportExecution(
                body=extract_json_object(output),
                provenance=dict(invocation.provenance),
            )

    if adapter_id == "codex_cli":
        argv = [
            str(normalized.get("executable") or "codex"),
            *list(normalized.get("args") or []),
        ]
        body = run_stdio(argv, json.dumps(context, ensure_ascii=False), timeout)
        return TransportExecution(
            body=body,
            provenance={
                "agent_runtime": "codex-cli",
                "model_provider": "host-reported",
            },
        )

    if adapter_id == "argv_custom_command":
        argv = list(normalized.get("argv") or [])
        if not argv:
            raise ValueError("Local command adapter is not configured")
        body = run_stdio(argv, json.dumps(context, ensure_ascii=False), timeout)
        return TransportExecution(
            body=body,
            provenance={"agent_runtime": "user-owned-command"},
        )

    raise ValueError(f"Configured adapter '{adapter_id}' is not executable")
