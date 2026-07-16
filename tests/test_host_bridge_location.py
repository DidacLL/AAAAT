from __future__ import annotations

import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.host_bridge import run_host_bridge
from aaaat.host_connection import bridge_launch_contract, create_connection, export_host_pack, host_bridge_executable


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

    def test_paired_initialize_advertises_tools_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            workspace = root / "private-workspace"
            registry = root / "connections.json"
            with patch.dict(os.environ, {"AAAAT_CONNECTION_REGISTRY": str(registry)}):
                capability = create_connection(workspace)["connection_capability"]
                source = io.StringIO(
                    json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}) + "\n"
                )
                target = io.StringIO()
                run_host_bridge(capability, source, target)

        response = json.loads(target.getvalue())
        capabilities = response["result"]["capabilities"]
        self.assertEqual(capabilities, {"tools": {"listChanged": False}})
        self.assertEqual(response["result"]["serverInfo"]["name"], "aaaat-host-bridge")
        self.assertNotIn("resources", json.dumps(response))


if __name__ == "__main__":
    unittest.main()
