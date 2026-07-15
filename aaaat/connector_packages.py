from __future__ import annotations

import hashlib
import json
import re
import shutil
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

from .workspace_config import storage_directory

PACKAGE_PROTOCOL = "aaaat.connector-package"
PACKAGE_VERSION = 2
_MAX_FILES = 12
_MAX_FILE_BYTES = 200_000
_ALLOWED_SUFFIXES = {".py", ".sh", ".cmd", ".ps1", ".json", ".md", ".txt", ".toml", ".yaml", ".yml"}
_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$")
_WRAPPER_KINDS = {"mcp", "cli", "http", "files", "browser", "custom"}
_ALLOWED_OPERATIONS = {
    "next_task",
    "task_context",
    "report_progress",
    "submit_result",
    "submit_action",
    "cancel_task",
}


def connector_construction_prompt(_adapter_id: str = "manual_external_agent", _settings: dict[str, Any] | None = None) -> str:
    contract = {
        "package_protocol": PACKAGE_PROTOCOL,
        "package_version": PACKAGE_VERSION,
        "purpose": "Configure the external AI or agent host to consume AAAAT's existing bounded queue.",
        "required_manifest": {
            "name": "short safe connector name",
            "wrapper_kind": "mcp | cli | http | files | browser | custom",
            "operations": ["next_task", "task_context", "report_progress", "submit_result"],
            "credential_ownership": "external-host",
            "description": "plain-language setup and communication description",
            "setup_entrypoint": "optional relative documentation or host-side configuration file",
        },
        "files": "mapping of relative file paths to UTF-8 host-side setup text or code",
        "existing_bounded_operations": {
            "next_task": "obtain one eligible opaque task",
            "task_context": "obtain purpose-scoped context for one opaque task handle",
            "report_progress": "report task-scoped progress",
            "submit_result": "submit one structured result through canonical validation",
            "submit_action": "submit one explicitly permitted bounded action",
            "cancel_task": "cancel one supported task attempt",
        },
        "restrictions": [
            "The external host initiates communication with AAAAT.",
            "Do not make AAAAT launch this package or call an LLM.",
            "Wrap existing AAAAT bounded commands or MCP tools; do not implement another queue or domain pipeline.",
            "Do not embed credentials, tokens, provider keys, private user data, database paths, or internal IDs.",
            "Do not expose broad listing, arbitrary search, database access, unrestricted filesystem access, or mutation by internal IDs.",
            "Provider-facing SDK, HTTP, browser, command, or model interaction remains owned by the external host.",
            "Return setup files and instructions only; installation by AAAAT stores them disabled and never executes them.",
        ],
    }
    return (
        "Create one minimal provider-neutral host-side wrapper package for AAAAT. "
        "Return only one JSON object matching this contract.\n\n"
        + json.dumps(contract, ensure_ascii=False, indent=2)
    )


def parse_connector_package(payload: str | dict[str, Any]) -> dict[str, Any]:
    value = json.loads(payload) if isinstance(payload, str) else payload
    if not isinstance(value, dict):
        raise ValueError("Connector package must be one JSON object")
    if value.get("protocol") not in {None, PACKAGE_PROTOCOL}:
        raise ValueError("Unsupported connector package protocol")
    manifest = value.get("manifest")
    files = value.get("files")
    if not isinstance(manifest, dict) or not isinstance(files, dict):
        raise ValueError("Connector package requires manifest and files objects")

    name = str(manifest.get("name") or "").strip()
    wrapper_kind = str(manifest.get("wrapper_kind") or "").strip().lower()
    operations = manifest.get("operations") or []
    description = str(manifest.get("description") or "").strip()
    setup_entrypoint = str(manifest.get("setup_entrypoint") or "").strip()
    if not _NAME_RE.fullmatch(name):
        raise ValueError("Connector name is not safe")
    if wrapper_kind not in _WRAPPER_KINDS:
        raise ValueError(f"Unsupported connector wrapper kind: {wrapper_kind}")
    if not isinstance(operations, list) or any(not isinstance(item, str) for item in operations):
        raise ValueError("Connector operations must be a string list")
    normalized_operations = list(dict.fromkeys(str(item).strip() for item in operations if str(item).strip()))
    unsupported = set(normalized_operations) - _ALLOWED_OPERATIONS
    if unsupported:
        raise ValueError(f"Unsupported connector operation(s): {sorted(unsupported)}")
    if not {"next_task", "task_context", "submit_result"}.issubset(normalized_operations):
        raise ValueError("Connector must support next_task, task_context and submit_result")
    if not description:
        raise ValueError("Connector manifest requires a plain-language description")

    normalized_files: dict[str, str] = {}
    if len(files) > _MAX_FILES:
        raise ValueError("Connector package contains too many files")
    for raw_path, raw_content in files.items():
        path = _safe_relative_path(str(raw_path))
        content = str(raw_content)
        if Path(path).suffix.lower() not in _ALLOWED_SUFFIXES:
            raise ValueError(f"Unsupported connector file type: {path}")
        if len(content.encode("utf-8")) > _MAX_FILE_BYTES:
            raise ValueError(f"Connector file is too large: {path}")
        normalized_files[path] = content
    if not normalized_files:
        raise ValueError("Connector package must include at least one setup file")
    if setup_entrypoint:
        setup_entrypoint = _safe_relative_path(setup_entrypoint)
        if setup_entrypoint not in normalized_files:
            raise ValueError("Connector setup entrypoint is not included in files")

    return {
        "protocol": PACKAGE_PROTOCOL,
        "protocol_version": PACKAGE_VERSION,
        "manifest": {
            "name": name,
            "wrapper_kind": wrapper_kind,
            "operations": normalized_operations,
            "credential_ownership": "external-host",
            "description": description,
            "setup_entrypoint": setup_entrypoint,
            "activation": "external-host-only",
        },
        "files": normalized_files,
    }


