from __future__ import annotations

import unittest

from aaaat.subprocess_output import clean_subprocess_text, subprocess_failure_message


class SubprocessOutputTests(unittest.TestCase):
    def test_terminal_spinner_is_removed_from_runtime_error(self) -> None:
        raw = "\x1b[?25l\r⠙ \x1b[K\r⠹ \x1b[K\rError: configured command failed\x1b[?25h"
        self.assertEqual(clean_subprocess_text(raw), "Error: configured command failed")
        self.assertIn("configured command failed", subprocess_failure_message(raw, "", 1))

    def test_stderr_is_used_when_stdout_is_empty(self) -> None:
        self.assertIn("failure detail", subprocess_failure_message("", "failure detail", 2))


if __name__ == "__main__":
    unittest.main()
