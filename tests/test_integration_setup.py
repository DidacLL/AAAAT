from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.integration_setup import (
    configure_integration,
    current_integration,
    disconnect_integration,
    integration_health,
    integration_options,
)
from aaaat.workspace_config import load_workspace_config


class IntegrationSetupTests(unittest.TestCase):
    def test_default_options_expose_only_the_local_no_connection_state(self) -> None:
        self.assertEqual([item["id"] for item in integration_options()], ["no_ai_connection"])

    def test_advanced_methods_are_fixed_provider_neutral_primitives(self) -> None:
        options = integration_options(include_advanced=True)
        ids = {item["id"] for item in options}
        self.assertEqual(ids, {"no_ai_connection", "portable_bundle", "file_exchange", "user_command"})
        command = next(item for item in options if item["id"] == "user_command")
        self.assertTrue(command["automatic"])
        field_keys = {field["key"] for item in options for field in item["fields"]}
        self.assertEqual(field_keys, {"directory", "argv", "timeout_seconds"})

    def test_failed_command_validation_does_not_replace_current_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            before = current_integration(storage)
            result = configure_integration(storage, "user_command", {"argv": ["missing-aaaat-command"]})
            self.assertFalse(result["saved"])
            self.assertEqual(current_integration(storage)["id"], before["id"])

    def test_ready_user_command_is_persisted_and_can_be_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            with patch("aaaat.integration_setup.shutil.which", return_value=sys.executable):
                result = configure_integration(
                    storage,
                    "user_command",
                    {"argv": [sys.executable], "timeout_seconds": 30},
                )
            self.assertTrue(result["saved"])
            selected = load_workspace_config(storage)["integration"]
            self.assertEqual(selected["id"], "user_command")
            self.assertEqual(integration_health("portable_bundle")["status"], "ready")
            disabled = disconnect_integration(storage)
            self.assertEqual(disabled["id"], "no_ai_connection")


if __name__ == "__main__":
    unittest.main()
