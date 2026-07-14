from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.local_model_protocol import build_local_model_prompt, extract_json_object
from aaaat.provider_adapters import (
    RECOMMENDED_OLLAMA_MODEL,
    adapter_health,
    standard_local_settings,
    validate_adapter_settings,
)
from aaaat.task_runner import TaskRunner


class LocalModelCommunicationTests(unittest.TestCase):
    def test_local_model_prompt_contains_only_bounded_context(self) -> None:
        context = {
            "task_handle": "opaque-handle",
            "task": {"task_type": "field_inference"},
            "context": {"offer": "Fake offer"},
            "permitted_actions": ["submit_result"],
        }
        prompt = json.loads(build_local_model_prompt(context))
        self.assertEqual(prompt["protocol"], "aaaat.local-task")
        self.assertEqual(prompt["task"], context)
        serialized = json.dumps(prompt)
        for forbidden in ("application_id", "candidature_id", "database_path", "artifact_id"):
            self.assertNotIn(forbidden, serialized)

    def test_result_extractor_accepts_one_object_and_rejects_extra_text(self) -> None:
        self.assertEqual(json.loads(extract_json_object('{"result":"ok"}')), {"result": "ok"})
        self.assertEqual(
            json.loads(extract_json_object('```json\n{"result":"ok"}\n```')),
            {"result": "ok"},
        )
        with self.assertRaisesRegex(ValueError, "text after"):
            extract_json_object('{"result":"ok"} explanation')
        with self.assertRaisesRegex(ValueError, "one JSON object"):
            extract_json_object('[{"result":"ok"}]')

    def test_standard_ollama_settings_are_simple_but_overridable(self) -> None:
        defaults = standard_local_settings("ollama_cli")
        self.assertEqual(
            defaults,
            {
                "model": RECOMMENDED_OLLAMA_MODEL,
                "executable": "ollama",
                "args": [],
                "timeout_seconds": 600,
            },
        )
        custom = validate_adapter_settings("ollama_cli", {"model": "local:test", "timeout_seconds": 12})
        self.assertEqual(custom["model"], "local:test")
        self.assertEqual(custom["executable"], "ollama")
        self.assertEqual(custom["timeout_seconds"], 12)

    def test_ollama_runner_uses_cli_stdin_and_returns_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            runner = TaskRunner(Path(tmp))
            completed = subprocess.CompletedProcess(
                args=["ollama"],
                returncode=0,
                stdout='{"result":"complete"}\n',
                stderr="",
            )
            with patch("aaaat.task_runner.subprocess.run", return_value=completed) as run:
                body, provenance = runner._execute_adapter(
                    "ollama_cli",
                    {"model": "qwen:test", "executable": "ollama", "args": [], "timeout_seconds": 30},
                    {"task_handle": "opaque"},
                )
        self.assertEqual(json.loads(body), {"result": "complete"})
        self.assertEqual(
            provenance,
            {
                "agent_name": "qwen:test",
                "agent_runtime": "ollama-cli",
                "model_provider": "ollama:qwen:test",
            },
        )
        argv = run.call_args.args[0]
        self.assertEqual(argv, ["ollama", "run", "qwen:test"])
        self.assertEqual(json.loads(run.call_args.kwargs["input"])["task"]["task_handle"], "opaque")

    def test_llama_cpp_runner_uses_one_temporary_prompt_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            model = root / "model.gguf"
            model.write_bytes(b"fake")
            runner = TaskRunner(root)
            completed = subprocess.CompletedProcess(
                args=["llama-cli"],
                returncode=0,
                stdout='{"result":"complete"}',
                stderr="",
            )
            captured_prompt = ""

            def fake_run(argv: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
                nonlocal captured_prompt
                prompt_path = Path(argv[argv.index("--file") + 1])
                captured_prompt = prompt_path.read_text(encoding="utf-8")
                return completed

            with patch("aaaat.task_runner.subprocess.run", side_effect=fake_run):
                body, provenance = runner._execute_adapter(
                    "llama_cpp_cli",
                    {"model_path": str(model), "executable": "llama-cli", "args": [], "timeout_seconds": 30},
                    {"task_handle": "opaque"},
                )
        self.assertEqual(json.loads(body), {"result": "complete"})
        self.assertEqual(json.loads(captured_prompt)["task"]["task_handle"], "opaque")
        self.assertEqual(provenance["agent_runtime"], "llama.cpp-cli")
        self.assertEqual(provenance["model_provider"], "llama.cpp:model.gguf")

    def test_health_probe_executes_cli_and_reports_failure(self) -> None:
        with patch("aaaat.provider_adapters.shutil.which", return_value="/usr/bin/ollama"), patch(
            "aaaat.provider_adapters.subprocess.run",
            return_value=subprocess.CompletedProcess(args=[], returncode=2, stdout="", stderr="broken runtime"),
        ):
            health = adapter_health("ollama_cli", {"model": "qwen:test"})
        self.assertEqual(health["status"], "error")
        self.assertIn("broken runtime", health["message"])
        self.assertIs(health["local_only"], True)


if __name__ == "__main__":
    unittest.main()
