from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from .agent_access import FORBIDDEN_AGENT_CONTEXT_KEYS

PROTOCOL_VERSION = "1"


class ProtocolValidationError(ValueError):
    pass


@dataclass(frozen=True)
class LlmTaskRequest:
    task_handle: str
    task_type: str
    purpose: str
    instructions: Mapping[str, Any]
    input_context: Mapping[str, Any]
    response_format: Mapping[str, Any]
    output_contract: Mapping[str, Any]
    privacy_notes: tuple[str, ...] = ()
    protocol_version: str = PROTOCOL_VERSION
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "protocol_version": self.protocol_version,
            "task_handle": self.task_handle,
            "task_type": self.task_type,
            "purpose": self.purpose,
            "instructions": dict(self.instructions),
            "input_context": dict(self.input_context),
            "response_format": dict(self.response_format),
            "output_contract": dict(self.output_contract),
            "privacy_notes": list(self.privacy_notes),
            "metadata": dict(self.metadata),
        }
        validate_llm_task_request(payload)
        return payload


@dataclass(frozen=True)
class LlmTaskResponse:
    task_handle: str
    result: Mapping[str, Any]
    provider: str
    model: str
    protocol_version: str = PROTOCOL_VERSION
    finish_reason: str = "completed"
    usage: Mapping[str, Any] = field(default_factory=dict)
    raw_provider_metadata: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "protocol_version": self.protocol_version,
            "task_handle": self.task_handle,
            "result": dict(self.result),
            "provider": self.provider,
            "model": self.model,
            "finish_reason": self.finish_reason,
            "usage": dict(self.usage),
            "raw_provider_metadata": dict(self.raw_provider_metadata),
        }
        validate_llm_task_response(payload)
        return payload


def request_from_agent_context(context: Mapping[str, Any]) -> LlmTaskRequest:
    task = context.get("task") or {}
    return LlmTaskRequest(
        task_handle=str(task.get("task_handle") or ""),
        task_type=str(task.get("task_type") or context.get("task_type") or "task"),
        purpose=str(context.get("purpose") or task.get("purpose") or "task"),
        instructions=context.get("instructions") or {},
        input_context=context.get("input_context") or {},
        response_format=context.get("response_format") or {},
        output_contract=context.get("output_contract") or {},
        privacy_notes=tuple(str(item) for item in (context.get("privacy_notes") or [])),
    )


def validate_llm_task_request(payload: Mapping[str, Any]) -> None:
    required = {
        "protocol_version",
        "task_handle",
        "task_type",
        "purpose",
        "instructions",
        "input_context",
        "response_format",
        "output_contract",
    }
    missing = required - payload.keys()
    if missing:
        raise ProtocolValidationError(f"Missing request fields: {sorted(missing)}")
    if payload.get("protocol_version") != PROTOCOL_VERSION:
        raise ProtocolValidationError("Unsupported LLM protocol version")
    handle = str(payload.get("task_handle") or "")
    if not handle.startswith("taskh_"):
        raise ProtocolValidationError("LLM requests require an opaque task handle")
    forbidden = _find_forbidden_keys(payload.get("input_context") or {})
    if forbidden:
        raise ProtocolValidationError(f"Forbidden context keys: {sorted(forbidden)}")


def validate_llm_task_response(
    payload: Mapping[str, Any],
    *,
    request: LlmTaskRequest | None = None,
) -> None:
    required = {"protocol_version", "task_handle", "result", "provider", "model"}
    missing = required - payload.keys()
    if missing:
        raise ProtocolValidationError(f"Missing response fields: {sorted(missing)}")
    if payload.get("protocol_version") != PROTOCOL_VERSION:
        raise ProtocolValidationError("Unsupported LLM protocol version")
    if request is not None and payload.get("task_handle") != request.task_handle:
        raise ProtocolValidationError("Response task handle does not match request")
    result = payload.get("result")
    if not isinstance(result, Mapping):
        raise ProtocolValidationError("LLM result must be a JSON object")
    forbidden = _find_forbidden_keys(result)
    if forbidden:
        raise ProtocolValidationError(f"Forbidden result keys: {sorted(forbidden)}")
    if request is not None:
        required_result = set(request.response_format.get("required") or [])
        missing_result = required_result - result.keys()
        if missing_result:
            raise ProtocolValidationError(f"Missing required result fields: {sorted(missing_result)}")


def _find_forbidden_keys(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, Mapping):
        for key, item in value.items():
            key_text = str(key)
            if key_text in FORBIDDEN_AGENT_CONTEXT_KEYS:
                found.add(key_text)
            found.update(_find_forbidden_keys(item))
    elif isinstance(value, (list, tuple)):
        for item in value:
            found.update(_find_forbidden_keys(item))
    return found
