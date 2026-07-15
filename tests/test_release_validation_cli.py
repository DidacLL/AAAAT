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
        help_text = output.getvalue()
        self.assertIn("deterministic,llama-cpp,custom", help_text)
        self.assertNotIn("ollama", help_text.lower())
        self.assertNotIn("--model MODEL", help_text)

    def test_runtime_args_json_accepts_option_like_values(self) -> None:
        args = build_parser().parse_args(
            [
                "--runtime",
                "llama-cpp",
                "--runtime-args-json",
                '["--no-display-prompt","--n-predict","2048"]',
            ]
        )
        self.assertEqual(
            args.runtime_args_json,
            '["--no-display-prompt","--n-predict","2048"]',
        )


if __name__ == "__main__":
    unittest.main()
