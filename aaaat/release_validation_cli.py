from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .release_validation import VERDICT_PASSED, ReleaseValidator, ValidationConfig


class ProviderNeutralReleaseValidator(ReleaseValidator):
    def _runtime_settings(self) -> tuple[str, dict[str, Any]]:
        if self.config.runtime == "llama-cpp":
            return "llama_cpp_server", {
                "endpoint": self.config.executable or "http://127.0.0.1:8080",
                "model": self.config.model or "local",
                "timeout_seconds": self.config.timeout_seconds,
            }
        return super()._runtime_settings()


def _json_string_array(value: str, option: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{option} must be valid JSON: {exc.msg}") from exc
    if not isinstance(parsed, list) or any(not isinstance(item, str) or not item for item in parsed):
        raise ValueError(f"{option} must be a non-empty JSON string array")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run AAAAT automated local release validation and collect evidence.")
    parser.add_argument("--storage", type=Path, default=Path(".private-release-validation"))
    parser.add_argument("--evidence-dir", type=Path, default=Path("release-evidence"))
    parser.add_argument("--runtime", choices=("deterministic", "llama-cpp", "custom"), default="deterministic")
    parser.add_argument("--endpoint", default="http://127.0.0.1:8080", help="Explicit loopback llama-server base URL.")
    parser.add_argument("--model", default="local", help="Model identifier sent to the configured llama-server.")
    parser.add_argument("--command-json", default="", help="JSON argv array for any custom local inference connector.")
    parser.add_argument("--timeout", dest="timeout_seconds", type=int, default=600)
    parser.add_argument("--keep-storage", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        command = _json_string_array(args.command_json, "--command-json") if args.command_json else []
    except ValueError as exc:
        parser.error(str(exc))
    config = ValidationConfig(
        storage=args.storage,
        evidence_dir=args.evidence_dir,
        runtime=args.runtime,
        model=args.model,
        executable=args.endpoint,
        command=command,
        timeout_seconds=args.timeout_seconds,
        keep_storage=args.keep_storage,
    )
    report = ProviderNeutralReleaseValidator(config).run()
    print(json.dumps({"automated_verdict": report["automated_verdict"], "release_verdict": report["release_verdict"], "report": str(args.evidence_dir / "release-report.json")}, indent=2))
    return 0 if report["automated_verdict"] == VERDICT_PASSED else 1


if __name__ == "__main__":
    raise SystemExit(main())
