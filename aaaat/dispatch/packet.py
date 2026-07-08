from __future__ import annotations

import sqlite3
from typing import Any

from ..agent_access import build_agent_task_context
from ..tasks import get_task

PACKET_VERSION = "aaaat.task_packet.v1"

PRIVACY_RULES = [
    "Use only the context in this packet for the task.",
    "Do not request or infer broad candidature lists, dashboard payloads, arbitrary search results, database paths, or generic CRUD routes.",
    "Respect profile exposure markers; denied or redacted facts are unavailable.",
    "Return a task result only. AAAAT will store it for review and will not auto-apply it.",
]


def build_task_packet(conn: sqlite3.Connection, task_id: str) -> dict[str, Any]:
    """Build a portable manual-dispatch packet for one agent task."""
    task = get_task(conn, task_id)
    task_context = build_agent_task_context(conn, task_id)
    return {
        "packet_version": PACKET_VERSION,
        "task": {
            "id": task["id"],
            "task_type": task.get("task_type", ""),
            "title": task.get("title", ""),
            "state": task.get("state", ""),
            "priority": task.get("priority", ""),
        },
        "instructions": {
            "task": task.get("instructions", ""),
            "privacy_rules": PRIVACY_RULES,
        },
        "context": task_context.get("context", {}),
        "privacy": task_context.get("privacy", {}),
        "expected_output": expected_output(task),
        "allowed_actions": task_context.get("allowed_actions", []),
        "callback_instructions": callback_instructions(task_id),
    }


def expected_output(task: dict[str, Any]) -> dict[str, Any]:
    task_type = str(task.get("task_type") or "task")
    return {
        "kind": "task_result",
        "for_task_type": task_type,
        "format": "Plain text or JSON matching the task instructions.",
        "review_state": "suggested",
        "auto_apply": False,
    }


def callback_instructions(task_id: str) -> dict[str, Any]:
    return {
        "manual": "Save the response locally, then submit it with the AAAAT CLI.",
        "cli_submit_result_file": f"python -m aaaat.cli agent submit {task_id} --result-file result.json",
        "cli_submit_result_body": f"python -m aaaat.cli agent submit {task_id} --result-body '<result>'",
        "auto_apply": False,
    }
