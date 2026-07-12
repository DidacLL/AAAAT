import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

from aaaat.agent_access import build_agent_task_context, task_handle
from aaaat.db import connect, create_application, init_db
from aaaat.llm_engine import LlmConversationEngine
from aaaat.llm_openai_compatible import OpenAiCompatibleConfig, OpenAiCompatibleProvider
from aaaat.llm_runtime import LlmRuntimeConfig, _submit_execution, provider_from_config
from aaaat.tasks import create_task, get_task


class RecordingHandler(BaseHTTPRequestHandler):
    request_payload = None
    authorization = None

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        type(self).request_payload = json.loads(self.rfile.read(length).decode("utf-8"))
        type(self).authorization = self.headers.get("Authorization")
        response = {
            "id": "chatcmpl_test",
            "created": 123,
            "choices": [{
                "message": {"content": json.dumps({"company_research": "Bounded provider research"})},
                "finish_reason": "stop",
            }],
            "usage": {"prompt_tokens": 20, "completion_tokens": 8, "total_tokens": 28},
        }
        body = json.dumps(response).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


class LocalProviderServer:
    def __enter__(self):
        self.server = HTTPServer(("127.0.0.1", 0), RecordingHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        host, port = self.server.server_address
        self.base_url = f"http://{host}:{port}"
        return self

    def __exit__(self, exc_type, exc, tb):
        self.server.shutdown()
        self.thread.join(timeout=5)
        self.server.server_close()


class OpenAiCompatibleProviderTests(unittest.TestCase):
    def context(self):
        return {
            "task": {"task_handle": "taskh_0123456789abcdef", "task_type": "company_research"},
            "purpose": "market_research",
            "instructions": {"default": "Research", "process": ["Use bounded context"]},
            "input_context": {"company": "Example Co", "role": "Engineer"},
            "response_format": {
                "type": "json_object",
                "required": ["company_research"],
                "schema": {"company_research": "string"},
            },
            "output_contract": {"kind": "task_result", "auto_apply_by_agent": False},
            "privacy_notes": ["agent-scoped task context"],
        }

    def test_adapter_sends_json_contract_and_parses_structured_response(self):
        from aaaat.llm_protocol import request_from_agent_context

        with LocalProviderServer() as server:
            provider = OpenAiCompatibleProvider(OpenAiCompatibleConfig(
                base_url=server.base_url,
                model="local-model",
                api_key="secret-token",
                timeout_seconds=5,
            ))
            execution = LlmConversationEngine(provider).execute_agent_context(self.context())

        self.assertEqual(execution.response.result["company_research"], "Bounded provider research")
        self.assertEqual(execution.response.usage["total_tokens"], 28)
        self.assertEqual(RecordingHandler.authorization, "Bearer secret-token")
        sent = RecordingHandler.request_payload
        self.assertEqual(sent["model"], "local-model")
        self.assertEqual(sent["response_format"], {"type": "json_object"})
        self.assertEqual(len(sent["messages"]), 2)
        self.assertNotIn("secret-token", json.dumps(sent))

    def test_runtime_config_uses_environment_values_without_persistence(self):
        config = LlmRuntimeConfig.from_env({
            "AAAAT_LLM_PROVIDER": "openai-compatible",
            "AAAAT_LLM_MODEL": "local-model",
            "AAAAT_LLM_BASE_URL": "http://127.0.0.1:1234",
            "AAAAT_LLM_API_KEY": "ephemeral-secret",
            "AAAAT_LLM_TIMEOUT_SECONDS": "12",
        })
        provider = provider_from_config(config)

        self.assertEqual(config.model, "local-model")
        self.assertEqual(config.timeout_seconds, 12.0)
        self.assertEqual(provider.config.api_key, "ephemeral-secret")


class LlmTaskSubmissionTests(unittest.TestCase):
    def test_validated_execution_is_stored_as_suggested_task_result(self):
        from aaaat.llm_engine import LlmExecution
        from aaaat.llm_protocol import LlmTaskResponse, request_from_agent_context
        from aaaat.llm_provider import ProviderCapabilities

        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Runtime Co", role="Engineer")
                task = create_task(
                    conn,
                    "company_research",
                    "Research Runtime Co",
                    application_id=app["id"],
                    context_hint="candidature:research",
                )
                handle = task_handle(task)
                context = build_agent_task_context(conn, handle)

            request_ = request_from_agent_context(context)
            response = LlmTaskResponse(
                task_handle=handle,
                result={"company_research": "Stored for human review"},
                provider="fake-provider",
                model="fake-model",
                usage={"total_tokens": 4},
            )
            execution = LlmExecution(
                request=request_,
                response=response,
                capabilities=ProviderCapabilities(structured_output=True),
                estimated_cost={"estimated": 0.0},
            )
            result = _submit_execution(tmp, execution)

            with connect(tmp) as conn:
                stored_task = get_task(conn, task["id"])
                blob = conn.execute("SELECT * FROM text_blobs WHERE id = ?", (stored_task["result_blob_id"],)).fetchone()

        self.assertEqual(result["task"]["state"], "completed")
        self.assertIsNotNone(blob)
        self.assertEqual(blob["review_state"], "suggested")
        self.assertIn("Stored for human review", blob["body"])
        self.assertEqual(blob["model_provider"], "fake-provider:fake-model")


if __name__ == "__main__":
    unittest.main()
