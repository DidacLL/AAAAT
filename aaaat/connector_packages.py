from __future__ import annotations

import hashlib
import json
import re
import shutil
import stat
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

from .runtime_conformance import bootstrap_manifest
from .workspace_config import load_workspace_config, save_workspace_settings, storage_directory

PACKAGE_PROTOCOL = "aaaat.connector-package"
PACKAGE_VERSION = 1
_MAX_FILES = 12
_MAX_FILE_BYTES = 200_000
_ALLOWED_SUFFIXES = {".py", ".sh", ".cmd", ".ps1", ".json", ".md", ".txt"}
_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$")
_EXTERNAL_KINDS = {"none", "outbound", "listener", "bidirectional", "provider_managed"}
_EXTERNAL_EXPOSURES = {"local", "user_selected", "public", "provider_managed"}
_ALLOWED_EXTERNAL_OPERATIONS = {
    "bounded_task_delivery",
    "bounded_result_callback",
    "provider_auth_callback",
    "health",
}


def connector_construction_prompt(adapter_id: str = "manual_external_agent", settings: dict[str, Any] | None = None) -> str:
    manifest = bootstrap_manifest(adapter_id, settings)
    contract = {
        "package_protocol": PACKAGE_PROTOCOL,
        "package_version": PACKAGE_VERSION,
        "required_manifest": {
            "name": "short safe connector name",
            "entrypoint": "relative executable/script path",
            "argv": ["relative entrypoint", "optional fixed arguments"],
            "prompt_transport": "stdin",
            "result_transport": "stdout",
            "progress_transport": "stderr_ndjson",
            "external_communication": {
                "kind": "none | outbound | listener | bidirectional | provider_managed",
                "exposure": "local | user_selected | public | provider_managed",
                "bounded_operations": ["bounded_task_delivery", "bounded_result_callback", "provider_auth_callback", "health"],
                "description": "plain-language explanation of how this connector reaches the selected AI",
            },
        },
        "files": "mapping of relative file paths to UTF-8 text",
        "restrictions": [
            "Use only the language standard library unless the user explicitly chose another available dependency.",
            "Do not embed credentials, tokens, provider keys, or user data in the package.",
            "Read one bounded AAAAT task JSON object from stdin.",
            "Write one result JSON object to stdout.",
            "Write optional NDJSON progress events to stderr.",
            "Do not read AAAAT storage, enumerate private entities, accept internal IDs as authority, or choose artifact paths.",
            "Provider-facing HTTP, SDK, callback, listener, browser, or other communication is permitted when declared in external_communication.",
            "Any listening endpoint may expose only the declared bounded task/result bridge, never AAAAT storage or entity APIs.",
            "Support runtime_conformance and runtime_bootstrap tasks by echoing their exact nonce.",
        ],
        "runtime_bootstrap": manifest,
    }
    return "Create one minimal user-owned connector for AAAAT. Return only a JSON object matching the following construction contract.\n\n" + json.dumps(contract, ensure_ascii=False, indent=2)


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
    entrypoint = str(manifest.get("entrypoint") or "").strip()
    argv = manifest.get("argv") or [entrypoint]
    if not _NAME_RE.fullmatch(name):
        raise ValueError("Connector name is not safe")
    if not isinstance(argv, list) or not argv or any(not isinstance(item, str) for item in argv):
        raise ValueError("Connector argv must be a non-empty string list")
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
    safe_entrypoint = _safe_relative_path(entrypoint)
    if safe_entrypoint not in normalized_files:
        raise ValueError("Connector entrypoint is not included in files")
    normalized_argv = []
    for index, item in enumerate(argv):
        cleaned = str(item).strip()
        if not cleaned:
            raise ValueError("Connector argv contains an empty argument")
        if index == 0:
            cleaned = _safe_relative_path(cleaned)
            if cleaned != safe_entrypoint:
                raise ValueError("Connector argv must start with the declared entrypoint")
        normalized_argv.append(cleaned)
    external_communication = _validate_external_communication(manifest.get("external_communication"))
    return {
        "protocol": PACKAGE_PROTOCOL,
        "protocol_version": PACKAGE_VERSION,
        "manifest": {
            "name": name,
            "entrypoint": safe_entrypoint,
            "argv": normalized_argv,
            "prompt_transport": "stdin",
            "result_transport": "stdout",
            "progress_transport": str(manifest.get("progress_transport") or "stderr_ndjson"),
            "external_communication": external_communication,
        },
        "files": normalized_files,
    }


def preview_connector_package(payload: str | dict[str, Any]) -> dict[str, Any]:
    package = parse_connector_package(payload)
    return {
        "manifest": package["manifest"],
        "files": [
            {"path": path, "bytes": len(content.encode("utf-8")), "sha256": hashlib.sha256(content.encode("utf-8")).hexdigest()}
            for path, content in sorted(package["files"].items())
        ],
    }


