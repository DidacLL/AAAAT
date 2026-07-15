from __future__ import annotations

import contextlib
import io
import unittest

from aaaat.browser_companion import main as browser_host_main
from aaaat.runtime_conformance import _runtime_preflight
from aaaat.subprocess_output import clean_subprocess_text, subprocess_failure_message


class LocalRuntimeDiagnosticsTests(unittest.TestCase):
    def test_terminal_spinner_is_removed_from_runtime_error(self) -> None:
        raw = "\x1b[?25l\r⠙ \x1b[K\r⠹ \x1b[K\rError: configured model was not found\x1b[?25h"
        self.assertEqual(clean_subprocess_text(raw), "Error: configured model was not found")
        self.assertIn("configured model was not found", subprocess_failure_message(raw, "", 1))

    def test_provider_neutral_preflight_validates_adapter_settings(self) -> None:
        result = _runtime_preflight(
            "argv_custom_command",
            {"argv": ["local-runtime-connector", "--fixed"], "timeout_seconds": 30},
        )
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["adapter_id"], "argv_custom_command")

    def test_provider_neutral_preflight_rejects_invalid_settings(self) -> None:
        result = _runtime_preflight("argv_custom_command", {"argv": [], "timeout_seconds": 30})
        self.assertEqual(result["status"], "error")
        self.assertIn("required", result["message"].lower())

    def test_browser_host_self_test_does_not_block(self) -> None:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(browser_host_main(["--self-test"]), 0)
        self.assertIn('"listening_port": false', output.getvalue().lower())


if __name__ == "__main__":
    unittest.main()
