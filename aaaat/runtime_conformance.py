from __future__ import annotations

import json
import secrets
import shutil
import subprocess
from pathlib import Path
from typing import Any

from .integration_setup import current_integration
from .provider_adapters import adapter_definition, adapter_health, validate_adapter_settings
from .subprocess_output import subprocess_failure_message
from .task_runner import TaskRunner
from .workspace_config import storage_directory

MANIFEST_PROTOCOL = "aaaat.runtime-bootstrap"
MANIFEST_VERSION = 1
_NEGOTIATED_KEYS = {"runtime_name", "model_name", "supports_structured_json", "supports_research", "recommended_timeout_seconds", "notes"}


def bootstrap_manifest(adapter_id: str, settings: dict[str, Any] | None = None) -> dict[str, Any]:
    adapter = adapter_definition(adapter_id)
    normalized = validate_adapter_settings(adapter_id, settings)
    return {
        "protocol": MANIFEST_PROTOCOL,
        "protocol_version": MANIFEST_VERSION,
        "adapter": {
            "id": adapter.adapter_id,
            "title": adapter.title,
            "automatic_execution": adapter.automatic_execution,
            "local_only": adapter.local_only,
            "network_access": adapter.network_access,
            "research_capable": adapter.research_capable,
        },
        "configured_primitives": _safe_configured_primitives(adapter_id, normalized),
        "task_contract": {
            "input": "one bounded AAAAT task context",
            "result": "one JSON object matching the task response_format",
            "progress": "ordered phase events owned by AAAAT",
            "authority": "opaque task handle only; no entity IDs or storage paths",
        },
        "required_runtime_claims": {
            "runtime_name": "advisory string",
            "model_name": "advisory string",
            "supports_structured_json": "advisory boolean",
            "supports_research": "advisory boolean",
        },
        "verification": {
            "health_probe_required": True,
            "challenge_round_trip_required": adapter.automatic_execution,
            "claims_are_advisory_until_verified": True,
        },
    }


def conformance_state_path(storage_path: str | Path) -> Path:
    return storage_directory(storage_path) / "aaaat-runtime-conformance.json"


def read_conformance_state(storage_path: str | Path) -> dict[str, Any]:
    path = conformance_state_path(storage_path)
    if not path.exists():
        return {"status": "not_run", "manifest_protocol": MANIFEST_PROTOCOL}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"status": "invalid_state", "manifest_protocol": MANIFEST_PROTOCOL}
    return value if isinstance(value, dict) else {"status": "invalid_state", "manifest_protocol": MANIFEST_PROTOCOL}


def negotiate_configured_runtime(storage_path: str | Path) -> dict[str, Any]:
    selected = current_integration(storage_path)
    adapter_id = str(selected["id"])
    settings = dict(selected.get("settings") or {})
    adapter = adapter_definition(adapter_id)
    if not adapter.automatic_execution:
        return {"status": "not_applicable", "message": "Portable/manual integrations do not negotiate a runtime manifest."}
    nonce = secrets.token_urlsafe(18)
    request = {
        "task": {"task_handle": "taskh_bootstrap_only", "task_type": "runtime_bootstrap", "purpose": "runtime_bootstrap", "allowed_actions": ["submit"]},
        "purpose": "runtime_bootstrap",
        "instructions": {
            "default": "Describe this runtime using only the permitted advisory fields and echo the exact nonce.",
            "process": ["Return one JSON object only.", "Do not propose credentials, ports, file paths, shell commands, or provider APIs."],
        },
        "input_context": {"challenge_nonce": nonce, "bootstrap_manifest": bootstrap_manifest(adapter_id, settings)},
        "response_format": {
            "type": "json_object",
            "required": ["conformance_nonce", "runtime_name", "model_name"],
            "schema": {"conformance_nonce": "exact supplied nonce", **{key: "advisory value" for key in sorted(_NEGOTIATED_KEYS)}},
        },
        "privacy": {"scope": "bootstrap", "notes": ["fake data only", "no private AAAAT context"]},
    }
    try:
        body, provenance = TaskRunner(storage_path)._execute_adapter(adapter_id, settings, request)
        payload = json.loads(body)
        proposal = validate_runtime_proposal(payload, nonce)
    except Exception as exc:
        return {"status": "failed", "stage": "negotiation", "message": str(exc)[:2000]}
    report = run_configured_runtime_conformance(storage_path)
    if report.get("status") != "passed":
        return {"status": "failed", "stage": "conformance", "message": str(report.get("message") or "Conformance failed"), "proposal": proposal}
    report["negotiated_manifest"] = proposal
    report["negotiated_provenance"] = provenance
    return _write_state(storage_path, report)


