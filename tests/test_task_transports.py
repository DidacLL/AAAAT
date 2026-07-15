from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.task_runner import TaskRunner
from aaaat.task_transports import TransportExecution, execute_configured_transport


class TaskTransportTests(unittest.TestCase):
    def test_generic_command_receives_one_complete_bounded_work_item(self) -> None:
        calls: list[tuple[list[str], str | None, int, bool]] = []

        def run_stdio(argv: list[str], input_body: str | None, timeout: int, *, validate_result: bool = True) -> str:
            calls.append((argv, input_body, timeout, validate_result))
            return '{"result":"complete"}'

        work = {
            "task": {"task_capability": "taskcap_fixture", "task_type": "field_inference"},
            "input_context": {"source_material": "bounded"},
            "response_format": {"type": "json_object"},
        }
        execution = execute_configured_transport(
            "argv_custom_command",
            {"argv": ["user-connector", "--fixed"], "timeout_seconds": 30},
            work,
            run_stdio=run_stdio,
        )
        self.assertEqual(json.loads(execution.body), {"result": "complete"})
        self.assertEqual(execution.provenance, {"agent_runtime": "user-owned-command"})
        self.assertEqual(calls[0][0], ["user-connector", "--fixed"])
        self.assertEqual(json.loads(calls[0][1] or "{}"), work)

    def test_named_or_unknown_adapter_is_not_executable(self) -> None:
        with self.assertRaisesRegex(ValueError, "not executable"):
            execute_configured_transport("named_provider", {}, {}, run_stdio=lambda *_args, **_kwargs: "{}")

    def test_task_runner_delegates_to_generic_transport_boundary(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            runner = TaskRunner(Path(tmp))
            expected = TransportExecution(body='{"result":"complete"}', provenance={"agent_runtime": "fixture"})
            work = {"task": {"task_capability": "taskcap_fixture"}, "input_context": {}}
            with patch("aaaat.task_runner.execute_configured_transport", return_value=expected) as execute:
                body, provenance = runner._execute_adapter("argv_custom_command", {"argv": ["connector"]}, work)
        self.assertEqual(body, expected.body)
        self.assertEqual(provenance, expected.provenance)
        self.assertEqual(execute.call_args.args[0], "argv_custom_command")
        self.assertEqual(execute.call_args.args[2], work)


if __name__ == "__main__":
    unittest.main()
