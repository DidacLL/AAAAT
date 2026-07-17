from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.db import connect, init_db
from aaaat.task_runner import TaskRunner, TaskRunnerError
from aaaat.tasks import create_task, get_task
from aaaat.workspace_config import save_workspace_settings


class AdvancedCommandFixtureTests(unittest.TestCase):
    def _runner(self, storage: Path, mode: str, timeout: int = 2) -> TaskRunner:
        save_workspace_settings(
            storage,
            automatic_preparation=[],
            local_agent_adapter_id="argv_custom_command",
            local_agent_adapter_settings={
                "argv": [sys.executable, "-m", "tests.support.advanced_command_fixture", "--mode", mode],
                "timeout_seconds": timeout,
            },
        )
        return TaskRunner(storage)

    def test_success_fixture_completes_a_bounded_task(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            init_db(storage)
            with connect(storage) as conn:
                task = create_task(conn, "keyword_definition", "Fixture success", context_hint="keyword:Fixture", idempotent=False)
            result = self._runner(storage, "success").run(str(task["id"]))
            self.assertEqual(result["task"]["state"], "completed")
            with connect(storage) as conn:
                self.assertEqual(get_task(conn, str(task["id"]))["state"], "completed")

    def test_expected_command_failures_are_actionable_and_mark_the_attempt_failed(self) -> None:
        cases = (
            ("nonzero", 2, "Fixture requested a nonzero exit"),
            ("empty", 2, "returned no result"),
            ("malformed-json", 2, "returned invalid JSON"),
            ("wrong-schema", 2, "not accepted"),
            ("timeout", 1, "timed out"),
        )
        for mode, timeout, message in cases:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as tmp:
                storage = Path(tmp) / "private"
                init_db(storage)
                with connect(storage) as conn:
                    task = create_task(conn, "keyword_definition", f"Fixture {mode}", context_hint="keyword:Fixture", idempotent=False)
                with self.assertRaisesRegex(TaskRunnerError, message):
                    self._runner(storage, mode, timeout).run(str(task["id"]))
                with connect(storage) as conn:
                    self.assertEqual(get_task(conn, str(task["id"]))["state"], "failed")


if __name__ == "__main__":
    unittest.main()
