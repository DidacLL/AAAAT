from __future__ import annotations

from typing import Any


PROTOCOL_VERSION = "2025-06-18"


def mcp_descriptor() -> dict[str, Any]:
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {"resources": {}, "tools": {}, "prompts": {}},
        "resources": [
            {"uri": "aaaat://applications", "name": "applications", "title": "Applications", "mimeType": "application/json"},
            {"uri": "aaaat://dashboard-payload", "name": "dashboard-payload", "title": "Dashboard Payload", "mimeType": "application/json"},
            {"uri": "aaaat://glossary", "name": "glossary", "title": "Glossary", "mimeType": "application/json"},
            {"uri": "aaaat://profile/variables", "name": "profile-variables", "title": "Profile Variables", "mimeType": "application/json"},
            {"uri": "aaaat://templates", "name": "templates", "title": "Templates", "mimeType": "application/json"},
            {"uri": "aaaat://agent-guide", "name": "agent-guide", "title": "Agent Guide", "mimeType": "text/markdown"},
        ],
        "tools": [
            tool("create_application", {"company": "string", "role": "string"}, ["company", "role"]),
            tool("list_applications", {}, []),
            tool("get_application_context", {"application_id": "string"}, ["application_id"]),
            tool("add_raw_intake", {"application_id": "string", "content": "string"}, ["application_id", "content"]),
            tool("save_agent_suggestion", {"application_id": "string", "field_name": "string", "value": "string"}, ["field_name", "value"]),
            tool("apply_agent_suggestion", {"suggestion_id": "string"}, ["suggestion_id"]),
            tool("save_cover_letter_draft", {"application_id": "string", "body": "string"}, ["application_id", "body"]),
            tool("save_profile_variable", {"key": "string", "value": "string"}, ["key", "value"]),
            tool("render_cover_letter_pdf", {"application_id": "string"}, ["application_id"]),
            tool("render_cv_pdf", {}, []),
            tool("attach_artifact", {"application_id": "string", "path": "string", "artifact_type": "string"}, ["path", "artifact_type"]),
            tool("export_static_demo", {"output_path": "string"}, ["output_path"]),
        ],
        "prompts": [
            prompt("enrich_application", ["application_id"]),
            prompt("prepare_recruiter_call", ["application_id"]),
            prompt("draft_cover_letter", ["application_id"]),
            prompt("draft_form_answer", ["application_id", "question"]),
            prompt("review_application_fit", ["application_id"]),
            prompt("adapt_cv_for_application", ["application_id"]),
            prompt("generate_interview_guide", ["application_id"]),
        ],
    }


def tool(name: str, properties: dict[str, str], required: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "title": name.replace("_", " ").title(),
        "description": f"AAAAT local tool: {name.replace('_', ' ')}.",
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
        "description": f"Prompt template for {name.replace('_', ' ')}.",
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
