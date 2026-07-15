from __future__ import annotations

import sqlite3
from typing import Any

from ..agent_access import build_agent_work_item, get_task_for_capability

PACKET_VERSION = "aaaat.work_item.v1"


def build_task_packet(conn: sqlite3.Connection, task_capability: str) -> dict[str, Any]:
    """Return the same complete bounded work item used by every transport."""
    task = get_task_for_capability(conn, task_capability)
    work = build_agent_work_item(conn, task)
    work["packet_version"] = PACKET_VERSION
    return work


def callback_instructions(task_capability: str) -> dict[str, Any]:
    return {
        "manual": "Save one JSON result locally and submit it with the task capability.",
        "cli_submit_result_file": f"python -m aaaat.cli agent submit {task_capability} --result-file result.json",
        "cli_submit_result_body": f"python -m aaaat.cli agent submit {task_capability} --result-body '<json-result>'",
        "auto_apply": False,
    }
