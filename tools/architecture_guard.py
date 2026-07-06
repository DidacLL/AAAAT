"""AAAAT CI contract guard.

This script checks only durable repository invariants that are awkward to
express through compilation or the unittest suite.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_PACKAGE = ROOT / "aaaat"

BANNED_PRIVATE_DATA_SUFFIXES = {
    ".db",
    ".sqlite",
    ".sqlite3",
}

BANNED_PRIVATE_PATH_PARTS = {
    ".private",
}

SKIPPED_FALLBACK_DIRS = {
    ".git",
    ".mypy_cache",
    ".private",
    ".pytest_cache",
    "__pycache__",
}


def fail(message: str) -> None:
    print(f"contract guard failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def repo_files() -> list[Path]:
    """Return tracked files, falling back to a hidden-dir-safe walk."""

    try:
        result = subprocess.run(
            ["git", "ls-files"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        files: list[Path] = []
        for path in ROOT.rglob("*"):
            if not path.is_file():
                continue
            relative = path.relative_to(ROOT)
            if any(part in SKIPPED_FALLBACK_DIRS for part in relative.parts):
                continue
            files.append(path)
        return sorted(files)

    return sorted(ROOT / line.strip() for line in result.stdout.splitlines() if line.strip())


def check_package_exists() -> None:
    if not RUNTIME_PACKAGE.is_dir():
        fail("runtime package directory aaaat/ is missing")
    if not (RUNTIME_PACKAGE / "__init__.py").is_file():
        fail("runtime package aaaat/__init__.py is missing")


def check_no_private_storage_committed() -> None:
    hits: list[str] = []
    for path in repo_files():
        relative = path.relative_to(ROOT)
        if any(part in BANNED_PRIVATE_PATH_PARTS for part in relative.parts):
            hits.append(str(relative))
        elif path.suffix.lower() in BANNED_PRIVATE_DATA_SUFFIXES:
            hits.append(str(relative))
    if hits:
        fail("private database/storage artifacts appear committed: " + ", ".join(sorted(hits)))


def main() -> int:
    check_package_exists()
    check_no_private_storage_committed()
    print("contract guard: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
