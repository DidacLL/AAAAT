from __future__ import annotations

import argparse
import json
import os
from typing import Mapping

from .db import init_db
from .llm_runtime import LlmRuntimeConfig, execute_task_with_provider


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="aaaat-llm")
    parser.add_argument("--storage", default=".private")
    parser.add_argument("--provider", default=None)
    parser.add_argument("--model", default=None)
    parser.add_argument("--base-url", default=None)
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--timeout-seconds", type=float, default=None)
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run")
    run.add_argument("task_handle")
    return parser


def config_from_args(args: argparse.Namespace, environ: Mapping[str, str] | None = None) -> LlmRuntimeConfig:
    env = dict(environ or os.environ)
    overrides = {
        "AAAAT_LLM_PROVIDER": args.provider,
        "AAAAT_LLM_MODEL": args.model,
        "AAAAT_LLM_BASE_URL": args.base_url,
        "AAAAT_LLM_API_KEY": args.api_key,
        "AAAAT_LLM_TIMEOUT_SECONDS": str(args.timeout_seconds) if args.timeout_seconds is not None else None,
    }
    env.update({key: value for key, value in overrides.items() if value is not None})
    return LlmRuntimeConfig.from_env(env)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    init_db(args.storage)
    if args.command == "run":
        result = execute_task_with_provider(
            args.storage,
            args.task_handle,
            config=config_from_args(args),
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    raise ValueError(f"Unsupported LLM command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
