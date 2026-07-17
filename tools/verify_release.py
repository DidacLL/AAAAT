"""Verify a packaged AAAAT release on the operating system that built it."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

from aaaat.host_connection import create_connection


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
EXPECTED_TOOLS = {
    "get_connection_status",
    "open_workspace",
    "start_profile",
    "create_candidature",
    "get_next_agent_work",
    "report_agent_task_progress",
    "submit_agent_task_result",
}


def _release_root() -> Path:
    candidates = sorted(path for path in DIST.glob("AAAAT-*") if path.is_dir())
    if len(candidates) != 1:
        raise RuntimeError(f"Expected one packaged release directory, found {len(candidates)}")
    return candidates[0]


def _executables(release_root: Path) -> tuple[Path, Path]:
    if sys.platform.startswith("win"):
        return release_root / "AAAAT.exe", release_root / "bridge" / "aaaat-host-bridge.exe"
    if sys.platform == "darwin":
        return (
            release_root / "AAAAT.app" / "Contents" / "MacOS" / "AAAAT",
            release_root / "bridge" / "aaaat-host-bridge",
        )
    return release_root / "AAAAT", release_root / "bridge" / "aaaat-host-bridge"


def _verify_package_boundary(release_root: Path) -> None:
    required = (release_root / "README.txt", release_root / "AAAAT User Guide.md", release_root / "bridge")
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise RuntimeError("Missing packaged files: " + ", ".join(missing))

    forbidden_top_level = {
        ".git",
        ".private",
        "AGENTS.md",
        "pyproject.toml",
        "tests",
        "tools",
        "work",
    }
    leaked = sorted(path.name for path in release_root.iterdir() if path.name in forbidden_top_level)
    if leaked:
        raise RuntimeError("Development or private files entered the release: " + ", ".join(leaked))


def _verify_checksum(release_root: Path) -> Path:
    archive = release_root.with_suffix(".zip")
    checksum = archive.with_suffix(archive.suffix + ".sha256")
    if not archive.is_file() or not checksum.is_file():
        raise RuntimeError("Release archive or checksum is missing")
    expected = checksum.read_text(encoding="utf-8").split()[0]
    actual = hashlib.sha256(archive.read_bytes()).hexdigest()
    if actual != expected:
        raise RuntimeError("Release checksum does not match the archive")
    return archive


def _extract_verified_archive(archive: Path, target: Path) -> Path:
    expected_root = archive.stem
    with zipfile.ZipFile(archive) as package:
        members = package.infolist()
        if not members:
            raise RuntimeError("Release archive is empty")
        for member in members:
            path = PurePosixPath(member.filename)
            if path.is_absolute() or ".." in path.parts or not path.parts or path.parts[0] != expected_root:
                raise RuntimeError("Release archive contains an unsafe or unexpected path")
        package.extractall(target)
        if os.name != "nt":
            for member in members:
                mode = (member.external_attr >> 16) & 0o777
                if not mode:
                    continue
                extracted_path = target.joinpath(*PurePosixPath(member.filename).parts)
                if extracted_path.exists():
                    extracted_path.chmod(mode)
    extracted = target / expected_root
    if not extracted.is_dir():
        raise RuntimeError("Release archive did not contain the expected application folder")
    return extracted


def _verify_executables(release_root: Path) -> tuple[Path, Path]:
    desktop, bridge = _executables(release_root)
    if not desktop.is_file() or not bridge.is_file():
        raise RuntimeError("Packaged desktop or paired bridge executable is missing")
    if os.name != "nt" and (not os.access(desktop, os.X_OK) or not os.access(bridge, os.X_OK)):
        raise RuntimeError("Release archive did not preserve executable permissions")
    return desktop, bridge


def _run_desktop_startup_check(desktop: Path, environment: dict[str, str]) -> None:
    completed = subprocess.run(
        [str(desktop), "--startup-check"],
        env=environment,
        capture_output=True,
        text=True,
        timeout=90,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError("Packaged desktop startup check failed\n" + completed.stdout + completed.stderr)


def _create_isolated_connection(workspace: Path, registry: str) -> dict[str, str]:
    previous = os.environ.get("AAAAT_CONNECTION_REGISTRY")
    os.environ["AAAAT_CONNECTION_REGISTRY"] = registry
    try:
        return create_connection(workspace)
    finally:
        if previous is None:
            os.environ.pop("AAAAT_CONNECTION_REGISTRY", None)
        else:
            os.environ["AAAAT_CONNECTION_REGISTRY"] = previous


def _run_bridge_check(bridge: Path, environment: dict[str, str], temporary: Path) -> None:
    workspace = temporary / "workspace"
    pairing = _create_isolated_connection(workspace, environment["AAAAT_CONNECTION_REGISTRY"])
    requests = (
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
        {"jsonrpc": "2.0", "id": 3, "method": "ping", "params": {}},
    )
    completed = subprocess.run(
        [str(bridge), "--connection", pairing["connection_capability"]],
        input="\n".join(json.dumps(request) for request in requests) + "\n",
        env=environment,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError("Packaged bridge verification failed\n" + completed.stdout + completed.stderr)

    responses = [json.loads(line) for line in completed.stdout.splitlines() if line.strip()]
    if len(responses) != 3:
        raise RuntimeError("Packaged bridge returned an incomplete handshake")
    if responses[0].get("result", {}).get("serverInfo", {}).get("name") != "aaaat-host-bridge":
        raise RuntimeError("Packaged bridge did not initialize as AAAAT")
    tools = {tool["name"] for tool in responses[1].get("result", {}).get("tools", [])}
    if tools != EXPECTED_TOOLS:
        raise RuntimeError("Packaged bridge exposed an unexpected tool catalogue")

    serialized = completed.stdout + completed.stderr
    if str(workspace) in serialized or environment["AAAAT_CONNECTION_REGISTRY"] in serialized:
        raise RuntimeError("Packaged bridge exposed a private local path")


def verify_release() -> None:
    built_root = _release_root()
    _verify_package_boundary(built_root)
    archive = _verify_checksum(built_root)

    with tempfile.TemporaryDirectory(prefix="aaaat-release-verification-") as temporary_name:
        temporary = Path(temporary_name)
        release_root = _extract_verified_archive(archive, temporary / "extracted-package")
        _verify_package_boundary(release_root)
        desktop, bridge = _verify_executables(release_root)

        environment = os.environ.copy()
        environment["AAAAT_APP_CONFIG_DIR"] = str(temporary / "app-config")
        environment["AAAAT_CONNECTION_REGISTRY"] = str(temporary / "connections.json")
        _run_desktop_startup_check(desktop, environment)
        _run_bridge_check(bridge, environment, temporary)


if __name__ == "__main__":
    try:
        verify_release()
    except (OSError, RuntimeError, subprocess.SubprocessError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc
    print("AAAAT release verification passed")
