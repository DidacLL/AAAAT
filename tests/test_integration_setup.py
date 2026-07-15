from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.integration_setup import (
    configure_integration,
    connection_modes,
    current_integration,
    disable_automatic_integration,
    integration_options,
)
from aaaat.provider_adapters import adapter_capabilities
from aaaat.workspace_config import load_workspace_config


class IntegrationSetupTests(unittest.TestCase):
    def test_connection_modes_are_user_intent_first(self) -> None:
        modes = connection_modes()
        self.assertEqual(
            [item["id"] for item in modes],
            ["manual", "automatic", "browser_or_files", "advanced"],
        )
        self.assertEqual(modes[0]["title"], "Continue manually")
        self.assertEqual(modes[1]["title"], "Connect my AI")
        self.assertEqual(modes[2]["title"], "Use a browser or chat AI")
        self.assertNotIn("llama", " ".join(item["title"].lower() for item in modes))
        self.assertNotIn("ollama", " ".join(item["title"].lower() for item in modes))

    def test_options_expose_capabilities_without_making_vendor_metadata_core(self) -> None:
        options = integration_options(include_advanced=True)
        ids = {item["id"] for item in options}
        self.assertIn("llama_cpp_server", ids)
        self.assertIn("argv_custom_command", ids)
        self.assertIn("manual_external_agent", ids)
        http = next(item for item in options if item["id"] == "llama_cpp_server")
        command = next(item for item in options if item["id"] == "argv_custom_command")
        self.assertEqual(http["capabilities"]["transport_kind"], "http")
        self.assertEqual(command["capabilities"]["transport_kind"], "stdio")
        self.assertTrue(command["capabilities"]["progress"])
        self.assertEqual(http["network_access"], http["capabilities"]["network_access"])

    def test_capabilities_are_declared_by_adapter_not_inferred_by_runner(self) -> None:
        manual = adapter_capabilities("manual_external_agent")
        automatic = adapter_capabilities("llama_cpp_server")
        self.assertFalse(manual["automatic"])
        self.assertEqual(manual["transport_kind"], "portable_bundle")
        self.assertTrue(automatic["automatic"])
        self.assertEqual(automatic["credential_ownership"], "external-host")
        self.assertEqual(automatic["disclosure"], "user-approved-bounded-context")

    def test_failed_health_does_not_replace_current_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            before = current_integration(storage)
            with patch("aaaat.integration_setup.adapter_health", return_value={"status": "error", "message": "runtime unavailable"}):
                result = configure_integration(storage, "llama_cpp_server", {"endpoint": "http://127.0.0.1:8080", "model": "local"})
            self.assertFalse(result["saved"])
            self.assertEqual(result["capabilities"]["transport_kind"], "http")
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
            current = current_integration(storage)
            self.assertEqual(current["capabilities"]["transport_kind"], "http")
            disabled = disable_automatic_integration(storage)
            self.assertEqual(disabled["id"], "manual_external_agent")
            self.assertFalse(disabled["capabilities"]["automatic"])


if __name__ == "__main__":
    unittest.main()
