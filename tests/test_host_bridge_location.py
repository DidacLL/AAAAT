from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.host_connection import bridge_launch_contract, export_host_pack, host_bridge_executable


class HostBridgeLocationTests(unittest.TestCase):
    def test_configured_bridge_location_is_used_for_host_only_launch_material(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bridge = Path(tmp) / "installed-app" / "bridge" / "aaaat-host-bridge"
            with patch.dict(os.environ, {"AAAAT_HOST_BRIDGE_EXECUTABLE": str(bridge)}):
                self.assertEqual(host_bridge_executable(), str(bridge))
                contract = bridge_launch_contract("hostcap_" + "x" * 40)

        self.assertEqual(contract["command"], str(bridge))
        self.assertEqual(contract["arguments"][0], "--connection")
        self.assertNotIn("storage", json.dumps(contract).lower())
        self.assertNotIn("workspace", json.dumps(contract).lower())

    def test_exported_pack_contains_bridge_location_but_not_private_workspace(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            workspace = root / "private-workspace"
            integration = root / "host-integration"
            bridge = root / "installed-app" / "bridge" / "aaaat-host-bridge"
            with patch.dict(
                os.environ,
                {
                    "AAAAT_HOST_BRIDGE_EXECUTABLE": str(bridge),
                    "AAAAT_CONNECTION_REGISTRY": str(root / "connections.json"),
                },
            ):
                export_host_pack(workspace, integration)

            payload = (integration / "aaaat-job-research" / "aaaat-connection.json").read_text(encoding="utf-8")

        self.assertIn(str(bridge), payload)
        self.assertNotIn(str(workspace), payload)
        self.assertNotIn("sqlite", payload.lower())


if __name__ == "__main__":
    unittest.main()
