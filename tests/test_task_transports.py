from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.task_runner import TaskRunner
from aaaat.task_transports import TransportExecution, execute_configured_transport


class TaskTransportTests(unittest.TestCase):
    def test_generic_command_receives_only_bounded_context(self) -> None:
        calls: list[tuple[list[str], str | None, int, bool]] = []

        def run_stdio(
            argv: list[str],
            input_body: str | None,
            timeout: int,
            *,
            validate_result: bool = True,
        ) -> str:
            calls.append((argv, input_body, timeout, validate_result))
            return '{"result":"complete"}'

        context = {
            "task_handle": "opaque-handle",
            "task": {"task_type": "field_inference"},
            "context": {"offer": "Fake offer"},
            "permitted_actions": ["submit_result"],
        }
        execution = execute_configured_transport(
            "argv_custom_command",
            {"argv": ["local-runtime-connector", "--fixed"], "timeout_seconds": 30},
            context,
            run_stdio=run_stdio,
        )

        self.assertEqual(json.loads(execution.body), {"result": "complete"})
        self.assertEqual(execution.provenance, {"agent_runtime": "user-owned-command"})
        self.assertEqual(calls[0][0], ["local-runtime-connector", "--fixed"])
        self.assertEqual(json.loads(calls[0][1] or "{}"), context)
        self.assertEqual(calls[0][2:], (30, True))

    def test_http_adapter_isolated_behind_transport_boundary(self) -> None:
        context = {
            "task_handle": "opaque-handle",
            "response_format": {
                "required": ["status"],
                "schema": {"status": "string"},
            },
        }
        with patch(
            "aaaat.task_transports.chat_completion",
            return_value=('{"status":"ready"}', {"agent_runtime": "test-http"}),
        ) as completion:
            execution = execute_configured_transport(
                "llama_cpp_server",
                {
                    "endpoint": "http://127.0.0.1:8080",
                    "model": "local",
                    "timeout_seconds": 20,
                },
                context,
                run_stdio=lambda *_args, **_kwargs: "",
            )

        self.assertEqual(json.loads(execution.body), {"status": "ready"})
        self.assertEqual(execution.provenance["agent_runtime"], "test-http")
        self.assertEqual(completion.call_args.args[0:2], ("http://127.0.0.1:8080", "local"))
        self.assertEqual(completion.call_args.args[4], 20)

    def test_task_runner_delegates_transport_without_provider_dispatch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            runner = TaskRunner(Path(tmp))
            expected = TransportExecution(
                body='{"result":"complete"}',
                provenance={"agent_runtime": "fixture"},
            )
            with patch(
                "aaaat.task_runner.execute_configured_transport",
                return_value=expected,
            ) as execute:
                body, provenance = runner._execute_adapter(
                    "fixture_adapter",
                    {"setting": "value"},
                    {"task_handle": "opaque-handle"},
                )

        self.assertEqual(body, expected.body)
        self.assertEqual(provenance, expected.provenance)
        self.assertEqual(execute.call_args.args[0:3], (
            "fixture_adapter",
            {"setting": "value"},
            {"task_handle": "opaque-handle"},
        ))
        self.assertIs(execute.call_args.kwargs["run_stdio"].__self__, runner)


if __name__ == "__main__":
    unittest.main()