def validate_runtime_proposal(payload: Any, nonce: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("Runtime proposal must be one object")
    if str(payload.get("conformance_nonce") or "") != nonce:
        raise ValueError("Runtime proposal did not preserve the bootstrap nonce")
    forbidden = {"argv", "command", "executable", "api_key", "token", "url", "port", "file_path", "storage_path"}
    if forbidden.intersection(payload):
        raise ValueError("Runtime proposal contains forbidden configuration authority")
    proposal = {key: payload.get(key) for key in _NEGOTIATED_KEYS if key in payload}
    for key in ("runtime_name", "model_name", "notes"):
        if key in proposal:
            proposal[key] = str(proposal[key])[:500]
    for key in ("supports_structured_json", "supports_research"):
        if key in proposal and not isinstance(proposal[key], bool):
            raise ValueError(f"Runtime proposal field must be boolean: {key}")
    if "recommended_timeout_seconds" in proposal:
        timeout = int(proposal["recommended_timeout_seconds"])
        if not 10 <= timeout <= 3600:
            raise ValueError("Recommended timeout is outside the safe range")
        proposal["recommended_timeout_seconds"] = timeout
    if not str(proposal.get("runtime_name") or "").strip() or not str(proposal.get("model_name") or "").strip():
        raise ValueError("Runtime proposal requires runtime_name and model_name")
    return proposal


def run_configured_runtime_conformance(storage_path: str | Path) -> dict[str, Any]:
    selected = current_integration(storage_path)
    adapter_id = str(selected["id"])
    settings = dict(selected.get("settings") or {})
    adapter = adapter_definition(adapter_id)
    manifest = bootstrap_manifest(adapter_id, settings)
    health = adapter_health(adapter_id, settings)
    report: dict[str, Any] = {"manifest_protocol": MANIFEST_PROTOCOL, "manifest_version": MANIFEST_VERSION, "adapter_id": adapter_id, "health": health, "manifest": manifest}
    if health.get("status") != "ready":
        report.update(status="failed", stage="health", message=str(health.get("message") or "Health check failed"))
        return _write_state(storage_path, report)
    preflight = _runtime_preflight(adapter_id, settings)
    report["preflight"] = preflight
    if preflight.get("status") != "ready":
        report.update(status="failed", stage="preflight", message=str(preflight.get("message") or "Runtime preflight failed"))
        return _write_state(storage_path, report)
    if not adapter.automatic_execution:
        report.update(status="not_applicable", stage="transport", message="This integration uses portable/manual transfer.")
        return _write_state(storage_path, report)
    nonce = secrets.token_urlsafe(18)
    challenge = {
        "task": {"task_handle": "taskh_conformance_only", "task_type": "runtime_conformance", "purpose": "runtime_conformance", "allowed_actions": ["submit"]},
        "purpose": "runtime_conformance",
        "instructions": {"default": "Return the exact challenge nonce and readiness status. Do not perform other work.", "process": ["Return one JSON object only."]},
        "input_context": {"challenge_nonce": nonce},
        "response_format": {"type": "json_object", "required": ["conformance_nonce", "status"], "schema": {"conformance_nonce": "exact supplied nonce", "status": "ready"}},
        "privacy": {"scope": "conformance", "notes": ["fake data only"]},
    }
    try:
        body, provenance = TaskRunner(storage_path)._execute_adapter(adapter_id, settings, challenge)
        payload = json.loads(body)
        if not isinstance(payload, dict):
            raise ValueError("Conformance result must be an object")
        if str(payload.get("conformance_nonce") or "") != nonce:
            raise ValueError("Runtime did not preserve the conformance nonce")
        if str(payload.get("status") or "").lower() != "ready":
            raise ValueError("Runtime did not report ready status")
    except Exception as exc:
        report.update(status="failed", stage="challenge", message=str(exc)[:2000])
        return _write_state(storage_path, report)
    report.update(status="passed", stage="complete", message="Health and bounded challenge round trip passed.", provenance=provenance, self_description={key: payload.get(key) for key in ("runtime_name", "model_name", "supports_structured_json", "supports_research") if key in payload})
    return _write_state(storage_path, report)


def _runtime_preflight(adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    if adapter_id != "ollama_cli":
        return {"status": "ready", "message": "No adapter-specific preflight required."}
    executable = str(settings.get("executable") or "ollama")
    resolved = shutil.which(executable)
    if not resolved:
        return {"status": "error", "message": f"Ollama executable not found: {executable}"}
    completed = subprocess.run([resolved, "list"], text=True, capture_output=True, check=False, timeout=30)
    if completed.returncode != 0:
        return {"status": "error", "message": subprocess_failure_message(completed.stderr or "", completed.stdout or "", completed.returncode)}
    configured = str(settings.get("model") or "").strip()
    installed = _ollama_model_names(completed.stdout or "")
    if configured not in installed:
        available = ", ".join(installed[:12]) if installed else "none"
        return {
            "status": "error",
            "message": f"Configured Ollama model is not installed: {configured}. Installed models: {available}. Run 'ollama pull {configured}' or rerun validation with an installed model name from 'ollama list'.",
            "configured_model": configured,
            "installed_models": installed,
        }
    return {"status": "ready", "message": f"Configured Ollama model is installed: {configured}", "configured_model": configured}


def _ollama_model_names(output: str) -> list[str]:
    names: list[str] = []
    for index, line in enumerate(str(output or "").splitlines()):
        stripped = line.strip()
        if not stripped or (index == 0 and stripped.upper().startswith("NAME")):
            continue
        name = stripped.split()[0]
        if name and name not in names:
            names.append(name)
    return names


def _safe_configured_primitives(adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    if adapter_id == "argv_custom_command":
        argv = list(settings.get("argv") or [])
        return {"transport": "stdio", "executable": argv[0] if argv else "", "argument_count": max(0, len(argv) - 1)}
    return {"transport": "subprocess" if settings else "manual", "executable": str(settings.get("executable") or ""), "model": str(settings.get("model") or Path(str(settings.get("model_path") or "")).name), "additional_argument_count": len(list(settings.get("args") or []))}


def _write_state(storage_path: str | Path, report: dict[str, Any]) -> dict[str, Any]:
    path = conformance_state_path(storage_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return report
