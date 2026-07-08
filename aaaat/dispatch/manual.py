from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from .packet import PACKET_VERSION, build_task_packet


def dispatch_manual(conn: sqlite3.Connection, storage: str | Path, task_id: str) -> dict[str, Any]:
    """Write one task packet to the local manual agent outbox."""
    packet = build_task_packet(conn, task_id)
    path = manual_packet_path(storage, task_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(packet, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return {
        "backend": "manual",
        "packet_path": str(path),
        "task_id": task_id,
        "packet_version": PACKET_VERSION,
    }


def manual_packet_path(storage: str | Path, task_id: str) -> Path:
    base = Path(storage)
    if base.suffix == ".db":
        base = base.parent
    return base / "agent_outbox" / f"{task_id}.packet.json"
