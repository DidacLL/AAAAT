from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.db import connect, init_db
from aaaat.task_runner import TaskRunner, TaskRunnerError
from aaaat.tasks import create_task
from aaaat.workspace_config import save_workspace_settings


class RuntimeOutputTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.storage = Path(self.temporary.name) / "private"
        init_db(self.storage)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def _configure(self, script: str) -> None:
        save_workspace_settings(
            self.storage,
            integration_method_id="user_command",
            integration_settings={
                "argv": [sys.executable, "-c", script],
                "timeout_seconds": 5,
            },
        )

    def test_structured_stderr_status_is_forwarded_without_persistence(self) -> None:
        self._configure(
            "import json,sys; sys.stdin.read(); "
            "print('diagnostic', file=sys.stderr); "
            "print(json.dumps({'type':'progress','message':'Reading source','percent':40}), file=sys.stderr); "
            "print(json.dumps({'fields':{'company':'Example Co'}}))"
        )
        with connect(self.storage) as conn:
            task = create_task(
                conn,
                "field_inference",
                "Extract",
                context_hint="candidature:extraction",
            )
        events: list[dict] = []
        TaskRunner(self.storage, on_progress=events.append).run(str(task["id"]))
        self.assertTrue(any(event["phase"] == "runtime_progress" for event in events))
        self.assertFalse((self.storage / "task-progress").exists())
        self.assertEqual(events[-1]["phase"], "completed")

    def test_oversized_stdout_is_stopped_during_execution(self) -> None:
        runner = TaskRunner(self.storage)
        script = "import sys; sys.stdout.write('x' * 2000001); sys.stdout.flush()"
        with self.assertRaisesRegex(TaskRunnerError, "stdout exceeded"):
            runner._run_stdio([sys.executable, "-c", script], "{}", 5)

    def test_oversized_stderr_is_stopped_during_execution(self) -> None:
        runner = TaskRunner(self.storage)
        script = (
            "import sys; sys.stderr.write('x' * 500001); sys.stderr.flush(); "
            "sys.stdout.write('{\"result\":\"ok\"}')"
        )
        with self.assertRaisesRegex(TaskRunnerError, "stderr exceeded"):
            runner._run_stdio([sys.executable, "-c", script], "{}", 5)


if __name__ == "__main__":
    unittest.main()
