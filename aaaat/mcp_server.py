from __future__ import annotations

"""MCP metadata for AAAAT's operational bounded stdio server."""

from typing import Any

PROTOCOL_VERSION = "2025-06-18"
PROGRESS_PHASES = ("accepted", "planning", "working", "waiting", "blocked", "finalizing")

CONTRACT_DESCRIPTION = (
    "AAAAT bounded queue operation. Acquisition atomically claims one complete purpose-scoped work item. "
    "Callbacks use a random task capability, never an internal entity or database ID."
)


def mcp_descriptor() -> dict[str, Any]:
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {"resources": {}, "tools": {}},
        "resources": [
            {"uri": "aaaat://agent-guide", "name": "agent-guide", "title": "Capability-Scoped Agent Guide", "mimeType": "text/markdown"},
        ],
        "tools": [
            tool("get_next_agent_work", {}, []),
            tool(
                "submit_agent_task_result",
                {"task_capability": "string", "result_json": "object", "agent_name": "string", "agent_runtime": "string", "model_provider": "string"},
                ["task_capability", "result_json"],
            ),
            tool(
                "report_agent_task_progress",
                {"task_capability": "string", "phase": {"type": "string", "enum": list(PROGRESS_PHASES)}, "message": "string", "percent": "integer"},
                ["task_capability", "phase"],
            ),
            tool("submit_agent_action", {"action": "object", "agent_name": "string", "agent_runtime": "string", "model_provider": "string"}, ["action"]),
        ],
    }


def tool(name: str, properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "title": name.replace("_", " ").title(),
        "description": f"{CONTRACT_DESCRIPTION} Operation: {name.replace('_', ' ')}.",
        "inputSchema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {key: value if isinstance(value, dict) else {"type": value} for key, value in properties.items()},
            "required": required,
        },
    }


def validate_descriptor(descriptor: dict[str, Any] | None = None) -> bool:
    descriptor = descriptor or mcp_descriptor()
    for capability in ("resources", "tools"):
        if capability not in descriptor.get("capabilities", {}):
            raise ValueError(f"Missing MCP capability: {capability}")
    for resource in descriptor.get("resources", []):
        if not resource.get("uri", "").startswith("aaaat://") or not resource.get("name") or not resource.get("mimeType"):
            raise ValueError(f"Invalid MCP resource: {resource}")
    for item in descriptor.get("tools", []):
        schema = item.get("inputSchema", {})
        if not item.get("name") or schema.get("type") != "object" or "properties" not in schema:
            raise ValueError(f"Invalid MCP tool: {item}")
    return True
