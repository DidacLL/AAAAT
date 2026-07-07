from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN_TRACKED_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("private local storage", re.compile(r"(^|/)\.private(/|$)")),
    ("sqlite database", re.compile(r"\.(sqlite|sqlite3|db)$", re.IGNORECASE)),
    ("python cache directory", re.compile(r"(^|/)__pycache__(/|$)")),
    ("python bytecode", re.compile(r"\.py[co]$", re.IGNORECASE)),
)

REQUIRED_GITIGNORE_LINES = {
    ".private/",
    ".private/**",
    "*.sqlite",
    "*.sqlite3",
    "*.db",
    "__pycache__/",
    "*.py[cod]",
}


def tracked_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git ls-files failed")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def forbidden_tracked(files: list[str]) -> list[str]:
    findings: list[str] = []
    for path in files:
        normalized = path.replace(os.sep, "/")
        for reason, pattern in FORBIDDEN_TRACKED_PATTERNS:
            if pattern.search(normalized):
                findings.append(f"{path} :: {reason}")
                break
    return findings


def missing_gitignore_rules() -> list[str]:
    gitignore = ROOT / ".gitignore"
    if not gitignore.exists():
        return sorted(REQUIRED_GITIGNORE_LINES)
    present = {line.strip() for line in gitignore.read_text(encoding="utf-8").splitlines()}
    return sorted(REQUIRED_GITIGNORE_LINES - present)


def direct_main_write_risk() -> list[str]:
    findings: list[str] = []
    event_name = os.environ.get("GITHUB_EVENT_NAME", "")
    ref_name = os.environ.get("GITHUB_REF_NAME", "")
    if event_name == "push" and ref_name == "main":
        findings.append(
            "CI is running after a direct push to main. Configure branch protection so main requires PRs and required check 'contract'."
        )
    return findings


def run(ci: bool = False) -> int:
    findings: list[str] = []

    bad = forbidden_tracked(tracked_files())
    if bad:
        findings.append("Forbidden tracked files:")
        findings.extend(f"  - {item}" for item in bad)

    missing = missing_gitignore_rules()
    if missing:
        findings.append("Missing required .gitignore rules:")
        findings.extend(f"  - {item}" for item in missing)

    if ci:
        risk = direct_main_write_risk()
        if risk:
            findings.append("Branch protection warning:")
            findings.extend(f"  - {item}" for item in risk)

    if findings:
        print("Repository guard failed:")
        print("\n".join(findings))
        return 1

    print("Repository guard passed")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check AAAAT repository hygiene invariants.")
    parser.add_argument("--ci", action="store_true", help="Enable CI-only checks.")
    args = parser.parse_args(argv)
    return run(ci=args.ci)


if __name__ == "__main__":
    raise SystemExit(main())
