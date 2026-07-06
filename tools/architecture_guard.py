"""AAAAT CI architecture guard.

This script checks durable project invariants only. It deliberately avoids
asserting exact dashboard wording, CSS, fake company names, branch names, or
other trivial implementation details.
"""

from __future__ import annotations

import ast
import subprocess
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_PACKAGE = ROOT / "aaat"
PYPROJECT = ROOT / "pyproject.toml"

BANNED_RUNTIME_IMPORT_PREFIXES = (
    "anthropic",
    "azure",
    "boto3",
    "botocore",
    "django",
    "fastapi",
    "flask",
    "google.genai",
    "google.generativeai",
    "httpx",
    "openai",
    "requests",
    "starlette",
    "uvicorn",
)

BANNED_FRONTEND_OR_LOCK_FILES = {
    "bun.lockb",
    "next.config.js",
    "package-lock.json",
    "package.json",
    "pnpm-lock.yaml",
    "vite.config.js",
    "yarn.lock",
}

BANNED_PRIVATE_DATA_SUFFIXES = {
    ".db",
    ".sqlite",
    ".sqlite3",
}

BANNED_PRIVATE_PATH_PARTS = {
    ".private",
}

BANNED_RUNTIME_TEXT = (
    "gitpython",
    "git.exe",
)

SKIPPED_FALLBACK_DIRS = {
    ".git",
    ".mypy_cache",
    ".pytest_cache",
    "__pycache__",
}


def fail(message: str) -> None:
    print(f"architecture guard failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def dotted_name_is_banned(name: str) -> bool:
    return any(name == banned or name.startswith(f"{banned}.") for banned in BANNED_RUNTIME_IMPORT_PREFIXES)


def repo_files() -> list[Path]:
    """Return tracked repository files, falling back to a hidden-dir-safe walk.

    The guard is a CI/development tool, not AAAAT runtime code. Using Git here
    prevents false positives from checkout internals such as `.git/` while the
    product itself remains free of any runtime Git dependency.
    """

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

    files = []
    for line in result.stdout.splitlines():
        if line.strip():
            files.append(ROOT / line.strip())
    return sorted(files)


def runtime_python_files() -> list[Path]:
    if not RUNTIME_PACKAGE.exists():
        fail("runtime package directory aaat/ is missing")
    return sorted(path for path in repo_files() if path.suffix == ".py" and RUNTIME_PACKAGE in path.parents)


def check_pyproject_has_no_runtime_dependencies() -> None:
    if not PYPROJECT.exists():
        fail("pyproject.toml is missing")
    project = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))
    dependencies = project.get("project", {}).get("dependencies", [])
    if dependencies:
        fail(f"pyproject.toml declares runtime dependencies: {dependencies!r}")


def check_runtime_imports() -> None:
    banned_hits: list[str] = []
    for path in runtime_python_files():
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if dotted_name_is_banned(alias.name):
                        banned_hits.append(f"{path.relative_to(ROOT)} imports {alias.name}")
            elif isinstance(node, ast.ImportFrom) and node.module:
                if dotted_name_is_banned(node.module):
                    banned_hits.append(f"{path.relative_to(ROOT)} imports from {node.module}")
    if banned_hits:
        fail("banned provider/framework/network imports found: " + "; ".join(banned_hits))


def check_no_runtime_git_binding() -> None:
    hits: list[str] = []
    for path in runtime_python_files():
        source = path.read_text(encoding="utf-8").lower()
        if any(pattern in source for pattern in BANNED_RUNTIME_TEXT):
            hits.append(str(path.relative_to(ROOT)))
        # Treat literal shell-style git execution in runtime code as coupling,
        # but do not fail documentation or ordinary words such as "digital".
        if '"git ' in source or "'git " in source:
            hits.append(str(path.relative_to(ROOT)))
    if hits:
        fail("runtime package appears to bind to Git: " + ", ".join(sorted(set(hits))))


def check_no_frontend_or_lock_files() -> None:
    hits = sorted(
        str(path.relative_to(ROOT))
        for path in repo_files()
        if path.name in BANNED_FRONTEND_OR_LOCK_FILES
    )
    if hits:
        fail("frontend framework/package lock files are out of MVP scope: " + ", ".join(hits))


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
    check_pyproject_has_no_runtime_dependencies()
    check_runtime_imports()
    check_no_runtime_git_binding()
    check_no_frontend_or_lock_files()
    check_no_private_storage_committed()
    print("architecture guard: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
