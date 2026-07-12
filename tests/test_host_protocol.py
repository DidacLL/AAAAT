import tempfile
import unittest

from aaaat.agent_access import build_agent_task_context, task_handle
from aaaat.compatibility import compatibility_descriptor, validate_compatibility_descriptor
from aaaat.db import connect, create_application, init_db
from aaaat.host_protocol import (
    HostProtocolValidationError,
    HostTaskPacket,
    HostTaskResult,
    packet_from_agent_context,
    validate_host_task_result,
)
from aaaat.tasks import create_task


class CompatibilityDescriptorTests(unittest.TestCase):
    def test_descriptor_keeps_inference_and_credentials_outside_aaaat(self):
        descriptor = compatibility_descriptor()
        validate_compatibility_descriptor(descriptor)

        runtime = descriptor["runtime_properties"]
        self.assertTrue(runtime["works_without_model"])
        self.assertTrue(runtime["works_without_provider_account"])
        self.assertTrue(runtime["works_without_api_key"])
        self.assertFalse(runtime["provider_sdk_in_core"])
        self.assertIn("credential_management", descriptor["ownership"]["external_host"])
        self.assertNotIn("credential_management", descriptor["ownership"]["aaaat"])
        self.assertIn("api_key_storage", descriptor["non_capabilities"])
        self.assertFalse(descriptor["task_protocol"]["agent_auto_apply"])


class HostProtocolTests(unittest.TestCase):
    def build_packet(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="Host Co", role="Engineer")
            task = create_task(
                conn,
                "company_research",
                "Research Host Co",
                application_id=app["id"],
                context_hint="candidature:company_research",
            )
            handle = task_handle(task)
            context = build_agent_task_context(conn, handle)
        return packet_from_agent_context(context), task

    def test_packet_is_bounded_and_contains_no_provider_configuration(self):
        packet, task = self.build_packet()
        payload = packet.to_dict()

        self.assertEqual(payload["task_handle"], packet.task_handle)
        self.assertEqual(payload["task_type"], "company_research")
        self.assertIn("company_research", payload["response_format"]["required"])
        self.assertEqual(payload["allowed_actions"], ["context", "submit"])
        serialized = repr(payload)
        self.assertNotIn(task["id"], serialized)
        for forbidden in ("api_key", "base_url", "model_name", "provider_config", "application_id"):
            self.assertNotIn(forbidden, serialized)

    def test_packet_rejects_internal_ids_and_non_protocol_actions(self):
        packet = HostTaskPacket(
            task_handle="taskh_0123456789abcdef",
            task_type="company_research",
            purpose="market_research",
            instructions={},
            input_context={"application_id": "app_private"},
            response_format={"required": ["company_research"]},
            output_contract={},
            allowed_actions=("context",),
            privacy_notes=(),
        )
        with self.assertRaises(HostProtocolValidationError):
            packet.to_dict()

        packet = HostTaskPacket(
            task_handle="taskh_0123456789abcdef",
            task_type="company_research",
            purpose="market_research",
            instructions={},
            input_context={"company": "Host Co"},
            response_format={"required": ["company_research"]},
            output_contract={},
            allowed_actions=("execute_provider",),
            privacy_notes=(),
        )
        with self.assertRaises(HostProtocolValidationError):
            packet.to_dict()

    def test_result_validation_accepts_optional_generic_provenance(self):
        packet, _task = self.build_packet()
        result = HostTaskResult(
            task_handle=packet.task_handle,
            result={"company_research": "Host-generated research"},
            agent_name="Preferred Agent",
            agent_runtime="external-host",
            model_provider="reported-optionally",
            model_id="reported-optionally",
            host_environment="local-ai-workspace",
            internet_access_used=False,
        )
        payload = result.to_dict()
        validate_host_task_result(payload, packet=packet)

        self.assertEqual(payload["result"]["company_research"], "Host-generated research")
        self.assertEqual(payload["provenance"]["source_type"], "external_adapter")
        self.assertFalse(payload["provenance"]["internet_access_used"])

    def test_result_must_match_task_contract_and_cannot_return_internal_ids(self):
        packet, _task = self.build_packet()
        missing = HostTaskResult(task_handle=packet.task_handle, result={"summary": "wrong"})
        with self.assertRaises(HostProtocolValidationError):
            validate_host_task_result(missing.to_dict(), packet=packet)

        leaking = HostTaskResult(
            task_handle=packet.task_handle,
            result={"company_research": "text", "metadata": {"application_id": "app_private"}},
        )
        with self.assertRaises(HostProtocolValidationError):
            leaking.to_dict()


if __name__ == "__main__":
    unittest.main()
