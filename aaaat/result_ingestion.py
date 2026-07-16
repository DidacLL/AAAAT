from __future__ import annotations

import json
import sqlite3
from typing import Any, Mapping

from .agent_access import TASK_CAPABILITY_PREFIX, submit_agent_task_result

_FORBIDDEN_AUTHORITY_KEYS = {
    "application_id",
    "candidature_id",
    "profile_id",
    "artifact_id",
    "database_path",
    "storage_path",
    "file_path",
}
_AGENT_CONTROL_KEYS = {"replace_existing", "replace"}


def ingest_task_result(
    conn: sqlite3.Connection,
    task_capability: str,
    result: str | Mapping[str, Any],
    *,
    provenance: Mapping[str, Any] | None = None,
    default_agent_name: str = "",
    default_agent_runtime: str = "",
) -> dict[str, Any]:
    """Validate one transport-neutral result and apply it through AAAAT.

    External results provide task content only. Local replacement authority is
    deliberately removed before domain application so an LLM cannot overwrite
    an existing desktop value by adding a control flag to its result.
    """
    capability = str(task_capability or "").strip()
    if not capability.startswith(TASK_CAPABILITY_PREFIX):
        raise ValueError("Result has an invalid task capability")

    body = _strip_agent_control_keys(_result_object(result))
    forbidden = sorted(_find_forbidden_keys(body))
    if forbidden:
        raise ValueError(f"Result contains forbidden authority field(s): {', '.join(forbidden)}")

    source = dict(provenance or {})
    agent_name = str(source.get("agent_name") or default_agent_name)[:500]
    agent_runtime = str(source.get("agent_runtime") or default_agent_runtime)[:500]
    model_provider = str(source.get("model_provider") or "")[:500]

    completed = submit_agent_task_result(
        conn,
        capability,
        json.dumps(body, ensure_ascii=False),
        agent_name=agent_name,
        agent_runtime=agent_runtime,
        model_provider=model_provider,
    )
    return {
        "status": "accepted",
        "state": str(completed.get("state") or "completed"),
        "next": ["review_in_aaaat"],
    }


def _result_object(result: str | Mapping[str, Any]) -> dict[str, Any]:
    if isinstance(result, str):
        try:
            value = json.loads(result)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Result must be valid JSON: {exc.msg}") from exc
    else:
        value = dict(result)
    if not isinstance(value, dict):
        raise ValueError("Result must be one JSON object")
    return value


def _strip_agent_control_keys(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): _strip_agent_control_keys(item)
            for key, item in value.items()
            if str(key) not in _AGENT_CONTROL_KEYS
        }
    if isinstance(value, list):
        return [_strip_agent_control_keys(item) for item in value]
    return value


def _find_forbidden_keys(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        for key, item in value.items():
            normalized = str(key)
            if normalized in _FORBIDDEN_AUTHORITY_KEYS:
                found.add(normalized)
            found.update(_find_forbidden_keys(item))
    elif isinstance(value, list):
        for item in value:
            found.update(_find_forbidden_keys(item))
    return found
