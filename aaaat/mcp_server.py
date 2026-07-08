from __future__ import annotations

from typing import Any


PROTOCOL_VERSION = "2025-06-18"


CONTRACT_DESCRIPTION = (
    "Capability-scoped AAAAT operation. No dashboard HTML, broad CRUD, or entity-ID mutation authority. "
    "Task contexts and packets include task_handle, task_type, title, instructions, purpose, input_context, "
    "output_contract, response_format, allowed_actions, and privacy_notes."
)


def mcp_descriptor() -> dict[str, Any]:
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {"resources": {}, "tools": {}, "prompts": {}},
        "resources": [
            {
                "uri": "aaaat://agent/tasks/next",
                "name": "agent-next-task",
                "title": "Next Pending Agent Task Handle",
                "mimeType": "application/json",
            },
            {
                "uri": "aaaat://agent/tasks/{task_handle}/context",
                "name": "agent-task-context",
                "title": "Bounded Agent Task Context With Response Format",
                "mimeType": "application/json",
            },
            {
                "uri": "aaaat://agent/context-bundle",
                "name": "agent-context-bundle",
                "title": "Purpose-Scoped Agent Context Bundle",
                "mimeType": "application/json",
            },
            {"uri": "aaaat://agent-guide", "name": "agent-guide", "title": "Capability-Scoped Agent Guide", "mimeType": "text/markdown"},
        ],
        "tools": [
            tool("get_next_agent_task", {}, []),
            tool("get_agent_task_context", {"task_handle": "string"}, ["task_handle"]),
            tool(
                "submit_agent_task_result",
                {"task_handle": "string", "result_json": "object", "agent_name": "string", "agent_runtime": "string", "model_provider": "string"},
                ["task_handle", "result_json"],
            ),
            tool("get_agent_context_bundle", {"purpose": "string"}, ["purpose"]),
            tool(
                "submit_agent_action",
                {"action": "object", "agent_name": "string", "agent_runtime": "string", "model_provider": "string"},
                ["action"],
            ),
        ],
        "prompts": [
            prompt("complete_agent_task", ["task_handle"]),
            prompt("review_task_context", ["task_handle"]),
        ],
    }


def tool(name: str, properties: dict[str, str], required: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "title": name.replace("_", " ").title(),
        "description": f"{CONTRACT_DESCRIPTION} Operation: {name.replace('_', ' ')}.",
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
        "description": f"Capability-oriented prompt template for {name.replace('_', ' ')} using the bounded task response format.",
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
