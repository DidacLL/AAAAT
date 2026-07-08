from __future__ import annotations

import json
import sqlite3
import subprocess
from typing import Any

from .packet import PACKET_VERSION, build_task_packet
from ..agent_access import submit_agent_task_result


def dispatch_command(conn: sqlite3.Connection, task_id: str, cmd: str) -> dict[str, Any]:
    """Send one task packet to a user-configured command and submit stdout as the result."""
    if not cmd.strip():
        raise ValueError("Command dispatch requires --cmd")
    packet = build_task_packet(conn, task_id)
    packet_json = json.dumps(packet, indent=2, sort_keys=True) + "\n"
    completed = subprocess.run(
        cmd,
        input=packet_json,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        check=False,
    )
    acknowledgement: dict[str, Any] = {
        "backend": "command",
        "task_id": task_id,
        "packet_version": PACKET_VERSION,
        "exit_code": completed.returncode,
        "stderr": completed.stderr,
        "submitted": False,
    }
    if completed.returncode != 0:
        return acknowledgement
    if not completed.stdout.strip():
        acknowledgement["error"] = "empty_stdout"
        return acknowledgement

    acknowledgement["submitted"] = True
    acknowledgement["task"] = submit_agent_task_result(
        conn,
        task_id,
        completed.stdout,
        agent_name="command",
        agent_runtime="command",
    )
    return acknowledgement
