from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from .agent_access import FORBIDDEN_AGENT_CONTEXT_KEYS

HOST_PROTOCOL_VERSION = "1"


class HostProtocolValidationError(ValueError):
    pass


@dataclass(frozen=True)
class HostTaskPacket:
    """Provider-neutral bounded work packet for an external reasoning host.

    AAAAT creates and validates this packet. The external host decides whether,
    where, and how inference is performed. AAAAT has no provider credentials,
    model configuration, network transport, or inference runtime.
    """

    task_handle: str
    task_type: str
    purpose: str
    instructions: Mapping[str, Any]
    input_context: Mapping[str, Any]
    response_format: Mapping[str, Any]
    output_contract: Mapping[str, Any]
    allowed_actions: tuple[str, ...]
    privacy_notes: tuple[str, ...]
    protocol_version: str = HOST_PROTOCOL_VERSION
    provenance_request: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        packet = {
            "protocol_version": self.protocol_version,
            "task_handle": self.task_handle,
            "task_type": self.task_type,
            "purpose": self.purpose,
            "instructions": dict(self.instructions),
            "input_context": dict(self.input_context),
            "response_format": dict(self.response_format),
            "output_contract": dict(self.output_contract),
            "allowed_actions": list(self.allowed_actions),
            "privacy_notes": list(self.privacy_notes),
            "provenance_request": dict(self.provenance_request),
        }
        validate_host_task_packet(packet)
        return packet


@dataclass(frozen=True)
class HostTaskResult:
    """Structured result returned by an external agent or host environment."""

    task_handle: str
    result: Mapping[str, Any]
    source_type: str = "external_adapter"
    agent_name: str = ""
    agent_runtime: str = ""
    model_provider: str = ""
    model_id: str = ""
    host_environment: str = ""
    internet_access_used: bool | None = None
    protocol_version: str = HOST_PROTOCOL_VERSION

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "protocol_version": self.protocol_version,
            "task_handle": self.task_handle,
            "result": dict(self.result),
            "provenance": {
                "source_type": self.source_type,
                "agent_name": self.agent_name,
                "agent_runtime": self.agent_runtime,
                "model_provider": self.model_provider,
                "model_id": self.model_id,
                "host_environment": self.host_environment,
                "internet_access_used": self.internet_access_used,
            },
        }
        validate_host_task_result(payload)
        return payload


def packet_from_agent_context(context: Mapping[str, Any]) -> HostTaskPacket:
    task = context.get("task") or {}
    privacy_notes = context.get("privacy_notes") or (context.get("privacy") or {}).get("notes") or []
    return HostTaskPacket(
        task_handle=str(task.get("task_handle") or ""),
        task_type=str(task.get("task_type") or "task"),
        purpose=str(context.get("purpose") or task.get("purpose") or "task"),
        instructions=context.get("instructions") or {},
        input_context=context.get("input_context") or context.get("context") or {},
        response_format=context.get("response_format") or {},
        output_contract=context.get("output_contract") or {},
        allowed_actions=tuple(str(item) for item in (context.get("allowed_actions") or task.get("allowed_actions") or [])),
        privacy_notes=tuple(str(item) for item in privacy_notes),
        provenance_request={
            "optional_fields": [
                "agent_name",
                "agent_runtime",
                "model_provider",
                "model_id",
                "host_environment",
                "internet_access_used",
            ]
        },
    )


def validate_host_task_packet(packet: Mapping[str, Any]) -> None:
    required = {
        "protocol_version",
        "task_handle",
        "task_type",
        "purpose",
        "instructions",
        "input_context",
        "response_format",
        "output_contract",
        "allowed_actions",
        "privacy_notes",
    }
    missing = required - packet.keys()
    if missing:
        raise HostProtocolValidationError(f"Missing host task fields: {sorted(missing)}")
    if packet.get("protocol_version") != HOST_PROTOCOL_VERSION:
        raise HostProtocolValidationError("Unsupported host protocol version")
    if not str(packet.get("task_handle") or "").startswith("taskh_"):
        raise HostProtocolValidationError("Host task packet requires an opaque task handle")
    forbidden = _find_forbidden_keys(packet.get("input_context") or {})
    if forbidden:
        raise HostProtocolValidationError(f"Forbidden context keys: {sorted(forbidden)}")
    actions = set(packet.get("allowed_actions") or [])
    if not actions.issubset({"context", "submit"}):
        raise HostProtocolValidationError(f"Unsupported host actions: {sorted(actions)}")


def validate_host_task_result(
    payload: Mapping[str, Any],
    *,
    packet: HostTaskPacket | None = None,
) -> None:
    required = {"protocol_version", "task_handle", "result", "provenance"}
    missing = required - payload.keys()
    if missing:
        raise HostProtocolValidationError(f"Missing host result fields: {sorted(missing)}")
    if payload.get("protocol_version") != HOST_PROTOCOL_VERSION:
        raise HostProtocolValidationError("Unsupported host protocol version")
    if packet is not None and payload.get("task_handle") != packet.task_handle:
        raise HostProtocolValidationError("Result task handle does not match packet")
    result = payload.get("result")
    if not isinstance(result, Mapping):
        raise HostProtocolValidationError("Host result must be a JSON object")
    forbidden = _find_forbidden_keys(result)
    if forbidden:
        raise HostProtocolValidationError(f"Forbidden result keys: {sorted(forbidden)}")
    if packet is not None:
        expected = set(packet.response_format.get("required") or [])
        missing_result = expected - result.keys()
        if missing_result:
            raise HostProtocolValidationError(f"Missing required result fields: {sorted(missing_result)}")


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
