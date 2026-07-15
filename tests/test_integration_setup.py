from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.integration_setup import configure_integration, connection_modes, current_integration, disable_automatic_integration, integration_options
from aaaat.provider_adapters import adapter_capabilities
from aaaat.workspace_config import load_workspace_config


class IntegrationSetupTests(unittest.TestCase):
    def test_connection_modes_are_user_intent_first(self) -> None:
        modes = connection_modes()
        self.assertEqual([item["id"] for item in modes], ["manual", "guided_connector", "browser_or_chat", "advanced_integration"])
        self.assertEqual(modes[1]["adapter_ids"], [])
        self.assertEqual(modes[3]["adapter_ids"], ["file_exchange", "argv_custom_command"])

    def test_default_options_expose_only_portable_exchange(self) -> None:
        self.assertEqual([item["id"] for item in integration_options()], ["manual_external_agent"])

    def test_advanced_options_are_provider_neutral(self) -> None:
        options = integration_options(include_advanced=True)
        ids = {item["id"] for item in options}
        self.assertEqual(ids, {"manual_external_agent", "file_exchange", "argv_custom_command"})
        command = next(item for item in options if item["id"] == "argv_custom_command")
        self.assertEqual(command["capabilities"]["transport_kind"], "stdio")
        self.assertTrue(command["capabilities"]["progress"])
        serialized = str(options).lower()
        for forbidden in ("llama", "ollama", "codex", "model name", "endpoint"):
            self.assertNotIn(forbidden, serialized)

    def test_capabilities_are_declared_by_generic_adapter(self) -> None:
        manual = adapter_capabilities("manual_external_agent")
        command = adapter_capabilities("argv_custom_command")
        self.assertFalse(manual["automatic"])
        self.assertEqual(manual["transport_kind"], "portable_bundle")
        self.assertTrue(command["automatic"])
        self.assertEqual(command["credential_ownership"], "external-host")

    def test_failed_health_does_not_replace_current_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            before = current_integration(storage)
            with patch("aaaat.integration_setup.adapter_health", return_value={"status": "error", "message": "command unavailable"}):
                result = configure_integration(storage, "argv_custom_command", {"argv": ["missing"]})
            self.assertFalse(result["saved"])
            self.assertEqual(current_integration(storage)["id"], before["id"])

    def test_ready_generic_command_is_persisted_and_can_be_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            with patch("aaaat.integration_setup.adapter_health", return_value={"status": "ready", "message": "verified"}):
                result = configure_integration(storage, "argv_custom_command", {"argv": ["connector"], "timeout_seconds": 30})
            self.assertTrue(result["saved"])
            selected = load_workspace_config(storage)["local_agent_adapter"]
            self.assertEqual(selected["id"], "argv_custom_command")
            disabled = disable_automatic_integration(storage)
            self.assertEqual(disabled["id"], "manual_external_agent")


if __name__ == "__main__":
    unittest.main()
