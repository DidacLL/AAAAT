from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.db import connect, init_db
from aaaat.task_runner import TaskRunner, TaskRunnerError
from aaaat.tasks import create_task
from aaaat.workspace_config import save_workspace_settings


class RuntimeOutputAndProgressTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.storage = Path(self.temporary.name) / "private"
        init_db(self.storage)
        save_workspace_settings(
            self.storage,
            automatic_preparation=[],
            local_agent_adapter_id="argv_custom_command",
            local_agent_adapter_settings={"argv": ["fake-runner"], "timeout_seconds": 5},
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_structured_stderr_progress_is_forwarded_and_persisted(self) -> None:
        with connect(self.storage) as conn:
            task = create_task(conn, "field_inference", "Extract", context_hint="candidature:extraction")
        events: list[dict] = []
        completed = subprocess.CompletedProcess(
            args=["fake-runner"],
            returncode=0,
            stdout='{"fields":{}}',
            stderr='diagnostic\n{"type":"progress","message":"Reading source","percent":40}\n',
        )
        with patch("aaaat.task_runner.subprocess.run", return_value=completed):
            TaskRunner(self.storage, on_progress=events.append).run(str(task["id"]))
        self.assertTrue(any(event["phase"] == "runtime_progress" for event in events))
        progress_path = self.storage / "task-progress" / f"{task['id']}.ndjson"
        self.assertTrue(progress_path.is_file())
        stored = [json.loads(line) for line in progress_path.read_text(encoding="utf-8").splitlines()]
        self.assertEqual(stored[-1]["phase"], "completed")

    def test_oversized_stdout_is_rejected(self) -> None:
        runner = TaskRunner(self.storage)
        completed = subprocess.CompletedProcess(
            args=["fake-runner"],
            returncode=0,
            stdout="x" * 2_000_001,
            stderr="",
        )
        with patch("aaaat.task_runner.subprocess.run", return_value=completed):
            with self.assertRaisesRegex(TaskRunnerError, "stdout exceeded"):
                runner._run_stdio(["fake-runner"], "{}", 5)

    def test_oversized_stderr_is_rejected(self) -> None:
        runner = TaskRunner(self.storage)
        completed = subprocess.CompletedProcess(
            args=["fake-runner"],
            returncode=0,
            stdout='{"result":"ok"}',
            stderr="x" * 500_001,
        )
        with patch("aaaat.task_runner.subprocess.run", return_value=completed):
            with self.assertRaisesRegex(TaskRunnerError, "stderr exceeded"):
                runner._run_stdio(["fake-runner"], "{}", 5)


if __name__ == "__main__":
    unittest.main()
