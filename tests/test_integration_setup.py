from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.integration_setup import (
    configure_integration,
    current_integration,
    disable_automatic_integration,
    integration_options,
)
from aaaat.workspace_config import load_workspace_config


class IntegrationSetupTests(unittest.TestCase):
    def test_options_expose_local_runtime_without_making_ollama_the_category(self) -> None:
        options = integration_options()
        ids = {item["id"] for item in options}
        self.assertIn("ollama_cli", ids)
        self.assertIn("llama_cpp_cli", ids)
        self.assertIn("manual_external_agent", ids)
        self.assertTrue(next(item for item in options if item["id"] == "ollama_cli")["standard_user"])

    def test_failed_health_does_not_replace_current_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            before = current_integration(storage)
            with patch(
                "aaaat.integration_setup.adapter_health",
                return_value={"status": "error", "message": "runtime unavailable"},
            ):
                result = configure_integration(storage, "ollama_cli", {"model": "recommended:test"})
            self.assertFalse(result["saved"])
            self.assertEqual(current_integration(storage)["id"], before["id"])

    def test_ready_configuration_is_persisted_and_can_be_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            with patch(
                "aaaat.integration_setup.adapter_health",
                return_value={"status": "ready", "message": "verified"},
            ):
                result = configure_integration(
                    storage,
                    "ollama_cli",
                    {"model": "recommended:test", "timeout_seconds": 30},
                )
            self.assertTrue(result["saved"])
            selected = load_workspace_config(storage)["local_agent_adapter"]
            self.assertEqual(selected["id"], "ollama_cli")
            self.assertEqual(selected["settings"]["model"], "recommended:test")
            disabled = disable_automatic_integration(storage)
            self.assertEqual(disabled["id"], "manual_external_agent")


if __name__ == "__main__":
    unittest.main()
