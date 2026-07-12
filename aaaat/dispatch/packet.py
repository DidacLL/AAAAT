from __future__ import annotations

import sqlite3
from typing import Any

from ..agent_access import build_agent_task_context
from ..task_definitions import task_definition_snapshot

PACKET_VERSION = "aaaat.task_packet.v2"


def build_task_packet(conn: sqlite3.Connection, task_handle: str) -> dict[str, Any]:
    """Build a portable, self-contained packet for one bounded agent task."""
    task_context = build_agent_task_context(conn, task_handle)
    task = task_context.get("task", {})
    handle = str(task.get("task_handle") or task_handle)
    stored_task = _task_for_handle(conn, handle)
    definition = task_definition_snapshot(conn, stored_task)
    default_instructions = task_context.get("instructions", {})
    instructions = {
        **default_instructions,
        "default": definition["instructions"],
        "definition_version": definition["version"],
    }
    output_contract = {
        **task_context.get("output_contract", {}),
        "task_definition_version": definition["version"],
        "artifact": {
            "template": definition.get("artifact_template", ""),
            "variable_mapping": definition.get("artifact_mapping", {}),
        },
    }
    return {
        "packet_version": PACKET_VERSION,
        "task_handle": handle,
        "task_type": task.get("task_type", ""),
        "title": task.get("title", ""),
        "instructions": instructions,
        "purpose": task_context.get("purpose", ""),
        "input_context": task_context.get("input_context", task_context.get("context", {})),
        "output_contract": output_contract,
        "response_format": definition["response_format"],
        "allowed_actions": task_context.get("allowed_actions", []),
        "privacy_notes": task_context.get("privacy_notes", []),
        "callback_instructions": callback_instructions(handle),
    }


def _task_for_handle(conn: sqlite3.Connection, handle: str) -> dict[str, Any]:
    from ..agent_access import get_task_for_handle

    return get_task_for_handle(conn, handle)


def callback_instructions(task_handle: str) -> dict[str, Any]:
    return {
        "manual": "Save the JSON response locally, then submit it with the AAAAT CLI task_handle.",
        "cli_submit_result_file": f"python -m aaaat.cli agent submit {task_handle} --result-file result.json",
        "cli_submit_result_body": f"python -m aaaat.cli agent submit {task_handle} --result-body '<json-result>'",
        "auto_apply": False,
    }
