from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .agent_access import build_agent_task_context, submit_agent_task_result
from .db import connect
from .llm_engine import LlmConversationEngine, LlmExecution
from .llm_openai_compatible import OpenAiCompatibleConfig, OpenAiCompatibleProvider


@dataclass(frozen=True)
class LlmRuntimeConfig:
    provider: str
    model: str
    base_url: str
    api_key: str = ""
    timeout_seconds: float = 60.0

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> "LlmRuntimeConfig":
        env = environ or os.environ
        provider = str(env.get("AAAAT_LLM_PROVIDER") or "openai-compatible").strip()
        model = str(env.get("AAAAT_LLM_MODEL") or "").strip()
        base_url = str(env.get("AAAAT_LLM_BASE_URL") or "").strip()
        api_key = str(env.get("AAAAT_LLM_API_KEY") or "").strip()
        timeout_text = str(env.get("AAAAT_LLM_TIMEOUT_SECONDS") or "60").strip()
        if not model:
            raise ValueError("AAAAT_LLM_MODEL is required")
        if not base_url:
            raise ValueError("AAAAT_LLM_BASE_URL is required")
        try:
            timeout_seconds = float(timeout_text)
        except ValueError as exc:
            raise ValueError("AAAAT_LLM_TIMEOUT_SECONDS must be numeric") from exc
        if timeout_seconds <= 0:
            raise ValueError("AAAAT_LLM_TIMEOUT_SECONDS must be positive")
        return cls(
            provider=provider,
            model=model,
            base_url=base_url,
            api_key=api_key,
            timeout_seconds=timeout_seconds,
        )


def provider_from_config(config: LlmRuntimeConfig):
    if config.provider != "openai-compatible":
        raise ValueError(f"Unsupported LLM provider adapter: {config.provider}")
    return OpenAiCompatibleProvider(
        OpenAiCompatibleConfig(
            base_url=config.base_url,
            model=config.model,
            api_key=config.api_key,
            timeout_seconds=config.timeout_seconds,
        )
    )


def execute_task_with_provider(
    storage_path: str | Path,
    task_handle: str,
    *,
    config: LlmRuntimeConfig,
) -> dict[str, Any]:
    provider = provider_from_config(config)
    engine = LlmConversationEngine(provider)
    with connect(storage_path) as conn:
        context = build_agent_task_context(conn, task_handle)
    execution = engine.execute_agent_context(context, model=config.model)
    return _submit_execution(storage_path, execution)


def _submit_execution(storage_path: str | Path, execution: LlmExecution) -> dict[str, Any]:
    response = execution.response
    result_body = json.dumps(response.result, ensure_ascii=False, indent=2, sort_keys=True)
    with connect(storage_path) as conn:
        task = submit_agent_task_result(
            conn,
            response.task_handle,
            result_body,
            result_title=f"LLM result via {response.provider}",
            agent_name=response.provider,
            agent_runtime="aaaat.llm_runtime",
            model_provider=f"{response.provider}:{response.model}",
        )
    return {
        "task": task,
        "request": execution.request.to_dict(),
        "response": response.to_dict(),
        "estimated_cost": dict(execution.estimated_cost),
    }
