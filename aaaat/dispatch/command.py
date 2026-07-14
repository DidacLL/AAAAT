from __future__ import annotations

import json
import os
import shlex
import sqlite3
import subprocess
from typing import Any

from .packet import PACKET_VERSION, build_task_packet
from ..agent_access import submit_agent_task_result, task_result_ack


def dispatch_command(conn: sqlite3.Connection, task_handle: str, cmd: str) -> dict[str, Any]:
    """Send one task packet to a user-configured command and submit stdout as the result."""
    if not cmd.strip():
        raise ValueError("Command dispatch requires --cmd")
    packet = build_task_packet(conn, task_handle)
    packet_json = json.dumps(packet, indent=2, sort_keys=True) + "\n"
    completed = run_backend_command(cmd, packet_json)
    acknowledgement: dict[str, Any] = {
        "backend": "command",
        "task_handle": task_handle,
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
    task = submit_agent_task_result(conn, task_handle, completed.stdout, agent_name="command", agent_runtime="command")
    acknowledgement["task"] = task_result_ack(task)["task"]
    acknowledgement["next"] = ["open_desktop"]
    return acknowledgement


def run_backend_command(cmd: str, packet_json: str) -> subprocess.CompletedProcess[str]:
    try:
        args = shlex.split(cmd, posix=os.name != "nt")
    except ValueError:
        args = []
    if not args:
        raise ValueError("Command dispatch requires a valid argv string")
    return subprocess.run(
        args,
        input=packet_json,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=False,
        check=False,
    )
