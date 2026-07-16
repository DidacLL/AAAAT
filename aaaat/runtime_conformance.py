from __future__ import annotations

import json
import secrets
from pathlib import Path
from typing import Any

from .integration_setup import current_integration
from .provider_adapters import adapter_definition, adapter_health, validate_adapter_settings
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
        "work_contract": {
            "input": "one complete bounded AAAAT work item containing purpose-scoped context and response format",
            "result": "one JSON object matching response_format",
            "progress": "optional ordered task-scoped phase events",
            "authority": "random task capability for callbacks only; no entity IDs or storage paths",
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


def _challenge_work_item(kind: str, nonce: str, *, manifest: dict[str, Any] | None = None) -> dict[str, Any]:
    response_schema: dict[str, Any] = {
        "conformance_nonce": "exact supplied nonce",
        "status": "ready",
    }
    if kind == "runtime_bootstrap":
        response_schema.update({key: "advisory value" for key in sorted(_NEGOTIATED_KEYS)})
    return {
        "task": {
            "task_capability": f"taskcap_fake_{kind}",
            "task_type": kind,
            "purpose": kind,
            "allowed_actions": ["submit_result"],
        },
        "purpose": kind,
        "instructions": {
            "default": "Return the exact challenge nonce and only the requested advisory readiness fields.",
            "process": ["Return one JSON object only.", "Do not propose credentials, ports, file paths, shell commands, or provider APIs."],
        },
        "input_context": {"challenge_nonce": nonce, **({"bootstrap_manifest": manifest} if manifest else {})},
        "response_format": {
            "type": "json_object",
            "required": ["conformance_nonce", *( ["runtime_name", "model_name"] if kind == "runtime_bootstrap" else ["status"] )],
            "schema": response_schema,
        },
        "privacy": {"scope": kind, "notes": ["fake data only", "no private AAAAT context"]},
        "allowed_actions": ["submit_result"],
    }


def negotiate_configured_runtime(storage_path: str | Path) -> dict[str, Any]:
    selected = current_integration(storage_path)
    adapter_id = str(selected["id"])
    settings = dict(selected.get("settings") or {})
    adapter = adapter_definition(adapter_id)
    if not adapter.automatic_execution:
        return {"status": "not_applicable", "message": "Portable/manual integrations do not negotiate an Advanced command."}
    nonce = secrets.token_urlsafe(18)
    request = _challenge_work_item("runtime_bootstrap", nonce, manifest=bootstrap_manifest(adapter_id, settings))
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
    challenge = _challenge_work_item("runtime_conformance", nonce)
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
    report.update(status="passed", stage="complete", message="Health and complete bounded-work challenge passed.", provenance=provenance, self_description={key: payload.get(key) for key in ("runtime_name", "model_name", "supports_structured_json", "supports_research") if key in payload})
    return _write_state(storage_path, report)


def _runtime_preflight(adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    try:
        normalized = validate_adapter_settings(adapter_id, settings)
    except (TypeError, ValueError) as exc:
        return {"status": "error", "message": str(exc)}
    return {
        "status": "ready",
        "message": "Provider-neutral Advanced command settings validated; fake bounded challenge required.",
        "adapter_id": adapter_id,
        "configured_field_count": len(normalized),
    }


def _safe_configured_primitives(adapter_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    if adapter_id == "argv_custom_command":
        argv = list(settings.get("argv") or [])
        return {"transport": "stdio", "executable": argv[0] if argv else "", "argument_count": max(0, len(argv) - 1)}
    if adapter_id == "file_exchange":
        return {"transport": "file_exchange", "configured": bool(settings.get("directory"))}
    return {"transport": "manual"}


def _write_state(storage_path: str | Path, report: dict[str, Any]) -> dict[str, Any]:
    path = conformance_state_path(storage_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return report
