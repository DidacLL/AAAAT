from __future__ import annotations

import io
import json
import tempfile
import unittest
from unittest.mock import patch

from aaaat.db import connect, init_db
from aaaat.mcp_runtime import dispatch_mcp_request, run_stdio_server
from aaaat.mcp_smoke import run_mcp_smoke
from aaaat.host_bridge_smoke import _installed_bridge_argv, run_host_bridge_smoke
from aaaat.tasks import create_task, get_task


class McpRuntimeTests(unittest.TestCase):
    def test_initialize_and_tools_list_match_operational_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            initialized = dispatch_mcp_request(tmp, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
            self.assertEqual(initialized["result"]["serverInfo"]["name"], "aaaat")
            listed = dispatch_mcp_request(tmp, {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
            names = {item["name"] for item in listed["result"]["tools"]}
            self.assertEqual(
                names,
                {"get_next_agent_work", "report_agent_task_progress", "submit_agent_task_result", "submit_agent_action"},
            )
            self.assertNotIn("get_agent_task_context", names)

    def test_mcp_claim_progress_and_result_share_one_capability(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                task = create_task(conn, "keyword_definition", "Define MCP", context_hint="keyword:MCP", idempotent=False)
            claimed = dispatch_mcp_request(
                tmp,
                {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_next_agent_work", "arguments": {}}},
            )
            work = claimed["result"]["structuredContent"]["work"]
            capability = work["task"]["task_capability"]
            self.assertTrue(capability.startswith("taskcap_"))
            self.assertIn("input_context", work)
            self.assertIn("response_format", work)
            with connect(tmp) as conn:
                self.assertEqual(get_task(conn, task["id"])["state"], "claimed")

            progress = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {
                        "name": "report_agent_task_progress",
                        "arguments": {"task_capability": capability, "phase": "working", "message": "Drafting", "percent": 40},
                    },
                },
            )
            self.assertFalse(progress["result"]["isError"])
            self.assertEqual(progress["result"]["structuredContent"]["progress"]["sequence"], 1)

            submitted = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {
                        "name": "submit_agent_task_result",
                        "arguments": {"task_capability": capability, "result_json": {"definition": "Model Context Protocol"}},
                    },
                },
            )
            self.assertFalse(submitted["result"]["isError"])
            with connect(tmp) as conn:
                self.assertEqual(get_task(conn, task["id"])["state"], "completed")

    def test_stdio_transport_is_line_delimited_json_rpc(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = io.StringIO(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "ping"}) + "\n")
            target = io.StringIO()
            self.assertEqual(run_stdio_server(tmp, source, target), 0)
            response = json.loads(target.getvalue())
            self.assertEqual(response, {"jsonrpc": "2.0", "id": 1, "result": {}})

    def test_shipped_smoke_client_exercises_a_real_stdio_subprocess(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            outcome = run_mcp_smoke(tmp)
        self.assertEqual(outcome["status"], "passed")
        self.assertTrue(outcome["initialize"])
        self.assertGreaterEqual(outcome["tool_count"], 4)
        self.assertTrue(outcome["claimed"])
        self.assertTrue(outcome["progressed"])
        self.assertTrue(outcome["submitted"])
        self.assertEqual(outcome["malformed_request"], "rejected")

    def test_require_installed_bridge_refuses_the_source_module_fallback(self) -> None:
        with patch("aaaat.host_bridge_smoke.sys.argv", ["C:/missing/aaaat-host-bridge-smoke.exe"]):
            with self.assertRaisesRegex(RuntimeError, "Installed aaaat-host-bridge"):
                _installed_bridge_argv("hostcap_example", require_installed=True)

    def test_paired_bridge_smoke_client_exercises_a_real_stdio_subprocess(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            outcome = run_host_bridge_smoke(tmp)
        self.assertEqual(outcome["status"], "passed")
        self.assertTrue(outcome["initialize"])
        self.assertGreaterEqual(outcome["tool_count"], 4)
        self.assertTrue(outcome["ping"])
        self.assertTrue(outcome["claimed"])
        self.assertTrue(outcome["progressed"])
        self.assertTrue(outcome["submitted"])
        self.assertEqual(outcome["malformed_request"], "rejected")


if __name__ == "__main__":
    unittest.main()
