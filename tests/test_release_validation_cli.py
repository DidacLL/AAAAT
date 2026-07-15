from __future__ import annotations

import contextlib
import io
import unittest

from aaaat.release_validation_cli import build_parser


class ReleaseValidationCliTests(unittest.TestCase):
    def test_help_exposes_provider_neutral_profiles_only(self) -> None:
        output = io.StringIO()
        with self.assertRaises(SystemExit) as raised, contextlib.redirect_stdout(output):
            build_parser().parse_args(["--help"])
        self.assertEqual(raised.exception.code, 0)
        help_text = output.getvalue().lower()
        self.assertIn("deterministic,custom", help_text)
        self.assertIn("--command-json", help_text)
        self.assertNotIn("llama", help_text)
        self.assertNotIn("ollama", help_text)
        self.assertNotIn("--endpoint", help_text)
        self.assertNotIn("--model", help_text)

    def test_custom_profile_accepts_one_explicit_command(self) -> None:
        args = build_parser().parse_args(["--runtime", "custom", "--command-json", '["connector", "--fixed"]'])
        self.assertEqual(args.runtime, "custom")
        self.assertEqual(args.command_json, '["connector", "--fixed"]')


if __name__ == "__main__":
    unittest.main()
