from __future__ import annotations

import io
import json
import tempfile
import unittest

from aaaat.db import connect, ensure_workspace_database, profile_variables
from aaaat.mcp_runtime import dispatch_mcp_request, run_stdio_server
from aaaat.tasks import create_task, get_task


class McpRuntimeTests(unittest.TestCase):
    def test_initialize_and_tools_list_match_small_operational_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            initialized = dispatch_mcp_request(
                tmp,
                {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            )
            self.assertEqual(initialized["result"]["serverInfo"]["name"], "aaaat")
            self.assertEqual(set(initialized["result"]["capabilities"]), {"tools"})
            listed = dispatch_mcp_request(
                tmp,
                {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            )
            names = {item["name"] for item in listed["result"]["tools"]}
            self.assertEqual(
                names,
                {"get_next_agent_work", "submit_agent_task_result", "submit_agent_action"},
            )
            resources = dispatch_mcp_request(
                tmp,
                {"jsonrpc": "2.0", "id": 3, "method": "resources/list", "params": {}},
            )
            self.assertEqual(resources["error"]["code"], -32601)

    def test_mcp_claim_and_result_use_one_single_use_capability(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ensure_workspace_database(tmp)
            with connect(tmp) as conn:
                task = create_task(
                    conn,
                    "keyword_definition",
                    "Define MCP",
                    context_hint="keyword:MCP",
                    idempotent=False,
                )
            claimed = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {"name": "get_next_agent_work", "arguments": {}},
                },
            )
            work = claimed["result"]["structuredContent"]["work"]
            capability = work["task"]["task_capability"]
            self.assertEqual(work["task"]["allowed_actions"], ["submit_result"])
            self.assertEqual(work["input_context"], {"keyword": "MCP"})
            with connect(tmp) as conn:
                self.assertEqual(get_task(conn, task["id"])["state"], "claimed")

            submitted = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {
                        "name": "submit_agent_task_result",
                        "arguments": {
                            "task_capability": capability,
                            "result_json": {"definition": "Model Context Protocol"},
                        },
                    },
                },
            )
            self.assertFalse(submitted["result"]["isError"])
            duplicate = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {
                        "name": "submit_agent_task_result",
                        "arguments": {
                            "task_capability": capability,
                            "result_json": {"definition": "Late replacement"},
                        },
                    },
                },
            )
            self.assertTrue(duplicate["result"]["isError"])
            with connect(tmp) as conn:
                self.assertEqual(get_task(conn, task["id"])["state"], "completed")

    def test_profile_validation_error_is_specific_retryable_and_does_not_spend_capability(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ensure_workspace_database(tmp)
            with connect(tmp) as conn:
                task = create_task(
                    conn,
                    "profile_completion",
                    "Complete profile",
                    context_hint="profile:completion",
                    idempotent=False,
                )
            claimed = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {"name": "get_next_agent_work", "arguments": {}},
                },
            )
            work = claimed["result"]["structuredContent"]["work"]
            capability = work["task"]["task_capability"]
            self.assertEqual(
                work["response_format"]["schema"]["variables"]["value_type"],
                "string",
            )

            rejected = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {
                        "name": "submit_agent_task_result",
                        "arguments": {
                            "task_capability": capability,
                            "result_json": {
                                "variables": {
                                    "profile.links": ["https://example.test"]
                                }
                            },
                        },
                    },
                },
            )
            self.assertTrue(rejected["result"]["isError"])
            self.assertTrue(rejected["result"]["structuredContent"]["retryable"])
            self.assertIn("profile.links", rejected["result"]["structuredContent"]["error"])
            with connect(tmp) as conn:
                self.assertEqual(get_task(conn, task["id"])["state"], "claimed")

            accepted = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {
                        "name": "submit_agent_task_result",
                        "arguments": {
                            "task_capability": capability,
                            "result_json": {
                                "variables": {
                                    "profile.links": "Portfolio: https://example.test"
                                }
                            },
                        },
                    },
                },
            )
            self.assertFalse(accepted["result"]["isError"])
            with connect(tmp) as conn:
                self.assertEqual(get_task(conn, task["id"])["state"], "completed")
                self.assertEqual(
                    profile_variables(conn)["profile.links"],
                    "Portfolio: https://example.test",
                )

    def test_stdio_transport_is_line_delimited_json_rpc(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = io.StringIO(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "ping"}) + "\n")
            target = io.StringIO()
            self.assertEqual(run_stdio_server(tmp, source, target), 0)
            self.assertEqual(json.loads(target.getvalue()), {"jsonrpc": "2.0", "id": 1, "result": {}})

    def test_stdio_transport_rejects_malformed_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = io.StringIO("{not-json}\n")
            target = io.StringIO()
            self.assertEqual(run_stdio_server(tmp, source, target), 0)
            self.assertEqual(json.loads(target.getvalue())["error"]["code"], -32700)


if __name__ == "__main__":
    unittest.main()
