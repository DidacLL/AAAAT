"""Host-only pairing for a connected LLM.

This module deliberately keeps connection setup separate from claimed work. A
pairing capability identifies one local workspace to the installed bridge; it
is not included in work items and it is not a database identifier.
"""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import shutil
import sys
from datetime import datetime, timedelta, timezone
from importlib.resources import files
from pathlib import Path, PureWindowsPath
from typing import Any

from .db import init_db
from .file_exchange import (
    RESULT_MEDIA_TYPE,
    RESULT_PROTOCOL,
    TASK_MEDIA_TYPE,
    TASK_PROTOCOL,
    TEXT_RESULT_BEGIN,
    TEXT_RESULT_END,
)

REQUEST_PROTOCOL = "aaaat.host-connection"
REQUEST_VERSION = 1
REGISTRY_VERSION = 1
CONNECTION_PREFIX = "hostcap_"
CONNECTED_WINDOW = timedelta(minutes=15)
PAIRING_TTL = timedelta(days=30)


class HostConnectionError(ValueError):
    """A safe, expected pairing or bridge failure."""


def runtime_skill_document() -> str:
    """Return the single packaged AAAAT instruction used by connected LLMs."""

    return files("aaaat").joinpath("SKILL.md").read_text(encoding="utf-8")


def registry_path() -> Path:
    """Return the private user-level registry path without exposing it in APIs."""

    explicit = os.environ.get("AAAAT_CONNECTION_REGISTRY")
    if explicit:
        return Path(explicit)
    if os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    else:
        base = Path(os.environ.get("XDG_STATE_HOME") or Path.home() / ".local" / "state")
    return base / "AAAAT" / "host-connections.json"


def host_bridge_executable() -> str:
    """Locate the paired bridge without exposing private workspace details."""

    configured = os.environ.get("AAAAT_HOST_BRIDGE_EXECUTABLE", "").strip()
    if configured:
        return configured
    if getattr(sys, "frozen", False):
        raw_executable = str(sys.executable)
        if "\\" in raw_executable or raw_executable.lower().endswith(".exe"):
            desktop_root = PureWindowsPath(raw_executable).parent
            return str(desktop_root / "bridge" / "aaaat-host-bridge.exe")
        executable = Path(raw_executable).resolve()
        if sys.platform == "darwin" and executable.parent.name == "MacOS":
            desktop_root = executable.parents[3]
        else:
            desktop_root = executable.parent
        return str(desktop_root / "bridge" / "aaaat-host-bridge")
    return shutil.which("aaaat-host-bridge") or "aaaat-host-bridge"


def bridge_launch_contract(capability: str) -> dict[str, Any]:
    """Return the exact provider-neutral stdio launch configuration."""

    return {
        "transport": "stdio",
        "command": host_bridge_executable(),
        "arguments": ["--connection", _validate_capability(capability)],
    }


def create_connection(storage: str | Path) -> dict[str, str]:
    """Create a revocable opaque capability for one workspace."""

    workspace = str(Path(storage).resolve())
    init_db(workspace)
    capability = CONNECTION_PREFIX + secrets.token_urlsafe(32)
    digest = _digest(capability)
    now = _utc_now()
    registry = _read_registry()
    registry["connections"][digest] = {
        "storage_path": workspace,
        "created_at": now,
        "last_seen_at": "",
        "revoked_at": "",
    }
    _write_registry(registry)
    return {"connection_capability": capability, "state": "ready"}


def create_connection_request(storage: str | Path) -> dict[str, Any]:
    """Prepare one opaque connection card for the host that owns this workspace."""

    from .mcp_server import host_bridge_descriptor

    workspace = str(Path(storage).resolve())
    registry = _read_registry()
    now = _utc_now()
    for entry in registry["connections"].values():
        if isinstance(entry, dict) and entry.get("storage_path") == workspace and not entry.get("revoked_at"):
            entry["revoked_at"] = now
    _write_registry(registry)
    pairing = create_connection(workspace)
    capability = pairing["connection_capability"]
    return {
        "protocol": REQUEST_PROTOCOL,
        "version": REQUEST_VERSION,
        "connection_capability": capability,
        "mcp": bridge_launch_contract(capability),
        "tools": host_bridge_descriptor()["tools"],
        "fallback": {
            "preferred": "file",
            "task_protocol": TASK_PROTOCOL,
            "task_media_type": TASK_MEDIA_TYPE,
            "result_protocol": RESULT_PROTOCOL,
            "result_media_type": RESULT_MEDIA_TYPE,
            "text_result_begin": TEXT_RESULT_BEGIN,
            "text_result_end": TEXT_RESULT_END,
            "instruction": (
                "When a reachable live tool connection is unavailable, ask the user to create a task file in AAAAT's AI exchange, "
                "process that uploaded file, and return the exact named JSON result file. Use the tagged text result only when this host cannot create files."
            ),
        },
    }


