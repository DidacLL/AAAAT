from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, TextIO

from .agent_actions import submit_agent_action
from .agent_work import claim_next_agent_work, report_agent_task_progress
from .db import connect, init_db
from .mcp_server import PROTOCOL_VERSION, mcp_descriptor
from .result_ingestion import ingest_task_result

SERVER_INFO = {"name": "aaaat", "version": "1.0.0"}


def dispatch_mcp_request(storage: str | Path, request: dict[str, Any]) -> dict[str, Any] | None:
    if request.get("jsonrpc") != "2.0" or not isinstance(request.get("method"), str):
        return _error(request.get("id"), -32600, "Invalid Request")
    request_id = request.get("id")
    method = str(request["method"])
    params = request.get("params") or {}
    if not isinstance(params, dict):
        return _error(request_id, -32602, "Invalid params")
    if method == "notifications/initialized":
        return None
    try:
        if method == "initialize":
            return _result(request_id, {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {"tools": {"listChanged": False}, "resources": {"subscribe": False, "listChanged": False}},
                "serverInfo": SERVER_INFO,
                "instructions": "Use get_next_agent_work to atomically claim one complete bounded work item. Use only its random task capability for progress and result callbacks.",
            })
        if method == "ping":
            return _result(request_id, {})
        if method == "tools/list":
            return _result(request_id, {"tools": mcp_descriptor()["tools"]})
        if method == "resources/list":
            return _result(request_id, {"resources": mcp_descriptor()["resources"]})
        if method == "resources/read":
            uri = str(params.get("uri") or "")
            if uri != "aaaat://agent-guide":
                return _error(request_id, -32602, "Unknown resource")
            return _result(request_id, {"contents": [{"uri": uri, "mimeType": "text/markdown", "text": _agent_guide()}]})
        if method == "tools/call":
            name = str(params.get("name") or "")
            arguments = params.get("arguments") or {}
            if not isinstance(arguments, dict):
                return _error(request_id, -32602, "Tool arguments must be an object")
            value = _call_tool(storage, name, arguments)
            return _result(request_id, {
                "content": [{"type": "text", "text": json.dumps(value, ensure_ascii=False)}],
                "structuredContent": value,
                "isError": False,
            })
    except (KeyError, TypeError, ValueError) as exc:
        return _result(request_id, {
            "content": [{"type": "text", "text": str(exc)[:2000]}],
            "isError": True,
        })
    except Exception as exc:
        return _error(request_id, -32603, "Internal error", str(exc)[:2000])
    return _error(request_id, -32601, "Method not found")


def _call_tool(storage: str | Path, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    init_db(storage)
    with connect(storage) as conn:
        if name == "get_next_agent_work":
            work = claim_next_agent_work(conn)
            return {"status": "empty"} if work is None else {"status": "ready", "work": work}
        if name == "report_agent_task_progress":
            return report_agent_task_progress(
                conn,
                str(arguments.get("task_capability") or ""),
                phase=str(arguments.get("phase") or ""),
                message=str(arguments.get("message") or ""),
                percent=arguments.get("percent"),
            )
        if name == "submit_agent_task_result":
            result = arguments.get("result_json")
            if not isinstance(result, dict):
                raise ValueError("result_json must be an object")
            acknowledgement = ingest_task_result(
                conn,
                str(arguments.get("task_capability") or ""),
                result,
                provenance={
                    "agent_name": str(arguments.get("agent_name") or "mcp-host"),
                    "agent_runtime": str(arguments.get("agent_runtime") or "mcp-stdio"),
                    "model_provider": str(arguments.get("model_provider") or ""),
                },
            )
            return {"status": "accepted", "acknowledgement": acknowledgement}
        if name == "submit_agent_action":
            action = arguments.get("action")
            if not isinstance(action, dict):
                raise ValueError("action must be an object")
            return submit_agent_action(
                conn,
                action,
                agent_name=str(arguments.get("agent_name") or "mcp-host"),
                agent_runtime=str(arguments.get("agent_runtime") or "mcp-stdio"),
                model_provider=str(arguments.get("model_provider") or ""),
                storage_path=str(storage),
            )
    raise ValueError(f"Unknown tool: {name}")


def run_stdio_server(storage: str | Path, input_stream: TextIO | None = None, output_stream: TextIO | None = None) -> int:
    source = input_stream or sys.stdin
    target = output_stream or sys.stdout
    for raw in source:
        line = raw.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            if not isinstance(request, dict):
                raise ValueError("request must be an object")
            response = dispatch_mcp_request(storage, request)
        except (json.JSONDecodeError, ValueError) as exc:
            response = _error(None, -32700, "Parse error", str(exc)[:1000])
        if response is not None:
            target.write(json.dumps(response, ensure_ascii=False, separators=(",", ":")) + "\n")
            target.flush()
    return 0


def _agent_guide() -> str:
    return """# AAAAT bounded MCP

1. Call `get_next_agent_work` once to atomically claim one complete work item.
2. Use only the included purpose-scoped context and response schema.
3. Report optional progress with the random `task_capability`.
4. Submit one structured result with the same capability.
5. Never request internal IDs, database access, broad searches, or artifact paths.
"""


def _result(request_id: Any, value: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": value}


def _error(request_id: Any, code: int, message: str, data: str | None = None) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if data:
        error["data"] = data
    return {"jsonrpc": "2.0", "id": request_id, "error": error}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="aaaat-mcp", description="Run AAAAT's bounded MCP server over stdio.")
    parser.add_argument("--storage", default=".private")
    args = parser.parse_args(argv)
    return run_stdio_server(args.storage)


if __name__ == "__main__":
    raise SystemExit(main())
