from __future__ import annotations

"""Dependency-free MCP descriptor metadata for AAAAT's bounded queue surface.

The descriptor maps external hosts to the existing queue and canonical result
boundary. It does not define a second queue, broad data API, or provider runtime.
"""

from typing import Any

PROTOCOL_VERSION = "2025-06-18"

CONTRACT_DESCRIPTION = (
    "AAAAT bounded queue operation. Acquisition returns one complete purpose-scoped work item. "
    "Callbacks use a random task capability, never an internal entity or database ID."
)


def mcp_descriptor() -> dict[str, Any]:
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {"resources": {}, "tools": {}, "prompts": {}},
        "resources": [
            {"uri": "aaaat://agent/work/next", "name": "agent-next-work", "title": "Next Complete Bounded Work Item", "mimeType": "application/json"},
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
                {"task_capability": "string", "phase": "string", "message": "string", "percent": "integer"},
                ["task_capability", "phase"],
            ),
            tool("submit_agent_action", {"action": "object", "agent_name": "string", "agent_runtime": "string", "model_provider": "string"}, ["action"]),
        ],
        "prompts": [prompt("complete_agent_work", ["task_capability"])],
    }


def tool(name: str, properties: dict[str, str], required: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "title": name.replace("_", " ").title(),
        "description": f"{CONTRACT_DESCRIPTION} Operation: {name.replace('_', ' ')}.",
        "inputSchema": {"type": "object", "properties": {key: {"type": kind} for key, kind in properties.items()}, "required": required},
    }


def prompt(name: str, args: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "title": name.replace("_", " ").title(),
        "description": f"Prompt template for {name.replace('_', ' ')} using the bounded response format.",
        "arguments": [{"name": arg, "required": True} for arg in args],
    }


def validate_descriptor(descriptor: dict[str, Any] | None = None) -> bool:
    descriptor = descriptor or mcp_descriptor()
    for capability in ("resources", "tools", "prompts"):
        if capability not in descriptor.get("capabilities", {}):
            raise ValueError(f"Missing MCP capability: {capability}")
    for resource in descriptor.get("resources", []):
        if not resource.get("uri", "").startswith("aaaat://") or not resource.get("name") or not resource.get("mimeType"):
            raise ValueError(f"Invalid MCP resource: {resource}")
    for item in descriptor.get("tools", []):
        schema = item.get("inputSchema", {})
        if not item.get("name") or schema.get("type") != "object" or "properties" not in schema:
            raise ValueError(f"Invalid MCP tool: {item}")
    for item in descriptor.get("prompts", []):
        if not item.get("name") or "arguments" not in item:
            raise ValueError(f"Invalid MCP prompt: {item}")
    return True
