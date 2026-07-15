from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.integration_setup import configure_integration, current_integration, disable_automatic_integration, integration_options
from aaaat.workspace_config import load_workspace_config


class IntegrationSetupTests(unittest.TestCase):
    def test_options_expose_provider_neutral_local_runtime_paths(self) -> None:
        options = integration_options(include_advanced=True)
        ids = {item["id"] for item in options}
        self.assertIn("llama_cpp_server", ids)
        self.assertNotIn("llama_cpp_cli", ids)
        self.assertIn("argv_custom_command", ids)
        self.assertIn("manual_external_agent", ids)
        self.assertTrue(next(item for item in options if item["id"] == "llama_cpp_server")["standard_user"])
        self.assertFalse(next(item for item in options if item["id"] == "ollama_cli")["standard_user"])

    def test_failed_health_does_not_replace_current_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            before = current_integration(storage)
            with patch("aaaat.integration_setup.adapter_health", return_value={"status": "error", "message": "runtime unavailable"}):
                result = configure_integration(storage, "llama_cpp_server", {"endpoint": "http://127.0.0.1:8080", "model": "local"})
            self.assertFalse(result["saved"])
            self.assertEqual(current_integration(storage)["id"], before["id"])

    def test_ready_configuration_is_persisted_and_can_be_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            with patch("aaaat.integration_setup.adapter_health", return_value={"status": "ready", "message": "verified"}):
                result = configure_integration(storage, "llama_cpp_server", {"endpoint": "http://127.0.0.1:8080", "model": "local", "timeout_seconds": 30})
            self.assertTrue(result["saved"])
            selected = load_workspace_config(storage)["local_agent_adapter"]
            self.assertEqual(selected["id"], "llama_cpp_server")
            self.assertEqual(selected["settings"]["endpoint"], "http://127.0.0.1:8080")
            disabled = disable_automatic_integration(storage)
            self.assertEqual(disabled["id"], "manual_external_agent")


if __name__ == "__main__":
    unittest.main()
