import unittest

from aaaat.llm_engine import LlmConversationEngine
from aaaat.llm_protocol import (
    LlmTaskRequest,
    LlmTaskResponse,
    ProtocolValidationError,
    request_from_agent_context,
    validate_llm_task_response,
)
from aaaat.llm_provider import ProviderCapabilities


class FakeProvider:
    name = "fake"

    def __init__(self, result=None):
        self.result = result or {"company_research": "Useful bounded research"}
        self.requests = []

    def capabilities(self):
        return ProviderCapabilities(structured_output=True, usage_reporting=True, models=("fake-model",))

    def estimate_cost(self, request, *, model=None):
        return {"currency": "USD", "estimated": 0.0}

    def complete(self, request, *, model=None):
        self.requests.append(request)
        return LlmTaskResponse(
            task_handle=request.task_handle,
            result=self.result,
            provider=self.name,
            model=model or "fake-model",
            usage={"input_tokens": 10, "output_tokens": 5},
        )


def agent_context():
    return {
        "task": {
            "task_handle": "taskh_0123456789abcdef",
            "task_type": "company_research",
        },
        "purpose": "market_research",
        "instructions": {"default": "Research the company", "process": ["Use bounded context"]},
        "input_context": {"company": "Example Co", "role": "Engineer"},
        "response_format": {
            "type": "json_object",
            "required": ["company_research"],
            "schema": {"company_research": "string"},
        },
        "output_contract": {
            "kind": "task_result",
            "review_state": "suggested",
            "auto_apply_by_agent": False,
        },
        "privacy_notes": ["agent-scoped task context"],
    }


class LlmProtocolTests(unittest.TestCase):
    def test_agent_context_converts_to_versioned_request(self):
        request = request_from_agent_context(agent_context())
        payload = request.to_dict()

        self.assertEqual(payload["protocol_version"], "1")
        self.assertEqual(payload["task_handle"], "taskh_0123456789abcdef")
        self.assertEqual(payload["purpose"], "market_research")
        self.assertEqual(payload["input_context"]["company"], "Example Co")

    def test_request_rejects_internal_entity_identifiers(self):
        request = LlmTaskRequest(
            task_handle="taskh_0123456789abcdef",
            task_type="company_research",
            purpose="market_research",
            instructions={},
            input_context={"application_id": "app_private"},
            response_format={"required": ["company_research"]},
            output_contract={},
        )
        with self.assertRaises(ProtocolValidationError):
            request.to_dict()

    def test_response_must_match_task_and_required_result_fields(self):
        request = request_from_agent_context(agent_context())
        wrong_task = LlmTaskResponse(
            task_handle="taskh_other",
            result={"company_research": "text"},
            provider="fake",
            model="fake-model",
        )
        with self.assertRaises(ProtocolValidationError):
            validate_llm_task_response(wrong_task.to_dict(), request=request)

        missing = LlmTaskResponse(
            task_handle=request.task_handle,
            result={"summary": "wrong shape"},
            provider="fake",
            model="fake-model",
        )
        with self.assertRaises(ProtocolValidationError):
            validate_llm_task_response(missing.to_dict(), request=request)

    def test_response_rejects_internal_identifiers_recursively(self):
        response = LlmTaskResponse(
            task_handle="taskh_0123456789abcdef",
            result={"company_research": "text", "metadata": {"application_id": "app_private"}},
            provider="fake",
            model="fake-model",
        )
        with self.assertRaises(ProtocolValidationError):
            response.to_dict()


class LlmConversationEngineTests(unittest.TestCase):
    def test_engine_invokes_provider_and_validates_structured_result(self):
        provider = FakeProvider()
        execution = LlmConversationEngine(provider).execute_agent_context(agent_context(), model="fake-model")

        self.assertEqual(len(provider.requests), 1)
        self.assertEqual(execution.response.result["company_research"], "Useful bounded research")
        self.assertTrue(execution.capabilities.structured_output)
        self.assertEqual(execution.estimated_cost["estimated"], 0.0)

    def test_engine_rejects_provider_result_that_violates_contract(self):
        provider = FakeProvider(result={"summary": "missing required field"})
        with self.assertRaises(ProtocolValidationError):
            LlmConversationEngine(provider).execute_agent_context(agent_context())


if __name__ == "__main__":
    unittest.main()
