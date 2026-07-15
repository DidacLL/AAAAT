from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.local_model_protocol import build_local_model_prompt, extract_json_object
from aaaat.provider_adapters import adapter_health, standard_local_settings, validate_adapter_settings
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

    def test_result_extractor_accepts_one_object_inside_cli_noise(self) -> None:
        self.assertEqual(json.loads(extract_json_object('{"result":"ok"}')), {"result": "ok"})
        self.assertEqual(
            json.loads(extract_json_object('```json\n{"result":"ok"}\n```')),
            {"result": "ok"},
        )
        noisy = "Loading model...\navailable commands:\n> prompt\n{\"result\":\"ok\"}\n[ timing ]\nExiting..."
        self.assertEqual(json.loads(extract_json_object(noisy)), {"result": "ok"})

        with self.assertRaisesRegex(ValueError, "exactly one JSON object"):
            extract_json_object('{"result":"one"}\n{"result":"two"}')
        with self.assertRaisesRegex(ValueError, "valid JSON object"):
            extract_json_object("Loading model...\nOK\nExiting...")
        with self.assertRaisesRegex(ValueError, "valid JSON object"):
            extract_json_object('[{"result":"ok"}]')

    def test_llama_cpp_settings_require_explicit_local_model_file(self) -> None:
        defaults = standard_local_settings("llama_cpp_cli")
        self.assertEqual(
            defaults,
            {
                "model_path": "",
                "executable": "llama-cli",
                "args": [],
                "timeout_seconds": 600,
            },
        )
        with self.assertRaisesRegex(ValueError, "GGUF model file"):
            validate_adapter_settings("llama_cpp_cli", {})
        custom = validate_adapter_settings(
            "llama_cpp_cli",
            {"model_path": "model.gguf", "executable": "llama-cli", "timeout_seconds": 12},
        )
        self.assertEqual(custom["model_path"], "model.gguf")
        self.assertEqual(custom["timeout_seconds"], 12)

    def test_generic_command_runner_uses_bounded_stdin_and_fixed_argv(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            runner = TaskRunner(Path(tmp))
            completed = subprocess.CompletedProcess(
                args=["local-runtime-connector"],
                returncode=0,
                stdout='{"result":"complete"}\n',
                stderr="",
            )
            with patch("aaaat.task_runner.subprocess.run", return_value=completed) as run:
                body, provenance = runner._execute_adapter(
                    "argv_custom_command",
                    {"argv": ["local-runtime-connector", "--fixed"], "timeout_seconds": 30},
                    {"task_handle": "opaque"},
                )
        self.assertEqual(json.loads(body), {"result": "complete"})
        self.assertEqual(provenance, {"agent_runtime": "user-owned-command"})
        self.assertEqual(run.call_args.args[0], ["local-runtime-connector", "--fixed"])
        self.assertEqual(json.loads(run.call_args.kwargs["input"])["task_handle"], "opaque")

    def test_llama_cpp_runner_uses_one_temporary_prompt_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            model = root / "model.gguf"
            model.write_bytes(b"fake")
            runner = TaskRunner(root)
            completed = subprocess.CompletedProcess(
                args=["llama-cli"],
                returncode=0,
                stdout='Loading model...\n{"result":"complete"}\nExiting...',
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

    def test_health_probe_executes_selected_local_cli_and_reports_failure(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            model = Path(tmp) / "model.gguf"
            model.write_bytes(b"fake")
            with patch("aaaat.provider_adapters.shutil.which", return_value="/usr/bin/llama-cli"), patch(
                "aaaat.provider_adapters.subprocess.run",
                return_value=subprocess.CompletedProcess(args=[], returncode=2, stdout="", stderr="broken runtime"),
            ):
                health = adapter_health("llama_cpp_cli", {"model_path": str(model)})
        self.assertEqual(health["status"], "error")
        self.assertIn("broken runtime", health["message"])
        self.assertIs(health["local_only"], True)
        self.assertEqual(health["network_access"], "none")


if __name__ == "__main__":
    unittest.main()
