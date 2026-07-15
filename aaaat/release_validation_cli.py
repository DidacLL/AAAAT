from __future__ import annotations

import argparse
import json
from pathlib import Path

from .release_validation import (
    VERDICT_PASSED,
    ReleaseValidator,
    ValidationConfig,
)


def _json_string_array(value: str, option: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{option} must be valid JSON: {exc.msg}") from exc
    if not isinstance(parsed, list) or any(not isinstance(item, str) or not item for item in parsed):
        raise ValueError(f"{option} must be a non-empty JSON string array")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run AAAAT automated local release validation and collect evidence."
    )
    parser.add_argument("--storage", type=Path, default=Path(".private-release-validation"))
    parser.add_argument("--evidence-dir", type=Path, default=Path("release-evidence"))
    parser.add_argument(
        "--runtime",
        choices=("deterministic", "llama-cpp", "custom"),
        default="deterministic",
        help="Validation transport. llama-cpp is a reference local runtime; custom is the provider-neutral command contract.",
    )
    parser.add_argument("--model-path", default="", help="GGUF model path for the llama-cpp reference profile.")
    parser.add_argument("--executable", default="", help="Executable path for the llama-cpp reference profile.")
    parser.add_argument(
        "--runtime-arg",
        "--arg",
        dest="runtime_args",
        action="append",
        default=[],
        help="One additional runtime argument. Use --runtime-arg=--flag when the value begins with a dash.",
    )
    parser.add_argument(
        "--runtime-args-json",
        default="",
        help="Optional JSON array of additional runtime arguments. Repeatable --runtime-arg is safer in PowerShell.",
    )
    parser.add_argument(
        "--command-json",
        default="",
        help="JSON argv array for any custom local inference connector.",
    )
    parser.add_argument("--timeout", dest="timeout_seconds", type=int, default=600)
    parser.add_argument("--keep-storage", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        command = _json_string_array(args.command_json, "--command-json") if args.command_json else []
        runtime_args = list(args.runtime_args)
        if args.runtime_args_json:
            runtime_args.extend(_json_string_array(args.runtime_args_json, "--runtime-args-json"))
    except ValueError as exc:
        parser.error(str(exc))

    config = ValidationConfig(
        storage=args.storage,
        evidence_dir=args.evidence_dir,
        runtime=args.runtime,
        model_path=args.model_path,
        executable=args.executable,
        args=runtime_args,
        command=command,
        timeout_seconds=args.timeout_seconds,
        keep_storage=args.keep_storage,
    )
    report = ReleaseValidator(config).run()
    print(
        json.dumps(
            {
                "automated_verdict": report["automated_verdict"],
                "release_verdict": report["release_verdict"],
                "report": str(args.evidence_dir / "release-report.json"),
            },
            indent=2,
        )
    )
    return 0 if report["automated_verdict"] == VERDICT_PASSED else 1


if __name__ == "__main__":
    raise SystemExit(main())
