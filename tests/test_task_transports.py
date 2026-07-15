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

        def run_stdio(argv: list[str], input_body: str | None, timeout: int, *, validate_result: bool = True) -> str:
            calls.append((argv, input_body, timeout, validate_result))
            return '{"result":"complete"}'

        context = {"task_handle": "opaque-handle", "task": {"task_type": "field_inference"}}
        execution = execute_configured_transport(
            "argv_custom_command",
            {"argv": ["user-connector", "--fixed"], "timeout_seconds": 30},
            context,
            run_stdio=run_stdio,
        )
        self.assertEqual(json.loads(execution.body), {"result": "complete"})
        self.assertEqual(execution.provenance, {"agent_runtime": "user-owned-command"})
        self.assertEqual(calls[0][0], ["user-connector", "--fixed"])
        self.assertEqual(json.loads(calls[0][1] or "{}"), context)

    def test_named_or_unknown_adapter_is_not_executable(self) -> None:
        with self.assertRaisesRegex(ValueError, "not executable"):
            execute_configured_transport("named_provider", {}, {}, run_stdio=lambda *_args, **_kwargs: "{}")

    def test_task_runner_delegates_to_generic_transport_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            runner = TaskRunner(Path(tmp))
            expected = TransportExecution(body='{"result":"complete"}', provenance={"agent_runtime": "fixture"})
            with patch("aaaat.task_runner.execute_configured_transport", return_value=expected) as execute:
                body, provenance = runner._execute_adapter("argv_custom_command", {"argv": ["connector"]}, {"task_handle": "opaque"})
        self.assertEqual(body, expected.body)
        self.assertEqual(provenance, expected.provenance)
        self.assertEqual(execute.call_args.args[0], "argv_custom_command")


if __name__ == "__main__":
    unittest.main()