def connection_handoff_message(storage: str | Path) -> str:
    """Create the self-contained connection request copied by the desktop."""

    card = create_connection_request(storage)
    return (
        "# Connect this AI host to AAAAT\n\n"
        "Use the AAAAT skill below as the behavioral instruction for this workspace. "
        "First check whether AAAAT tools are already available. Choose one route that the current host can actually use. "
        "For MCP or equivalent stdio tools, use the exact command and arguments in the connection card only when this host can launch that local command and reach the user's machine; "
        "perform normal initialization and tool discovery, then continue in plain language. "
        "Do not claim local access that this host does not have, and do not ask the user to run a connector test suite. "
        "When a live connection is unavailable, continue through AAAAT's AI exchange: ask the user to create and upload the task file, then return the exact named JSON result file. "
        f"Only when this host cannot create files, return the result once between {TEXT_RESULT_BEGIN} and {TEXT_RESULT_END}.\n\n"
        "## AAAAT skill\n\n"
        + runtime_skill_document().rstrip()
        + "\n\n## Opaque connection card\n\n```json\n"
        + json.dumps(card, ensure_ascii=False, indent=2)
        + "\n```\n"
    )


def export_host_pack(storage: str | Path, directory: str | Path) -> dict[str, str]:
    """Write the same skill and connection card for a file-capable host."""

    card = create_connection_request(storage)
    target = Path(directory) / "AAAAT"
    target.mkdir(parents=True, exist_ok=True)
    (target / "SKILL.md").write_text(runtime_skill_document(), encoding="utf-8")
    (target / "aaaat-connection.json").write_text(
        json.dumps(card, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return {"status": "ready"}


def resolve_connection(capability: str) -> Path:
    """Resolve one active capability to its private workspace path."""

    digest = _digest(_validate_capability(capability))
    registry = _read_registry()
    entry = registry["connections"].get(digest)
    if not isinstance(entry, dict) or entry.get("revoked_at"):
        raise HostConnectionError("This connection is unavailable. Pair again from your host setup.")
    last_activity = _parse_utc(str(entry.get("last_seen_at") or "")) or _parse_utc(str(entry.get("created_at") or ""))
    if last_activity is None or _now() - last_activity > PAIRING_TTL:
        entry["revoked_at"] = _utc_now()
        _write_registry(registry)
        raise HostConnectionError("This connection is unavailable. Pair again from your host setup.")
    stored = entry.get("storage_path")
    if not isinstance(stored, str) or not stored:
        raise HostConnectionError("This connection is unavailable. Pair again from your host setup.")
    return Path(stored)


def note_connection_verified(capability: str) -> None:
    """Record a successful bridge handshake without exposing registry details."""

    digest = _digest(_validate_capability(capability))
    registry = _read_registry()
    entry = registry["connections"].get(digest)
    if not isinstance(entry, dict) or entry.get("revoked_at"):
        raise HostConnectionError("This connection is unavailable. Pair again from your host setup.")
    entry["last_seen_at"] = _utc_now()
    _write_registry(registry)


def revoke_connection(capability: str) -> dict[str, str]:
    """Revoke a host-held capability; existing work capabilities are unaffected."""

    digest = _digest(_validate_capability(capability))
    registry = _read_registry()
    entry = registry["connections"].get(digest)
    if not isinstance(entry, dict):
        raise HostConnectionError("This connection is unavailable. Pair again from your host setup.")
    entry["revoked_at"] = _utc_now()
    _write_registry(registry)
    return {"state": "paused"}


def revoke_workspace_connections(storage: str | Path) -> dict[str, str]:
    """Pause every host pairing for a workspace without showing host tokens."""

    workspace = str(Path(storage).resolve())
    registry = _read_registry()
    now = _utc_now()
    for entry in registry["connections"].values():
        if isinstance(entry, dict) and entry.get("storage_path") == workspace and not entry.get("revoked_at"):
            entry["revoked_at"] = now
    _write_registry(registry)
    return {"state": "paused"}


def connection_status(storage: str | Path) -> dict[str, str]:
    """Return a path-free status for the desktop adapter and host setup UI."""

    workspace = str(Path(storage).resolve())
    entries = [
        value
        for value in _read_registry()["connections"].values()
        if isinstance(value, dict) and value.get("storage_path") == workspace
    ]
    if not entries:
        return {"state": "ready_to_connect"}
    active = [entry for entry in entries if not entry.get("revoked_at")]
    if not active:
        return {"state": "paused"}
    latest = max(active, key=lambda entry: str(entry.get("created_at") or ""))
    seen = _parse_utc(str(latest.get("last_seen_at") or ""))
    if seen is not None and _now() - seen <= CONNECTED_WINDOW:
        return {"state": "connected"}
    if seen is not None:
        return {"state": "needs_attention"}
    return {"state": "ready_to_connect"}


def _validate_capability(capability: str) -> str:
    if not isinstance(capability, str) or not capability.startswith(CONNECTION_PREFIX) or len(capability) < 30:
        raise HostConnectionError("This connection is unavailable. Pair again from your host setup.")
    return capability


def _digest(capability: str) -> str:
    return hashlib.sha256(capability.encode("utf-8")).hexdigest()


def _read_registry() -> dict[str, Any]:
    target = registry_path()
    if not target.exists():
        return {"version": REGISTRY_VERSION, "connections": {}}
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HostConnectionError("AAAAT connection setup is unavailable. Pair again from your host setup.") from exc
    if not isinstance(payload, dict) or payload.get("version") != REGISTRY_VERSION or not isinstance(payload.get("connections"), dict):
        raise HostConnectionError("AAAAT connection setup is unavailable. Pair again from your host setup.")
    return payload


def _write_registry(payload: dict[str, Any]) -> None:
    target = registry_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(target)


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _utc_now() -> str:
    return _now().isoformat()


def _parse_utc(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None
