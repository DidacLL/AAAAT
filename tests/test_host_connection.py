from __future__ import annotations

import io
import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from aaaat.db import connect, ensure_workspace_database
from aaaat.host_bridge import _desktop_launch_command, run_host_bridge
from aaaat.host_connection import (
    HostConnectionError,
    connection_handoff_message,
    connection_status,
    create_connection,
    create_connection_request,
    export_host_pack,
    revoke_connection,
    revoke_workspace_connections,
    runtime_skill_document,
)
from aaaat.tasks import create_task, get_task


class HostConnectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.workspace = Path(self.temp.name) / "workspace"
        self.registry = Path(self.temp.name) / "registry.json"
        self.environment = patch.dict(os.environ, {"AAAAT_CONNECTION_REGISTRY": str(self.registry)})
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_runtime_skill_is_packaged_without_private_paths(self) -> None:
        skill = runtime_skill_document()
        self.assertIn("name: AAAAT", skill)
        self.assertNotIn(".private", skill)
        self.assertNotIn("sqlite", skill.lower())

    def test_exported_host_pack_keeps_workspace_details_out_of_host_configuration(self) -> None:
        pack = Path(self.temp.name) / "host-integration"
        self.assertEqual(export_host_pack(self.workspace, pack), {"status": "ready"})
        payload = (pack / "AAAAT" / "aaaat-connection.json").read_text(encoding="utf-8")
        decoded = json.loads(payload)
        self.assertTrue((pack / "AAAAT" / "SKILL.md").exists())
        self.assertEqual(decoded["version"], 1)
        self.assertIn("aaaat-host-bridge", payload)
        self.assertNotIn(str(self.workspace), payload)
        self.assertNotIn(".private", payload)

    def test_pairing_is_opaque_and_status_changes_after_verification_and_revocation(self) -> None:
        paired = create_connection(self.workspace)
        capability = paired["connection_capability"]
        self.assertTrue(capability.startswith("hostcap_"))
        self.assertEqual(paired["state"], "ready")
        self.assertEqual(connection_status(self.workspace), {"state": "ready_to_connect"})

        source = io.StringIO("\n".join(json.dumps(request) for request in (
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            {"jsonrpc": "2.0", "id": 3, "method": "ping", "params": {}},
        )) + "\n")
        target = io.StringIO()
        self.assertEqual(run_host_bridge(capability, source, target), 0)
        self.assertEqual(connection_status(self.workspace), {"state": "connected"})
        self.assertEqual(revoke_connection(capability), {"state": "paused"})
        self.assertEqual(connection_status(self.workspace), {"state": "paused"})
        with self.assertRaises(HostConnectionError):
            run_host_bridge(capability, io.StringIO(), io.StringIO())

    def test_connection_request_is_for_the_explicit_workspace_and_replaces_an_old_card(self) -> None:
        first = create_connection_request(self.workspace)
        second = create_connection_request(self.workspace)
        self.assertEqual(first["protocol"], "aaaat.host-connection")
        self.assertEqual(second["version"], 1)
        self.assertNotEqual(first["connection_capability"], second["connection_capability"])
        self.assertNotIn(str(self.workspace), json.dumps(second))
        with self.assertRaises(HostConnectionError):
            run_host_bridge(first["connection_capability"], io.StringIO(), io.StringIO())

    def test_fresh_host_handoff_is_self_contained_without_private_workspace_details(self) -> None:
        handoff = connection_handoff_message(self.workspace)
        self.assertIn("name: AAAAT", handoff)
        command = json.loads(handoff.split("```json\n", 1)[1].split("\n```", 1)[0])["mcp"]["command"]
        self.assertEqual(Path(command).name, "aaaat-host-bridge")
        self.assertIn('"tools"', handoff)
        self.assertIn('"fallback"', handoff)
        self.assertIn('"protocol": "aaaat.host-connection"', handoff)
        self.assertIn("hostcap_", handoff)
        self.assertNotIn(str(self.workspace), handoff)
        self.assertNotIn(".private", handoff)
        self.assertNotIn("sqlite", handoff.lower())

    def test_desktop_can_revoke_workspace_without_learning_host_capability(self) -> None:
        create_connection(self.workspace)
        self.assertEqual(revoke_workspace_connections(self.workspace), {"state": "paused"})
        self.assertEqual(connection_status(self.workspace), {"state": "paused"})

    def test_stale_pairing_is_rejected_without_revealing_its_workspace(self) -> None:
        paired = create_connection(self.workspace)
        registry = json.loads(self.registry.read_text(encoding="utf-8"))
        entry = next(iter(registry["connections"].values()))
        entry["created_at"] = (datetime.now(timezone.utc) - timedelta(days=31)).replace(microsecond=0).isoformat()
        self.registry.write_text(json.dumps(registry), encoding="utf-8")
        with self.assertRaisesRegex(HostConnectionError, "Pair again") as failure:
            run_host_bridge(paired["connection_capability"], io.StringIO(), io.StringIO())
        self.assertNotIn(str(self.workspace), str(failure.exception))

    def test_revocation_during_a_running_bridge_returns_a_safe_mcp_error(self) -> None:
        paired = create_connection(self.workspace)
        capability = paired["connection_capability"]

        class RevokingInput:
            def __init__(self) -> None:
                self.lines = iter((
                    json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}) + "\n",
                    json.dumps({"jsonrpc": "2.0", "id": 2, "method": "ping", "params": {}}) + "\n",
                ))
                self.count = 0

            def __iter__(self) -> "RevokingInput":
                return self

            def __next__(self) -> str:
                if self.count == 1:
                    revoke_connection(capability)
                self.count += 1
                return next(self.lines)

        target = io.StringIO()
        run_host_bridge(capability, RevokingInput(), target)
        responses = [json.loads(line) for line in target.getvalue().splitlines()]
        self.assertEqual(responses[-1]["error"]["code"], -32001)
        self.assertNotIn(str(self.workspace), target.getvalue())

    def test_bridge_verification_does_not_claim_work_then_uses_canonical_mcp_services(self) -> None:
        paired = create_connection(self.workspace)
        capability = paired["connection_capability"]
        with connect(self.workspace) as conn:
            task = create_task(conn, "keyword_definition", "Define bridge", context_hint="keyword:bridge", idempotent=False)

        verify = io.StringIO(
            "\n".join(
                json.dumps(request)
                for request in (
                    {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
                    {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
                    {"jsonrpc": "2.0", "id": 3, "method": "ping", "params": {}},
                )
            ) + "\n"
        )
        target = io.StringIO()
        run_host_bridge(capability, verify, target)
        responses = [json.loads(line) for line in target.getvalue().splitlines()]
        self.assertEqual([response["id"] for response in responses], [1, 2, 3])
        with connect(self.workspace) as conn:
            self.assertEqual(get_task(conn, task["id"])["state"], "queued")

        claim = {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "get_next_agent_work", "arguments": {}}}
        target = io.StringIO()
        run_host_bridge(capability, io.StringIO(json.dumps(claim) + "\n"), target)
        self.assertEqual(json.loads(target.getvalue())["error"]["code"], -32002)

        source = io.StringIO("\n".join((
            json.dumps({"jsonrpc": "2.0", "id": 10, "method": "initialize", "params": {}}),
            json.dumps({"jsonrpc": "2.0", "id": 11, "method": "tools/list", "params": {}}),
            json.dumps({"jsonrpc": "2.0", "id": 12, "method": "ping", "params": {}}),
            json.dumps(claim),
        )) + "\n")
        target = io.StringIO()
        run_host_bridge(capability, source, target)
        result = json.loads(target.getvalue().splitlines()[-1])["result"]["structuredContent"]
        self.assertEqual(result["status"], "ready")
        task_capability = result["work"]["task"]["task_capability"]

        submit = {
            "jsonrpc": "2.0", "id": 5, "method": "tools/call",
            "params": {"name": "submit_agent_task_result", "arguments": {"task_capability": task_capability, "result_json": {"definition": "A paired local bridge."}}},
        }
        source = io.StringIO("\n".join((
            json.dumps({"jsonrpc": "2.0", "id": 20, "method": "initialize", "params": {}}),
            json.dumps({"jsonrpc": "2.0", "id": 21, "method": "tools/list", "params": {}}),
            json.dumps({"jsonrpc": "2.0", "id": 22, "method": "ping", "params": {}}),
            json.dumps(submit),
        )) + "\n")
        target = io.StringIO()
        run_host_bridge(capability, source, target)
        submitted_response = json.loads(target.getvalue().splitlines()[-1])
        self.assertFalse(submitted_response["result"]["isError"])
        acknowledgement = submitted_response["result"]["structuredContent"]["acknowledgement"]
        self.assertEqual(
            acknowledgement,
            {
                "status": "accepted",
                "state": "completed",
                "released_work": 0,
                "next": ["continue_or_open_desktop"],
            },
        )
        serialized_acknowledgement = json.dumps(acknowledgement)
        for forbidden in ("task_id", "application_id", "result_blob_id", "created_by", "notes"):
            self.assertNotIn(forbidden, serialized_acknowledgement)
        with connect(self.workspace) as conn:
            self.assertEqual(get_task(conn, task["id"])["state"], "completed")

    def test_public_pairing_and_bridge_envelopes_do_not_reveal_registry_or_workspace(self) -> None:
        paired = create_connection(self.workspace)
        capability = paired["connection_capability"]
        self.assertNotIn(str(self.workspace), json.dumps(paired))
        self.assertNotIn(capability, self.registry.read_text(encoding="utf-8"))

        target = io.StringIO()
        run_host_bridge(capability, io.StringIO('{"bad":true}\n'), target)
        payload = target.getvalue()
        self.assertNotIn(str(self.workspace), payload)
        self.assertNotIn(capability, payload)
        self.assertNotIn("sqlite", payload.lower())

    def test_mcp_failures_are_safe_even_when_a_service_raises_with_private_text(self) -> None:
        paired = create_connection(self.workspace)
        private_text = f"sqlite failure at {self.workspace}"
        with patch("aaaat.mcp_runtime._call_tool", side_effect=RuntimeError(private_text)):
            source = io.StringIO("\n".join((
                json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}),
                json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}),
                json.dumps({"jsonrpc": "2.0", "id": 3, "method": "ping", "params": {}}),
                json.dumps({"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "get_next_agent_work", "arguments": {}}}),
            )) + "\n")
            target = io.StringIO()
            run_host_bridge(paired["connection_capability"], source, target)
        payload = target.getvalue()
        self.assertIn("AAAAT could not complete this request.", payload)
        self.assertNotIn(private_text, payload)
        self.assertNotIn(str(self.workspace), payload)

    def test_paired_bridge_exposes_only_named_actions_and_opens_desktop_without_a_path(self) -> None:
        paired = create_connection(self.workspace)
        requests = (
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            {"jsonrpc": "2.0", "id": 3, "method": "ping", "params": {}},
            {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "open_workspace", "arguments": {}}},
            {"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "submit_agent_action", "arguments": {}}},
            {"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "start_profile", "arguments": {}}},
        )
        target = io.StringIO()
        with patch("aaaat.host_bridge._launch_installed_desktop") as launch:
            run_host_bridge(
                paired["connection_capability"],
                io.StringIO("\n".join(json.dumps(item) for item in requests) + "\n"),
                target,
            )
        responses = [json.loads(line) for line in target.getvalue().splitlines()]
        tools = {tool["name"] for tool in responses[1]["result"]["tools"]}
        self.assertEqual(tools, {
            "get_next_agent_work", "submit_agent_task_result",
            "get_connection_status", "open_workspace", "start_profile", "create_candidature",
        })
        self.assertEqual(responses[3]["result"]["structuredContent"], {"status": "opening"})
        self.assertEqual(responses[4]["error"]["code"], -32601)
        self.assertEqual(responses[5]["result"]["structuredContent"]["status"], "accepted")
        launch.assert_called_once_with(str(self.workspace))
        self.assertNotIn(str(self.workspace), target.getvalue())

    def test_frozen_bridge_launches_the_sibling_desktop_without_exposing_its_path(self) -> None:
        with patch("aaaat.host_bridge.sys.executable", r"C:\AAAAT\bridge\aaaat-host-bridge.exe"), patch("aaaat.host_bridge.sys.frozen", True, create=True):
            command = _desktop_launch_command("private-storage")
        self.assertEqual(command[0], r"C:\AAAAT\AAAAT.exe")
        self.assertEqual(command[1:], ["--storage", "private-storage"])


if __name__ == "__main__":
    unittest.main()