def preview_connector_package(payload: str | dict[str, Any]) -> dict[str, Any]:
    package = parse_connector_package(payload)
    return {
        "manifest": package["manifest"],
        "files": [
            {
                "path": path,
                "bytes": len(content.encode("utf-8")),
                "sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
            }
            for path, content in sorted(package["files"].items())
        ],
    }


def install_connector_package(storage_path: str | Path, payload: str | dict[str, Any]) -> dict[str, Any]:
    """Store a reviewed host-side wrapper package without executing or activating it."""
    package = parse_connector_package(payload)
    name = package["manifest"]["name"]
    root = storage_directory(storage_path) / "connectors"
    target = root / name
    root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="aaaat-connector-", dir=root) as temporary:
        stage = Path(temporary)
        for relative, content in package["files"].items():
            path = stage / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        (stage / "aaaat-connector.json").write_text(
            json.dumps(package["manifest"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        _static_connector_check(stage, package)
        backup = target.with_name(target.name + ".previous")
        if backup.exists():
            shutil.rmtree(backup)
        if target.exists():
            target.replace(backup)
        shutil.copytree(stage, target)
        if backup.exists():
            shutil.rmtree(backup)
    return {
        "status": "stored_disabled",
        "name": name,
        "directory": str(target),
        "activation": "Configure and run this package from the external AI host.",
        "preview": preview_connector_package(package),
    }


def export_connector_construction_bundle(output_path: str | Path, adapter_id: str = "manual_external_agent") -> Path:
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    example = {
        "protocol": PACKAGE_PROTOCOL,
        "manifest": {
            "name": "example-host-wrapper",
            "wrapper_kind": "cli",
            "operations": ["next_task", "task_context", "report_progress", "submit_result"],
            "credential_ownership": "external-host",
            "description": "External host wrapper around AAAAT bounded commands.",
            "setup_entrypoint": "README.md",
        },
        "files": {
            "README.md": (
                "Configure your external AI host to call AAAAT's bounded next-task, task-context, "
                "progress and submit-result commands. The host initiates every call. AAAAT never executes this package.\n"
            )
        },
    }
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("CONNECT_YOUR_AI.txt", connector_construction_prompt(adapter_id))
        archive.writestr("example-package.json", json.dumps(example, ensure_ascii=False, indent=2))
    return target


def _safe_relative_path(value: str) -> str:
    pure = PurePosixPath(value.replace("\\", "/"))
    if not value or pure.is_absolute() or ".." in pure.parts or any(part in {"", "."} for part in pure.parts):
        raise ValueError(f"Unsafe connector path: {value}")
    return pure.as_posix()


def _static_connector_check(stage: Path, package: dict[str, Any]) -> None:
    forbidden = (
        "aaaat.sqlite3",
        "storage_path",
        "application_id",
        "candidature_id",
        "artifact_id",
        "install_and_activate",
    )
    for relative, content in package["files"].items():
        matched = next((token for token in forbidden if token.lower() in content.lower()), None)
        if matched:
            raise ValueError(f"Connector file {relative} contains forbidden authority reference: {matched}")
    resolved_stage = stage.resolve()
    for path in stage.rglob("*"):
        if path.resolve() != resolved_stage and resolved_stage not in path.resolve().parents:
            raise ValueError("Connector staging escaped its controlled directory")
