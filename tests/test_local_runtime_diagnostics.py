from __future__ import annotations

import contextlib
import io
import unittest
from unittest.mock import patch

from aaaat.browser_companion import main as browser_host_main
from aaaat.runtime_conformance import _ollama_model_names, _runtime_preflight
from aaaat.subprocess_output import clean_subprocess_text, subprocess_failure_message


class _Completed:
    def __init__(self, returncode: int = 0, stdout: str = "", stderr: str = "") -> None:
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


class LocalRuntimeDiagnosticsTests(unittest.TestCase):
    def test_terminal_spinner_is_removed_from_runtime_error(self) -> None:
        raw = "\x1b[?25l\r⠙ \x1b[K\r⠹ \x1b[K\rError: model 'missing:latest' not found\x1b[?25h"
        self.assertEqual(clean_subprocess_text(raw), "Error: model 'missing:latest' not found")
        self.assertIn("model 'missing:latest' not found", subprocess_failure_message(raw, "", 1))

    def test_ollama_model_names_parse_cli_table(self) -> None:
        output = "NAME ID SIZE MODIFIED\nqwen3:8b abc 5 GB now\nllama3.2:latest def 2 GB yesterday\n"
        self.assertEqual(_ollama_model_names(output), ["qwen3:8b", "llama3.2:latest"])

    @patch("aaaat.runtime_conformance.shutil.which", return_value="C:/Ollama/ollama.exe")
    @patch("aaaat.runtime_conformance.subprocess.run")
    def test_ollama_preflight_rejects_uninstalled_model(self, run, _which) -> None:
        run.return_value = _Completed(stdout="NAME ID SIZE MODIFIED\nqwen3:8b abc 5 GB now\n")
        result = _runtime_preflight("ollama_cli", {"executable": "ollama", "model": "qwen3.6"})
        self.assertEqual(result["status"], "error")
        self.assertIn("not installed", result["message"])
        self.assertIn("qwen3:8b", result["message"])

    def test_browser_host_self_test_does_not_block(self) -> None:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(browser_host_main(["--self-test"]), 0)
        self.assertIn('"listening_port": false', output.getvalue().lower())


if __name__ == "__main__":
    unittest.main()
