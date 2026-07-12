from __future__ import annotations

from typing import Any

from . import __version__
from .agent_access import TASK_PURPOSES

COMPATIBILITY_DESCRIPTOR_VERSION = "1"


def compatibility_descriptor() -> dict[str, Any]:
    """Describe AAAAT's internal embedding and passive-agent capabilities.

    This is a conservative first-party compatibility descriptor. It deliberately
    contains no provider, model, endpoint, credential, or inference-runtime
    configuration. External hosts decide how reasoning runs.
    """

    return {
        "descriptor_version": COMPATIBILITY_DESCRIPTOR_VERSION,
        "stability": "internal_first_party",
        "application": {
            "name": "AAAAT",
            "version": __version__,
            "kind": "local_first_job_application_workspace",
        },
        "ownership": {
            "aaaat": [
                "private_domain_data",
                "task_binding",
                "context_scoping",
                "output_validation",
                "review_state",
                "deterministic_apply",
                "local_rendering",
                "artifact_lifecycle",
            ],
            "external_host": [
                "reasoning",
                "generation",
                "inference_execution",
                "provider_selection",
                "model_selection",
                "credential_management",
                "network_policy",
            ],
        },
        "integration_modes": [
            "folder_guide",
            "cli",
            "local_agent_http",
            "mcp_descriptor",
            "structured_task_packet",
            "bounded_action_packet",
            "in_process_adapter",
        ],
        "runtime_properties": {
            "works_without_model": True,
            "works_without_provider_account": True,
            "works_without_api_key": True,
            "works_without_git": True,
            "http_required": False,
            "external_network_required": False,
            "provider_sdk_in_core": False,
            "dashboard_and_agent_runtimes_separate": True,
        },
        "task_protocol": {
            "handle": "opaque_task_handle",
            "task_types": sorted(TASK_PURPOSES),
            "purposes": sorted(set(TASK_PURPOSES.values())),
            "allowed_agent_actions": ["context", "submit"],
            "result_review_state": "suggested",
            "agent_auto_apply": False,
            "internal_entity_ids_are_authority": False,
        },
        "privacy": {
            "storage": "local_private",
            "context_is_purpose_scoped": True,
            "profile_exposure_is_policy_controlled": True,
            "private_paths_exposed_to_agents": False,
            "raw_sensitive_data_default": "denied_or_scoped",
            "external_transmission_decided_by_host": True,
        },
        "artifacts": {
            "generated_locally": True,
            "review_required_before_external_use": True,
            "generation_is_not_submission": True,
        },
        "stable_contracts": [
            "task_envelope",
            "bounded_context",
            "response_format",
            "output_contract",
            "privacy_notes",
            "bounded_action_packet",
            "narrow_acknowledgement",
        ],
        "non_capabilities": [
            "provider_configuration",
            "api_key_storage",
            "model_hosting",
            "inference_orchestration",
            "general_agent_runtime",
            "broad_agent_crud",
            "automatic_external_submission",
        ],
    }


def validate_compatibility_descriptor(descriptor: dict[str, Any] | None = None) -> None:
    value = descriptor or compatibility_descriptor()
    required = {
        "descriptor_version",
        "stability",
        "application",
        "ownership",
        "integration_modes",
        "runtime_properties",
        "task_protocol",
        "privacy",
        "artifacts",
        "stable_contracts",
        "non_capabilities",
    }
    missing = required - value.keys()
    if missing:
        raise ValueError(f"Missing compatibility descriptor sections: {sorted(missing)}")
    runtime = value["runtime_properties"]
    if not runtime.get("works_without_api_key"):
        raise ValueError("AAAAT compatibility requires operation without API keys")
    if runtime.get("provider_sdk_in_core"):
        raise ValueError("AAAAT core cannot require a provider SDK")
    ownership = value["ownership"]
    if "credential_management" not in ownership.get("external_host", []):
        raise ValueError("Credential management belongs to the external host")
    if "credential_management" in ownership.get("aaaat", []):
        raise ValueError("AAAAT must not own provider credentials")
