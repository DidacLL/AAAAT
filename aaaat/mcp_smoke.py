"""Deterministic end-to-end smoke client for AAAAT's installed MCP server."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, TextIO

from .db import connect, init_db
from .tasks import create_task


def run_mcp_smoke(storage: str | Path, *, server_argv: list[str] | None = None) -> dict[str, Any]:
    """Exercise initialize, tools, one complete task lifecycle, and malformed input."""
    init_db(storage)
    with connect(storage) as conn:
        create_task(
            conn,
            "keyword_definition",
            "MCP smoke fixture",
            context_hint="keyword:MCP",
            idempotent=True,
        )

    argv = server_argv or _installed_server_argv(storage)
    process = subprocess.Popen(
        argv,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        bufsize=1,
    )
    if process.stdin is None or process.stdout is None:
        process.kill()
        raise RuntimeError("Could not open MCP stdio streams")
    try:
        initialized = _request(process.stdin, process.stdout, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
        listed = _request(process.stdin, process.stdout, {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
        claimed = _request(process.stdin, process.stdout, {
            "jsonrpc": "2.0", "id": 3, "method": "tools/call",
            "params": {"name": "get_next_agent_work", "arguments": {}},
        })
        work = _structured(claimed).get("work") or {}
        capability = str((work.get("task") or {}).get("task_capability") or "")
        if not capability:
            raise RuntimeError("MCP smoke fixture could not claim work")
        progressed = _request(process.stdin, process.stdout, {
            "jsonrpc": "2.0", "id": 4, "method": "tools/call",
            "params": {"name": "report_agent_task_progress", "arguments": {
                "task_capability": capability, "phase": "smoke", "message": "MCP smoke client", "percent": 50,
            }},
        })
        submitted = _request(process.stdin, process.stdout, {
            "jsonrpc": "2.0", "id": 5, "method": "tools/call",
            "params": {"name": "submit_agent_task_result", "arguments": {
                "task_capability": capability, "result_json": {"definition": "A deterministic local MCP smoke result."},
                "agent_name": "aaaat-mcp-smoke", "agent_runtime": "mcp-smoke-client",
            }},
        })
        process.stdin.write("{not-json}\n")
        process.stdin.flush()
        malformed = _read_response(process.stdout)
        if malformed.get("error", {}).get("code") != -32700:
            raise RuntimeError("MCP server did not return the expected parse error")
        return {
            "status": "passed",
            "initialize": bool(initialized.get("result")),
            "tool_count": len((listed.get("result") or {}).get("tools") or []),
            "claimed": bool(capability),
            "progressed": not bool(progressed.get("error")),
            "submitted": not bool(submitted.get("error")),
            "malformed_request": "rejected",
        }
    finally:
        process.stdin.close()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)
        process.stdout.close()
        if process.stderr is not None:
            process.stderr.close()


def _request(stream: TextIO, response_stream: TextIO, request: dict[str, Any]) -> dict[str, Any]:
    stream.write(json.dumps(request, ensure_ascii=False) + "\n")
    stream.flush()
    return _read_response(response_stream)


def _read_response(stream: TextIO) -> dict[str, Any]:
    line = stream.readline()
    if not line:
        raise RuntimeError("MCP server closed its output before responding")
    value = json.loads(line)
    if not isinstance(value, dict):
        raise RuntimeError("MCP server returned a non-object response")
    return value


def _structured(response: dict[str, Any]) -> dict[str, Any]:
    value = (response.get("result") or {}).get("structuredContent")
    if not isinstance(value, dict):
        raise RuntimeError(f"MCP tool call failed: {response.get('error') or response}")
    return value


def _installed_server_argv(storage: str | Path) -> list[str]:
    """Prefer the sibling installed console script; retain a module fallback for source tests."""

    suffix = ".exe" if os.name == "nt" else ""
    candidate = Path(sys.argv[0]).resolve().with_name(f"aaaat-mcp{suffix}")
    if candidate.is_file():
        return [str(candidate), "--storage", str(storage)]
    return [sys.executable, "-m", "aaaat.mcp_runtime", "--storage", str(storage)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run AAAAT's deterministic MCP stdio smoke client.")
    parser.add_argument("--storage", default=".private-mcp-smoke")
    parser.add_argument("--server-json", default="", help="Optional JSON argv for the MCP server process.")
    args = parser.parse_args(argv)
    server_argv: list[str] | None = None
    if args.server_json:
        value = json.loads(args.server_json)
        if not isinstance(value, list) or not value or any(not isinstance(item, str) or not item for item in value):
            raise SystemExit("--server-json must be a non-empty JSON string array")
        server_argv = value
    print(json.dumps(run_mcp_smoke(args.storage, server_argv=server_argv), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
