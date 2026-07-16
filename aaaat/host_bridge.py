"""Opaque stdio entry point for a paired connected-LLM host."""

from __future__ import annotations

import argparse
import sys
from typing import TextIO

from .host_connection import HostConnectionError, note_connection_verified, resolve_connection
from .mcp_runtime import dispatch_mcp_request


VERIFICATION_METHODS = {"initialize", "tools/list", "ping"}


def run_host_bridge(connection: str, input_stream: TextIO | None = None, output_stream: TextIO | None = None) -> int:
    """Run the normal MCP surface after resolving a paired workspace once.

    The bridge intentionally accepts no storage argument.  It does not add
    tools or alter dispatch: every operational request is handled by the
    canonical MCP services.
    """

    storage = resolve_connection(connection)
    source = input_stream or sys.stdin
    target = output_stream or sys.stdout
    verified_methods: set[str] = set()
    verified = False
    for raw in source:
        line = raw.strip()
        if not line:
            continue
        from json import JSONDecodeError, dumps, loads

        request_id = None
        try:
            request = loads(line)
            if not isinstance(request, dict):
                raise ValueError("request must be an object")
            request_id = request.get("id")
            # Re-check before every operation so revocation takes effect even
            # while a long-lived stdio process remains open.
            storage = resolve_connection(connection)
            method = request.get("method")
            if method == "tools/call" and not verified:
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32002,
                        "message": "Finish connection verification before requesting work.",
                    },
                }
            else:
                response = dispatch_mcp_request(storage, request)
            if response and "result" in response:
                if method in VERIFICATION_METHODS:
                    verified_methods.add(method)
                if VERIFICATION_METHODS <= verified_methods:
                    # The bridge is considered connected only after the full
                    # setup handshake. Later successful activity refreshes it.
                    note_connection_verified(connection)
                    verified = True
        except HostConnectionError:
            response = {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32001, "message": "Connection unavailable. Pair again from your host setup."}}
        except (JSONDecodeError, ValueError):
            response = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Invalid request."}}
        if response is not None:
            target.write(dumps(response, ensure_ascii=False, separators=(",", ":")) + "\n")
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
