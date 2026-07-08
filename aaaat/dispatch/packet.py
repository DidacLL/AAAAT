from __future__ import annotations

import sqlite3
from typing import Any

from ..agent_access import build_agent_task_context
from ..tasks import get_task

PACKET_VERSION = "aaaat.task_packet.v1"
PRIVACY_RULES = [
    "Use only the context in this packet for the task.",
    "Treat task_handle only as a task callback handle, not as a database or entity ID.",
    "Do not request additional private records, local files, or routes.",
    "Respect profile exposure markers; denied or redacted facts are unavailable.",
    "Return a task result only. AAAAT will store it for review and will not auto-apply it.",
]


def build_task_packet(conn: sqlite3.Connection, task_handle: str) -> dict[str, Any]:
    """Build a portable manual-dispatch packet for one agent task."""
    task = get_task(conn, task_handle)
    task_context = build_agent_task_context(conn, task_handle)
    return {
        "packet_version": PACKET_VERSION,
        "task": task_context.get("task", {}),
        "instructions": {
            "task": task.get("instructions", ""),
            "privacy_rules": PRIVACY_RULES,
        },
        "context": task_context.get("context", {}),
        "privacy": task_context.get("privacy", {}),
        "expected_output": expected_output(task),
        "allowed_actions": task_context.get("allowed_actions", []),
        "callback_instructions": callback_instructions(task_context.get("task", {}).get("task_handle", task_handle)),
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


def callback_instructions(task_handle: str) -> dict[str, Any]:
    return {
        "manual": "Save the response locally, then submit it with the AAAAT CLI task_handle.",
        "cli_submit_result_file": f"python -m aaaat.cli agent submit {task_handle} --result-file result.json",
        "cli_submit_result_body": f"python -m aaaat.cli agent submit {task_handle} --result-body '<result>'",
        "auto_apply": False,
    }