def install_connector_package(storage_path: str | Path, payload: str | dict[str, Any]) -> dict[str, Any]:
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
        (stage / "aaaat-connector.json").write_text(json.dumps(package["manifest"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        entrypoint = stage / package["manifest"]["entrypoint"]
        if entrypoint.suffix.lower() in {".py", ".sh"}:
            entrypoint.chmod(entrypoint.stat().st_mode | stat.S_IXUSR)
        _static_connector_check(stage, package)
        backup = target.with_name(target.name + ".previous")
        if backup.exists():
            shutil.rmtree(backup)
        if target.exists():
            target.replace(backup)
        shutil.copytree(stage, target)
        if backup.exists():
            shutil.rmtree(backup)
    entrypoint = target / package["manifest"]["entrypoint"]
    argv = ([sys.executable, str(entrypoint)] if entrypoint.suffix.lower() == ".py" else [str(entrypoint)]) + package["manifest"]["argv"][1:]
    return {"status": "installed_disabled", "name": name, "directory": str(target), "argv": argv, "preview": preview_connector_package(package)}


def install_and_activate_connector(storage_path: str | Path, payload: str | dict[str, Any]) -> dict[str, Any]:
    installed = install_connector_package(storage_path, payload)
    previous = load_workspace_config(storage_path)
    from .integration_setup import configure_integration
    from .runtime_conformance import run_configured_runtime_conformance

    configured = configure_integration(storage_path, "argv_custom_command", {"argv": installed["argv"], "timeout_seconds": 120})
    if not configured.get("saved"):
        return {**installed, "status": "failed_disabled", "stage": "health", "health": configured.get("health")}
    report = run_configured_runtime_conformance(storage_path)
    if report.get("status") == "passed":
        return {**installed, "status": "active", "conformance": report}
    selected = previous["local_agent_adapter"]
    save_workspace_settings(
        storage_path,
        automatic_preparation=list(previous.get("automatic_preparation") or []),
        local_agent_adapter_id=str(selected.get("id") or "manual_external_agent"),
        local_agent_adapter_settings=dict(selected.get("settings") or {}),
    )
    return {**installed, "status": "failed_disabled", "stage": "conformance", "conformance": report}


def export_connector_construction_bundle(output_path: str | Path, adapter_id: str = "manual_external_agent") -> Path:
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("CONNECT_YOUR_AI.txt", connector_construction_prompt(adapter_id))
        archive.writestr("runtime-bootstrap.json", json.dumps(bootstrap_manifest(adapter_id, {}), ensure_ascii=False, indent=2))
        archive.writestr("example-package.json", json.dumps({"protocol": PACKAGE_PROTOCOL, "manifest": {"name": "example", "entrypoint": "connector.py", "argv": ["connector.py"], "external_communication": {"kind": "outbound", "exposure": "user_selected", "bounded_operations": ["bounded_task_delivery"], "description": "Send the bounded task to the user's selected AI."}}, "files": {"connector.py": "import json,sys\ntask=json.load(sys.stdin)\nprint(json.dumps({'result':'replace me'}))\n"}}, indent=2))
    return target


def _validate_external_communication(value: Any) -> dict[str, Any]:
    if value in (None, ""):
        return {"kind": "none", "exposure": "local", "bounded_operations": [], "description": "No provider-facing network communication declared."}
    if not isinstance(value, dict):
        raise ValueError("Connector external_communication must be an object")
    kind = str(value.get("kind") or "none").strip()
    exposure = str(value.get("exposure") or "local").strip()
    operations = value.get("bounded_operations") or []
    description = str(value.get("description") or "").strip()
    if kind not in _EXTERNAL_KINDS:
        raise ValueError(f"Unsupported connector external communication kind: {kind}")
    if exposure not in _EXTERNAL_EXPOSURES:
        raise ValueError(f"Unsupported connector external communication exposure: {exposure}")
    if not isinstance(operations, list) or any(not isinstance(item, str) for item in operations):
        raise ValueError("Connector bounded_operations must be a string list")
    normalized_operations = [str(item).strip() for item in operations if str(item).strip()]
    unsupported = set(normalized_operations) - _ALLOWED_EXTERNAL_OPERATIONS
    if unsupported:
        raise ValueError(f"Unsupported connector external operation(s): {sorted(unsupported)}")
    if kind != "none" and not normalized_operations:
        raise ValueError("Connector external communication must declare bounded operations")
    if kind != "none" and not description:
        raise ValueError("Connector external communication must include a plain-language description")
    return {
        "kind": kind,
        "exposure": exposure,
        "bounded_operations": normalized_operations,
        "description": description or "No provider-facing network communication declared.",
    }


def _safe_relative_path(value: str) -> str:
    pure = PurePosixPath(value.replace("\\", "/"))
    if not value or pure.is_absolute() or ".." in pure.parts or any(part in {"", "."} for part in pure.parts):
        raise ValueError(f"Unsafe connector path: {value}")
    return pure.as_posix()


def _static_connector_check(stage: Path, package: dict[str, Any]) -> None:
    forbidden = ("subprocess.Popen", "os.system(")
    for relative, content in package["files"].items():
        matched = next((token for token in forbidden if token.lower() in content.lower()), None)
        if matched:
            raise ValueError(f"Connector file {relative} contains forbidden pattern: {matched}")
    resolved_stage = stage.resolve()
    for path in stage.rglob("*"):
        if path.resolve() != resolved_stage and resolved_stage not in path.resolve().parents:
            raise ValueError("Connector staging escaped its controlled directory")
