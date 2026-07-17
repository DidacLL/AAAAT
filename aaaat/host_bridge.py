"""Opaque stdio entry point for a paired connected-LLM host."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path, PureWindowsPath
from typing import Any, TextIO

from .host_connection import HostConnectionError, connection_status, note_connection_verified, resolve_connection
from .mcp_runtime import dispatch_mcp_request
from .mcp_server import PROTOCOL_VERSION, host_bridge_descriptor

VERIFICATION_METHODS = {"initialize", "tools/list", "ping"}
BRIDGE_TOOL_NAMES = frozenset(tool["name"] for tool in host_bridge_descriptor()["tools"])
BRIDGE_SERVER_INFO = {"name": "aaaat-host-bridge", "version": "1.0.0"}
ASSISTANT_CONTRACT = {
    "product": "AAAAT is the user's local job-application workspace and artifact generator.",
    "role": "Act as the conversational intelligence for the user's job-search work while AAAAT owns local data, validation, application and rendering.",
    "conversation": [
        "Talk naturally; do not impose a scripted questionnaire or a universal profile-completeness rule.",
        "Store only professional information the user chooses to provide and accept when the user says it is enough.",
        "Use profile context when evaluating opportunities or preparing application material, and ask the user only when important context is missing for the current purpose.",
        "When the user selects assistance in the desktop, claim the next ready work item; explicit desktop requests are prioritized.",
    ],
    "capabilities": [
        "add professional profile information",
        "create a candidature from user-provided material",
        "extract and evaluate opportunity information",
        "prepare application strategy, company research, recruiter and interview material",
        "prepare form answers, tailored CV material and cover-letter content",
        "report progress and submit bounded results",
    ],
    "boundaries": [
        "Do not request or inspect the private workspace, repository, database, application files or unrelated folders.",
        "Use only the tools and complete work items provided by this paired connection.",
        "Do not invent internal identifiers, paths, replacement controls or unsupported actions.",
        "Provider, model, credentials, research tools and host configuration remain owned by this LLM host.",
    ],
}


def _desktop_launch_command(storage: str) -> list[str]:
    """Return the private desktop command for source and installed runtimes."""
    configured = os.environ.get("AAAAT_DESKTOP_EXECUTABLE", "").strip()
    if configured:
        return [configured, "--storage", storage]
    if getattr(sys, "frozen", False):
        return [_packaged_desktop_executable(), "--storage", storage]
    return [sys.executable, "-m", "aaaat.ui_desktop.app", "--storage", storage]


def _packaged_desktop_executable() -> str:
    raw_executable = str(sys.executable)
    if "\\" in raw_executable or raw_executable.lower().endswith(".exe"):
        root = PureWindowsPath(raw_executable).parent.parent
        return str(root / "AAAAT.exe")
    root = Path(raw_executable).resolve().parent.parent
    if sys.platform == "darwin":
        candidates = (
            root / "AAAAT.app" / "Contents" / "MacOS" / "AAAAT",
            root / "AAAAT",
            root / "aaaat-desktop",
        )
    else:
        candidates = (root / "aaaat-desktop", root / "AAAAT")
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return shutil.which("aaaat-desktop") or str(candidates[0])


def _launch_installed_desktop(storage: str) -> None:
    """Start the packaged desktop while keeping its workspace private."""
    subprocess.Popen(_desktop_launch_command(storage), close_fds=os.name != "nt")


def _result(request_id: Any, value: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": value}


def _error(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def _tool_result(request_id: Any, value: dict[str, Any]) -> dict[str, Any]:
    return _result(
        request_id,
        {
            "content": [{"type": "text", "text": json.dumps(value, ensure_ascii=False)}],
            "structuredContent": value,
            "isError": False,
        },
    )


def _connection_contract(storage: str) -> dict[str, Any]:
    status = dict(connection_status(storage))
    status["assistant_contract"] = ASSISTANT_CONTRACT
    return status


def _bridge_request(storage: str, connection: str, request: dict[str, Any]) -> dict[str, Any] | None:
    """Dispatch one request without widening paired-host authority."""
    request_id = request.get("id")
    method = request.get("method")
    if method == "notifications/initialized":
        return None
    if method == "initialize":
        return _result(
            request_id,
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": BRIDGE_SERVER_INFO,
                "instructions": (
                    "Verify this connection, read get_connection_status for the neutral AAAAT assistant contract, "
                    "then use only paired tools and complete bounded work items."
                ),
            },
        )
    if method == "ping":
        return _result(request_id, {})
    if method == "tools/list":
        return _result(request_id, {"tools": host_bridge_descriptor()["tools"]})
    if method in {"resources/list", "resources/read"}:
        return _error(request_id, -32601, "Method not found")
    if method != "tools/call":
        return _error(request_id, -32601, "Method not found")

    params = request.get("params")
    if not isinstance(params, dict):
        return _error(request_id, -32602, "Invalid params")
    name = params.get("name")
    if not isinstance(name, str) or name not in BRIDGE_TOOL_NAMES:
        return _error(request_id, -32601, "This bridge does not provide that tool.")
    arguments = params.get("arguments") or {}
    if not isinstance(arguments, dict):
        return _error(request_id, -32602, "Tool arguments must be an object")
    if name == "get_connection_status":
        if arguments:
            return _error(request_id, -32602, "get_connection_status does not accept arguments")
        return _tool_result(request_id, _connection_contract(storage))
    if name == "open_workspace":
        if arguments:
            return _error(request_id, -32602, "open_workspace does not accept arguments")
        _launch_installed_desktop(storage)
        return _tool_result(request_id, {"status": "opening"})
    if name in {"start_profile", "create_candidature"}:
        if name == "start_profile" and arguments:
            return _error(request_id, -32602, "start_profile does not accept arguments")
        payload = {} if name == "start_profile" else arguments.get("payload")
        if not isinstance(payload, dict):
            return _error(request_id, -32602, "create_candidature requires an object payload")
        provenance = {
            key: value
            for key, value in arguments.items()
            if key in {"agent_name", "agent_runtime", "model_provider"}
        }
        provenance["action"] = {"action": name, "payload": payload}
        return dispatch_mcp_request(
            storage,
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "tools/call",
                "params": {"name": "submit_agent_action", "arguments": provenance},
            },
        )
    return dispatch_mcp_request(storage, request)


def run_host_bridge(connection: str, input_stream: TextIO | None = None, output_stream: TextIO | None = None) -> int:
    """Run the limited paired-host surface after resolving a connection once."""
    storage = resolve_connection(connection)
    source = input_stream or sys.stdin
    target = output_stream or sys.stdout
    verified_methods: set[str] = set()
    verified = False
    for raw in source:
        line = raw.strip()
        if not line:
            continue
        request_id = None
        try:
            request = json.loads(line)
            if not isinstance(request, dict):
                raise ValueError("request must be an object")
            request_id = request.get("id")
            storage = resolve_connection(connection)
            method = request.get("method")
            if method == "tools/call" and not verified:
                response = _error(request_id, -32002, "Finish connection verification before requesting work.")
            else:
                response = _bridge_request(str(storage), connection, request)
            if response and "result" in response:
                if method in VERIFICATION_METHODS:
                    verified_methods.add(method)
                if VERIFICATION_METHODS <= verified_methods:
                    note_connection_verified(connection)
                    verified = True
        except HostConnectionError:
            response = _error(request_id, -32001, "Connection unavailable. Pair again from your host setup.")
        except (json.JSONDecodeError, ValueError):
            response = _error(None, -32700, "Invalid request.")
        except OSError:
            response = _error(request_id, -32603, "AAAAT could not open the local workspace.")
        if response is not None:
            target.write(json.dumps(response, ensure_ascii=False, separators=(",", ":")) + "\n")
            target.flush()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="aaaat-host-bridge", description="Run AAAAT's paired local bridge over stdio.")
    parser.add_argument("--connection", required=True, help="Host-held pairing capability")
    args = parser.parse_args(argv)
    try:
        return run_host_bridge(args.connection)
    except HostConnectionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
