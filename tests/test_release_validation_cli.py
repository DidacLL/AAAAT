from __future__ import annotations

import contextlib
import io
import unittest

from aaaat.release_validation_cli import ProviderNeutralReleaseValidator, build_parser
from aaaat.release_validation import ValidationConfig
from pathlib import Path


class ReleaseValidationCliTests(unittest.TestCase):
    def test_help_exposes_provider_neutral_profiles_only(self) -> None:
        output = io.StringIO()
        with self.assertRaises(SystemExit) as raised, contextlib.redirect_stdout(output):
            build_parser().parse_args(["--help"])
        self.assertEqual(raised.exception.code, 0)
        help_text = output.getvalue()
        self.assertIn("deterministic,llama-cpp,custom", help_text)
        self.assertIn("--endpoint", help_text)
        self.assertIn("--model", help_text)
        self.assertNotIn("ollama", help_text.lower())
        self.assertNotIn("--model-path", help_text)
        self.assertNotIn("--runtime-arg", help_text)

    def test_llama_cpp_profile_maps_to_server_adapter(self) -> None:
        validator = ProviderNeutralReleaseValidator(
            ValidationConfig(
                storage=Path("private"),
                evidence_dir=Path("evidence"),
                runtime="llama-cpp",
                model="qwen-local",
                executable="http://127.0.0.1:9090",
                timeout_seconds=30,
            )
        )
        adapter_id, settings = validator._runtime_settings()
        self.assertEqual(adapter_id, "llama_cpp_server")
        self.assertEqual(settings["endpoint"], "http://127.0.0.1:9090")
        self.assertEqual(settings["model"], "qwen-local")
        self.assertEqual(settings["timeout_seconds"], 30)


if __name__ == "__main__":
    unittest.main()
