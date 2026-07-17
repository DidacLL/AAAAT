from __future__ import annotations

"""MCP metadata for AAAAT's small bounded stdio surfaces."""

from typing import Any

PROTOCOL_VERSION = "2025-06-18"

STRING = {"type": "string", "maxLength": 20000}
SHORT_STRING = {"type": "string", "maxLength": 1000}
PROVENANCE_PROPERTIES = {
    "agent_name": {"type": "string", "maxLength": 500},
    "agent_runtime": {"type": "string", "maxLength": 500},
    "model_provider": {"type": "string", "maxLength": 500},
}

SOURCE_MATERIAL_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "offer_text": STRING,
        "offer_url": SHORT_STRING,
        "application_form_text": STRING,
        "user_instructions": STRING,
        "conversation_context": STRING,
    },
}
CANDIDATURE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "company": SHORT_STRING,
        "role": SHORT_STRING,
        "status": SHORT_STRING,
        "priority": SHORT_STRING,
        "source": SHORT_STRING,
        "source_url": SHORT_STRING,
        "location": SHORT_STRING,
        "remote_mode": SHORT_STRING,
        "offer_snapshot": STRING,
        "keywords": {
            "oneOf": [
                {"type": "array", "items": SHORT_STRING, "maxItems": 100},
                {"type": "string", "maxLength": 10000},
            ]
        },
        "description": STRING,
        "salary_expectation": SHORT_STRING,
        "publication_date": SHORT_STRING,
        "application_date": SHORT_STRING,
        "tech_stack": STRING,
        "valuation": {"oneOf": [{"type": "integer"}, SHORT_STRING]},
    },
}
OUTPUTS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "candidature_evaluation": STRING,
        "role_strategy": STRING,
        "strengths": STRING,
        "risks_to_avoid": STRING,
        "questions_to_ask": STRING,
        "company_research": STRING,
        "call_signals": STRING,
        "pitch": STRING,
        "smart_question": STRING,
        "recruiter_material": STRING,
        "form_answers": {"oneOf": [STRING, {"type": "object"}]},
        "cover_letter_body": STRING,
        "cv_positioning": STRING,
    },
}
RENDER_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "cover_letter": {"type": "boolean"},
        "cv": {"type": "boolean"},
    },
}
REQUESTED_TASKS_SCHEMA = {
    "type": "array",
    "maxItems": 12,
    "items": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "task_type": {
                "type": "string",
                "enum": [
                    "extract",
                    "field_inference",
                    "evaluate",
                    "evaluation",
                    "strategy",
                    "application_strategy",
                    "company_research",
                    "research",
                    "recruiter",
                    "recruiter_call",
                    "interview",
                    "interview_preparation",
                    "form_answers",
                    "draft_form_responses",
                    "cover_letter",
                    "draft_cover_letter",
                    "cv",
                    "draft_cv",
                    "keywords",
                    "keyword_definition",
                ],
            },
            "priority": {"type": "string", "enum": ["low", "normal", "medium", "high"]},
            "reason": SHORT_STRING,
            "keyword": SHORT_STRING,
        },
        "required": ["task_type"],
    },
}
CREATE_CANDIDATURE_PAYLOAD_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "source_material": SOURCE_MATERIAL_SCHEMA,
        "candidature": CANDIDATURE_SCHEMA,
        "outputs": OUTPUTS_SCHEMA,
        "render": RENDER_SCHEMA,
        "requested_tasks": REQUESTED_TASKS_SCHEMA,
    },
}

TOOL_DESCRIPTIONS = {
    "get_connection_status": "Read the plain AAAAT connection state for this paired workspace.",
    "open_workspace": "Open or focus the local wx AAAAT desktop without receiving its private path.",
    "start_profile": "Start one bounded profile task when professional context would help the user's current work.",
    "create_candidature": "Create a new candidature from user-provided material, supplied derived outputs and explicitly requested follow-up work. This never edits an existing candidature.",
    "get_next_agent_work": "Atomically claim one complete ready AAAAT work item. Explicit desktop requests are selected before older background work.",
    "submit_agent_task_result": "Submit one structured result matching the claimed work item's response schema.",
    "submit_agent_action": "Submit one validated bounded action through the local maintenance MCP surface.",
}


def mcp_descriptor() -> dict[str, Any]:
    """Describe the bounded maintenance MCP surface used by local tooling."""

    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {"tools": {}},
        "resources": [],
        "tools": [
            _get_next_work_tool(),
            _submit_result_tool(),
            tool("submit_agent_action", {"action": {"type": "object"}, **PROVENANCE_PROPERTIES}, ["action"]),
        ],
    }


def host_bridge_descriptor() -> dict[str, Any]:
    """Describe exactly the authority available through a paired AI host."""

    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {"tools": {}},
        "resources": [],
        "tools": [
            tool("get_connection_status", {}, []),
            tool("open_workspace", {}, []),
            tool("start_profile", {}, []),
            tool(
                "create_candidature",
                {"payload": CREATE_CANDIDATURE_PAYLOAD_SCHEMA, **PROVENANCE_PROPERTIES},
                ["payload"],
            ),
            _get_next_work_tool(),
            _submit_result_tool(),
        ],
    }


def _get_next_work_tool() -> dict[str, Any]:
    return tool("get_next_agent_work", {}, [])


def _submit_result_tool() -> dict[str, Any]:
    return tool(
        "submit_agent_task_result",
        {
            "task_capability": {"type": "string", "minLength": 30, "maxLength": 200},
            "result_json": {"type": "object"},
            **PROVENANCE_PROPERTIES,
        },
        ["task_capability", "result_json"],
    )


def tool(name: str, properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "title": name.replace("_", " ").title(),
        "description": TOOL_DESCRIPTIONS[name],
        "inputSchema": {
            "type": "object",
            "additionalProperties": False,
            "properties": properties,
            "required": required,
        },
    }


def validate_descriptor(descriptor: dict[str, Any] | None = None) -> bool:
    descriptor = descriptor or mcp_descriptor()
    capabilities = descriptor.get("capabilities", {})
    if "tools" not in capabilities:
        raise ValueError("Missing MCP capability: tools")
    resources = descriptor.get("resources", [])
    if resources:
        raise ValueError("AAAAT's bounded MCP surface does not expose resources")
    for item in descriptor.get("tools", []):
        schema = item.get("inputSchema", {})
        if not item.get("name") or not item.get("description") or schema.get("type") != "object" or "properties" not in schema:
            raise ValueError(f"Invalid MCP tool: {item}")
    return True
