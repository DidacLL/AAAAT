from __future__ import annotations

from typing import Any


PROTOCOL_VERSION = "2025-06-18"


def mcp_descriptor() -> dict[str, Any]:
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {"resources": {}, "tools": {}, "prompts": {}},
        "resources": [
            {"uri": "aaaat://agent/tasks", "name": "agent-tasks", "title": "Capability-Scoped Agent Task Envelopes", "mimeType": "application/json"},
            {
                "uri": "aaaat://agent/tasks/{task_id}/context",
                "name": "agent-task-context",
                "title": "Capability-Scoped Agent Task Context",
                "mimeType": "application/json",
            },
            {
                "uri": "aaaat://agent/capabilities",
                "name": "agent-capabilities",
                "title": "Capability-Scoped Agent Operations",
                "mimeType": "application/json",
            },
            {"uri": "aaaat://agent-guide", "name": "agent-guide", "title": "Capability-Scoped Agent Guide", "mimeType": "text/markdown"},
        ],
        "tools": [
            tool("list_agent_tasks", {"state": "string", "limit": "integer"}, []),
            tool("get_agent_task_context", {"task_id": "string"}, ["task_id"]),
            tool(
                "submit_agent_task_result",
                {"task_id": "string", "result_body": "string", "agent_name": "string", "agent_runtime": "string", "model_provider": "string"},
                ["task_id", "result_body"],
            ),
            tool("claim_agent_task", {"task_id": "string", "agent_name": "string", "agent_runtime": "string"}, ["task_id"]),
            tool("release_agent_task", {"task_id": "string"}, ["task_id"]),
            tool("get_agent_context_bundle", {"purpose": "string"}, ["purpose"]),
            tool("submit_agent_action", {"action": "string", "payload": "object"}, ["action", "payload"]),
        ],
        "prompts": [
            prompt("complete_agent_task", ["task_id"]),
            prompt("review_task_context", ["task_id"]),
        ],
    }


def tool(name: str, properties: dict[str, str], required: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "title": name.replace("_", " ").title(),
        "description": f"Capability-scoped AAAAT operation: {name.replace('_', ' ')}.",
        "inputSchema": {
            "type": "object",
            "properties": {key: {"type": kind} for key, kind in properties.items()},
            "required": required,
        },
    }


def prompt(name: str, args: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "title": name.replace("_", " ").title(),
        "description": f"Capability-oriented prompt template for {name.replace('_', ' ')}.",
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
