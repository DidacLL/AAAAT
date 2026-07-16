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
from importlib.resources import files
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .db import init_db


BRIEF_VERSION = "2"
REQUEST_PROTOCOL = "aaaat.host-connection"
REGISTRY_VERSION = 1
CONNECTION_PREFIX = "hostcap_"
CONNECTED_WINDOW = timedelta(minutes=15)
PAIRING_TTL = timedelta(days=30)


class HostConnectionError(ValueError):
    """A safe, expected pairing or bridge failure."""


def connection_brief() -> str:
    """Return the compact host-only onboarding brief.

    The brief gives an external LLM enough information to configure its own
    host while keeping ordinary user interaction in career language.
    """

    return """# AAAAT connection brief (version 2)

AAAAT is the user's private local job-search workspace. You are the user's
conversational AAAAT interface and the intelligent setup layer for your own
host. AAAAT supplies the paired bridge, bounded schemas, validation, local
persistence, and desktop review. You supply provider-specific or host-specific
configuration, reasoning, research, writing, and any host-owned automation the
user approves.

## Choose the strongest route available

Assess the capabilities and permission model of the current host, then implement
the best route it supports:

1. native local MCP or an equivalent tool connection;
2. a host-owned tool or durable skill;
3. an approved helper script, automation, or schedule;
4. AAAAT portable task/result exchange when a live local route is unavailable.

When the host permits configuration changes, create the required MCP entry,
tool, skill, or helper script directly. Otherwise provide exact instructions
for the current provider, host, and operating system. Keep these implementation
details inside host setup and describe the result to the user in plain terms.

## Verify the paired connection

Use the prepared opaque connection card to launch the installed paired bridge.
The bridge resolves the private workspace internally. Verify initialize,
tools/list, and ping before claiming work. The bridge tool catalogue is the
complete local authority granted to this host.

## Begin from the user's current need

Introduce the benefit of keeping career direction, opportunities, preparation,
and documents aligned. Then use the most useful starting point already present:
connection setup, profile or career direction, an offer or link, an existing
candidature, a recruiter call, a document gap, or general job research.
Profile setup is the normal foundation when there is no urgent task, but it does not gate other supported work.

## Use bounded AAAAT work

Use the paired bridge tools to open the workspace, begin profile completion,
create a new candidature from user-supplied material, and claim one complete work item at a time.
Report progress and submit one validated result using the work item's declared
schema. AAAAT privately binds its callback capability to local records and
applies accepted results.

Existing non-empty desktop values remain authoritative. Assisted profile and
candidature results fill supported gaps or remain reviewable history. New
keyword definitions fill missing definitions; established canonical definitions
remain unchanged.
"""


def runtime_skill_document() -> str:
    """Return the canonical host-owned runtime skill bundled with AAAAT.

    A host may place this document in its own persistent skill configuration
    after its normal permission flow. The document is not task data and does
    not disclose a workspace, storage implementation, or connection secret.
    """

    return files("aaaat").joinpath("host_runtime_skill.md").read_text(encoding="utf-8")


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


def create_connection(storage: str | Path) -> dict[str, str]:
    """Create a revocable opaque capability for one workspace.

    The returned capability is host-only. The registry stores only its digest
    alongside the workspace mapping, so a copied registry cannot launch a
    bridge by itself.
    """

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


def create_connection_request(storage: str | Path) -> dict[str, str]:
    """Prepare one opaque handoff card for the host that owns this workspace.

    The desktop can show this small card for a user to paste into their chosen
    LLM. It contains no command, path, database name, or local identifier.
    Making a new card deliberately invalidates previous active cards for this
    workspace, so a user can replace a connection without exposing its token.
    """

    workspace = str(Path(storage).resolve())
    registry = _read_registry()
    now = _utc_now()
    for entry in registry["connections"].values():
        if isinstance(entry, dict) and entry.get("storage_path") == workspace and not entry.get("revoked_at"):
            entry["revoked_at"] = now
    _write_registry(registry)
    pairing = create_connection(workspace)
    return {
        "protocol": REQUEST_PROTOCOL,
        "brief_version": BRIEF_VERSION,
        "connection_capability": pairing["connection_capability"],
    }


def connection_handoff_message(storage: str | Path) -> str:
    """Create the one self-contained, host-only message a user can paste.

    This is intentionally the only place where the natural-language brief and
    the opaque request meet. It is copied to the selected LLM, never rendered
    in the ordinary desktop surface, and contains no workspace path or local
    record identifier.
    """

    request = create_connection_request(storage)
    card = json.dumps(request, ensure_ascii=False, separators=(",", ":"))
    return (
        "# AAAAT connection request for the AI host\n\n"
        "The user has approved connecting this host to AAAAT. Use this material "
        "inside host setup, complete the strongest supported configuration, and "
        "report the result to the user in plain language.\n\n"
        + connection_brief()
        + "\n## Host launch contract\n\n"
        "For a local stdio connection, launch `aaaat-host-bridge --connection "
        "<connection_capability>` with the opaque value below. The bridge maps "
        "the correct private workspace internally. Initialize it, discover its "
        "tools, and ping it before requesting work. If this host cannot run a "
        "local tool, configure the next strongest supported route and use "
        "portable exchange only as the final fallback.\n\n"
        "## Opaque connection card\n\n"
        + card
    )


def export_host_pack(storage: str | Path, directory: str | Path) -> dict[str, str]:
    """Write a host-private connection pack to a user-selected integration folder.

    The desktop reports only that the pack is ready. Its technical launch
    contract and opaque capability stay in the selected host configuration,
    never in ordinary AAAAT screens or bridge responses.
    """

    request = create_connection_request(storage)
    target = Path(directory) / "aaaat-job-research"
    target.mkdir(parents=True, exist_ok=True)
    (target / "SKILL.md").write_text(runtime_skill_document(), encoding="utf-8")
    (target / "aaaat-connection.json").write_text(
        json.dumps(
            {
                "protocol": REQUEST_PROTOCOL,
                "brief_version": BRIEF_VERSION,
                "connection": request,
                "mcp": {
                    "transport": "stdio",
                    "command": "aaaat-host-bridge",
                    "arguments": ["--connection", request["connection_capability"]],
                },
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
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
    """Pause every host pairing for a workspace without showing host tokens.

    This is the desktop-facing revocation operation. It lets wx revoke access
    without storing or displaying a host capability.
    """

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
