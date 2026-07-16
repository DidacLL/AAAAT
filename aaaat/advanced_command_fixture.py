"""Deterministic external-command fixture for local Advanced integration checks."""

from __future__ import annotations

import argparse
import json
import sys
import time


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Emit deterministic Advanced-command fixture responses.")
    parser.add_argument("--mode", choices=("success", "timeout", "nonzero", "empty", "malformed-json", "wrong-schema"), default="success")
    parser.add_argument("--sleep-seconds", type=float, default=2.0)
    args = parser.parse_args(argv)
    # Consume exactly one bounded work item, without inspecting any local state.
    try:
        work = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("Fixture expected one JSON work item on stdin", file=sys.stderr)
        return 2
    if args.mode == "timeout":
        time.sleep(max(0.0, args.sleep_seconds))
        return 0
    if args.mode == "nonzero":
        print("Fixture requested a nonzero exit", file=sys.stderr)
        return 7
    if args.mode == "empty":
        return 0
    if args.mode == "malformed-json":
        print("not valid JSON")
        return 0
    if args.mode == "wrong-schema":
        print(json.dumps({"unsupported_fixture_result": True}))
        return 0
    task_type = str((work.get("task") or {}).get("task_type") or "") if isinstance(work, dict) else ""
    result = {"definition": "A deterministic keyword definition."} if task_type == "keyword_definition" else {"fields": {}}
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
