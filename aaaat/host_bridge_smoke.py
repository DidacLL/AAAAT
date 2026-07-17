"""Deterministic installed-process smoke client for AAAAT's paired host bridge."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, TextIO

from .db import connect, init_db
from .host_connection import create_connection_request
from .tasks import create_task


def run_host_bridge_smoke(
    storage: str | Path,
    *,
    bridge_argv: list[str] | None = None,
    require_installed: bool = False,
) -> dict[str, Any]:
    """Exercise a paired bridge as a real stdio child process.

    The fixture owns only deterministic fake work. The launched bridge receives
    an opaque pairing capability and never a workspace argument.
    """

    init_db(storage)
    with connect(storage) as conn:
        create_task(
            conn,
            "keyword_definition",
            "Paired bridge smoke fixture",
            context_hint="keyword:paired bridge",
            idempotent=True,
        )
    request = create_connection_request(storage)
    connection = request["connection_capability"]
    argv = bridge_argv or _installed_bridge_argv(connection, require_installed=require_installed)
    process = subprocess.Popen(
        argv,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        bufsize=1,
    )
    if process.stdin is None or process.stdout is None or process.stderr is None:
        process.kill()
        raise RuntimeError("Could not open paired bridge stdio streams")
    try:
        initialized = _request(process.stdin, process.stdout, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
        listed = _request(process.stdin, process.stdout, {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
        pinged = _request(process.stdin, process.stdout, {"jsonrpc": "2.0", "id": 3, "method": "ping", "params": {}})
        claimed = _request(process.stdin, process.stdout, {
            "jsonrpc": "2.0", "id": 4, "method": "tools/call",
            "params": {"name": "get_next_agent_work", "arguments": {}},
        })
        work = _structured(claimed).get("work") or {}
        capability = str((work.get("task") or {}).get("task_capability") or "")
        if not capability:
            raise RuntimeError("Paired bridge smoke fixture could not claim work")
        progressed = _request(process.stdin, process.stdout, {
            "jsonrpc": "2.0", "id": 5, "method": "tools/call",
            "params": {"name": "report_agent_task_progress", "arguments": {
                "task_capability": capability, "phase": "working", "message": "Paired bridge smoke client", "percent": 50,
            }},
        })
        submitted = _request(process.stdin, process.stdout, {
            "jsonrpc": "2.0", "id": 6, "method": "tools/call",
            "params": {"name": "submit_agent_task_result", "arguments": {
                "task_capability": capability,
                "result_json": {"definition": "A deterministic paired bridge smoke result."},
                "agent_name": "aaaat-host-bridge-smoke",
                "agent_runtime": "paired-bridge-smoke-client",
            }},
        })
        acknowledgement = _structured(submitted).get("acknowledgement")
        expected = {
            "status": "accepted",
            "state": "completed",
            "released_work": 0,
            "next": ["continue_or_open_desktop"],
        }
        if acknowledgement != expected:
            raise RuntimeError("Paired bridge returned an unsafe or unexpected result acknowledgement")
        process.stdin.write("{not-json}\n")
        process.stdin.flush()
        malformed = _read_response(process.stdout)
        if malformed.get("error", {}).get("code") != -32700:
            raise RuntimeError("Paired bridge did not return the expected parse error")
        return {
            "status": "passed",
            "initialize": bool(initialized.get("result")),
            "tool_count": len((listed.get("result") or {}).get("tools") or []),
            "ping": not bool(pinged.get("error")),
            "claimed": bool(capability),
            "progressed": not bool(progressed.get("error")),
            "submitted": not bool(submitted.get("error")),
            "safe_acknowledgement": True,
            "malformed_request": "rejected",
            "installed_bridge": require_installed,
        }
    finally:
        process.stdin.close()
        try:
            return_code = process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            return_code = process.wait(timeout=10)
        stderr = process.stderr.read()
        process.stdout.close()
        process.stderr.close()
        if return_code:
            raise RuntimeError(f"Paired bridge exited with status {return_code}: {stderr.strip()[:500]}")


def _request(stream: TextIO, response_stream: TextIO, request: dict[str, Any]) -> dict[str, Any]:
    stream.write(json.dumps(request, ensure_ascii=False) + "\n")
    stream.flush()
    return _read_response(response_stream)


def _read_response(stream: TextIO) -> dict[str, Any]:
    line = stream.readline()
    if not line:
        raise RuntimeError("Paired bridge closed its output before responding")
    value = json.loads(line)
    if not isinstance(value, dict):
        raise RuntimeError("Paired bridge returned a non-object response")
    return value


def _structured(response: dict[str, Any]) -> dict[str, Any]:
    value = (response.get("result") or {}).get("structuredContent")
    if not isinstance(value, dict):
        raise RuntimeError(f"Paired bridge tool call failed: {response.get('error') or response}")
    return value


def _installed_bridge_argv(connection: str, *, require_installed: bool = False) -> list[str]:
    """Prefer a sibling installed console script; retain a source-test fallback."""

    suffix = ".exe" if os.name == "nt" else ""
    candidate = Path(sys.argv[0]).resolve().with_name(f"aaaat-host-bridge{suffix}")
    if candidate.is_file():
        return [str(candidate), "--connection", connection]
    if require_installed:
        raise RuntimeError("Installed aaaat-host-bridge console command is unavailable")
    return [sys.executable, "-m", "aaaat.host_bridge", "--connection", connection]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run AAAAT's deterministic paired-bridge stdio smoke client.")
    parser.add_argument("--storage", default=".private-host-bridge-smoke")
    parser.add_argument("--bridge-json", default="", help="Optional JSON argv for the paired bridge process.")
    parser.add_argument("--require-installed", action="store_true", help="Fail unless the sibling installed bridge console command is used.")
    args = parser.parse_args(argv)
    bridge_argv: list[str] | None = None
    if args.bridge_json:
        value = json.loads(args.bridge_json)
        if not isinstance(value, list) or not value or any(not isinstance(item, str) or not item for item in value):
            raise SystemExit("--bridge-json must be a non-empty JSON string array")
        bridge_argv = value
    print(json.dumps(run_host_bridge_smoke(args.storage, bridge_argv=bridge_argv, require_installed=args.require_installed), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
