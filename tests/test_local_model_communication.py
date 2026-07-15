from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.llama_cpp_http import chat_completion, task_response_json_schema, validate_loopback_endpoint
from aaaat.local_model_protocol import build_local_model_prompt, extract_json_object
from aaaat.provider_adapters import adapter_health, standard_local_settings, validate_adapter_settings
from aaaat.task_runner import TaskRunner


class _Response:
    def __init__(self, payload: dict[str, object], status: int = 200) -> None:
        self.payload = json.dumps(payload).encode("utf-8")
        self.status = status

    def __enter__(self) -> "_Response":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self, _limit: int = -1) -> bytes:
        return self.payload


class LocalModelCommunicationTests(unittest.TestCase):
    def test_local_model_prompt_contains_only_bounded_context(self) -> None:
        context = {"task_handle": "opaque-handle", "task": {"task_type": "field_inference"}, "context": {"offer": "Fake offer"}, "permitted_actions": ["submit_result"]}
        prompt = json.loads(build_local_model_prompt(context))
        self.assertEqual(prompt["protocol"], "aaaat.local-task")
        self.assertEqual(prompt["task"], context)
        serialized = json.dumps(prompt)
        for forbidden in ("application_id", "candidature_id", "database_path", "artifact_id"):
            self.assertNotIn(forbidden, serialized)

    def test_result_extractor_is_strict_and_not_a_cli_scraper(self) -> None:
        self.assertEqual(json.loads(extract_json_object('{"result":"ok"}')), {"result": "ok"})
        with self.assertRaisesRegex(ValueError, "valid JSON"):
            extract_json_object('Loading model...\n{"result":"ok"}\nExiting...')
        with self.assertRaisesRegex(ValueError, "one JSON object"):
            extract_json_object('[{"result":"ok"}]')

    def test_llama_cpp_server_settings_require_loopback(self) -> None:
        self.assertEqual(standard_local_settings("llama_cpp_server"), {"endpoint": "http://127.0.0.1:8080", "model": "local", "timeout_seconds": 600})
        configured = validate_adapter_settings("llama_cpp_server", {"endpoint": "http://localhost:8080", "model": "qwen", "timeout_seconds": 12})
        self.assertEqual(configured["endpoint"], "http://localhost:8080")
        with self.assertRaisesRegex(ValueError, "loopback"):
            validate_loopback_endpoint("http://192.168.1.20:8080")
        with self.assertRaisesRegex(ValueError, "http"):
            validate_loopback_endpoint("https://127.0.0.1:8080")

    def test_response_schema_is_derived_from_bounded_task_contract(self) -> None:
        schema = task_response_json_schema({"response_format": {"required": ["variables"], "schema": {"variables": "object containing eligible profile keys and bounded text values", "replace_existing": "optional boolean"}}})
        self.assertEqual(schema["required"], ["variables"])
        self.assertEqual(schema["properties"]["variables"]["type"], "object")
        self.assertEqual(schema["properties"]["replace_existing"]["type"], "boolean")
        self.assertFalse(schema["additionalProperties"])
        field_schema = task_response_json_schema({"response_format": {"required": ["fields"], "schema": {"fields": "object containing supported missing fields"}}})
        variants = field_schema["properties"]["fields"]["additionalProperties"]["anyOf"]
        self.assertTrue(any(item.get("type") == "array" for item in variants))

    def test_llama_cpp_server_uses_non_streaming_schema_constrained_chat_completion(self) -> None:
        envelope = {"model": "qwen-local", "choices": [{"message": {"content": '{"variables":{"profile.career.direction":"Backend"}}'}}]}
        with patch("aaaat.llama_cpp_http.urllib.request.urlopen", return_value=_Response(envelope)) as open_url:
            body, provenance = chat_completion(
                "http://127.0.0.1:8080",
                "local",
                "bounded prompt",
                {"type": "object", "properties": {"variables": {"type": "object"}}, "required": ["variables"]},
                30,
            )
        self.assertEqual(json.loads(body)["variables"]["profile.career.direction"], "Backend")
        request = open_url.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(request.full_url, "http://127.0.0.1:8080/v1/chat/completions")
        self.assertIs(payload["stream"], False)
        self.assertEqual(payload["temperature"], 0)
        self.assertEqual(payload["chat_template_kwargs"], {"enable_thinking": False})
        self.assertEqual(payload["reasoning_format"], "none")
        self.assertEqual(payload["response_format"]["type"], "json_schema")
        self.assertEqual(payload["response_format"]["schema"]["required"], ["variables"])
        self.assertEqual(provenance["agent_runtime"], "llama.cpp-server")

    def test_llama_cpp_server_retries_documented_json_object_schema_form(self) -> None:
        invalid = {"model": "qwen-local", "choices": [{"message": {"content": "I will return JSON."}}]}
        valid = {"model": "qwen-local", "choices": [{"message": {"content": '{"status":"ready"}'}}]}
        with patch(
            "aaaat.llama_cpp_http.urllib.request.urlopen",
            side_effect=[_Response(invalid), _Response(valid)],
        ) as open_url:
            body, _provenance = chat_completion(
                "http://127.0.0.1:8080",
                "local",
                "bounded prompt",
                {"type": "object", "properties": {"status": {"type": "string"}}, "required": ["status"]},
                30,
            )
        self.assertEqual(json.loads(body), {"status": "ready"})
        self.assertEqual(open_url.call_count, 2)
        first = json.loads(open_url.call_args_list[0].args[0].data.decode("utf-8"))
        second = json.loads(open_url.call_args_list[1].args[0].data.decode("utf-8"))
        self.assertEqual(first["response_format"]["type"], "json_schema")
        self.assertEqual(second["response_format"]["type"], "json_object")
        self.assertEqual(first["response_format"]["schema"], second["response_format"]["schema"])

    def test_llama_cpp_server_failure_includes_bounded_content_excerpt(self) -> None:
        invalid = {"model": "qwen-local", "choices": [{"message": {"content": "not json"}}]}
        with patch("aaaat.llama_cpp_http.urllib.request.urlopen", return_value=_Response(invalid)):
            with self.assertRaisesRegex(ValueError, "content='not json'"):
                chat_completion(
                    "http://127.0.0.1:8080",
                    "local",
                    "bounded prompt",
                    {"type": "object"},
                    30,
                )

    def test_generic_command_runner_uses_bounded_stdin_and_fixed_argv(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            runner = TaskRunner(Path(tmp))
            completed = subprocess.CompletedProcess(args=["local-runtime-connector"], returncode=0, stdout='{"result":"complete"}\n', stderr="")
            with patch("aaaat.task_runner.subprocess.run", return_value=completed) as run:
                body, provenance = runner._execute_adapter("argv_custom_command", {"argv": ["local-runtime-connector", "--fixed"], "timeout_seconds": 30}, {"task_handle": "opaque"})
        self.assertEqual(json.loads(body), {"result": "complete"})
        self.assertEqual(provenance, {"agent_runtime": "user-owned-command"})
        self.assertEqual(run.call_args.args[0], ["local-runtime-connector", "--fixed"])

    def test_server_health_reports_failure_without_launching_or_discovery(self) -> None:
        with patch("aaaat.llama_cpp_http.urllib.request.urlopen", side_effect=OSError("not running")):
            health = adapter_health("llama_cpp_server", {"endpoint": "http://127.0.0.1:8080", "model": "local"})
        self.assertEqual(health["status"], "error")
        self.assertIn("not running", health["message"])
        self.assertIs(health["local_only"], True)
        self.assertEqual(health["network_access"], "loopback-only")


if __name__ == "__main__":
    unittest.main()
