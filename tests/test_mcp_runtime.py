from __future__ import annotations

import io
import json
import tempfile
import unittest

from aaaat.db import connect, init_db
from aaaat.mcp_runtime import dispatch_mcp_request, run_stdio_server
from aaaat.tasks import create_task, get_task


class McpRuntimeTests(unittest.TestCase):
    def test_initialize_and_tools_list_match_operational_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            initialized = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {},
                },
            )
            self.assertEqual(initialized["result"]["serverInfo"]["name"], "aaaat")
            listed = dispatch_mcp_request(
                tmp,
                {
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/list",
                    "params": {},
                },
            )
            names = {item["name"] for item in listed["result"]["tools"]}
            self.assertEqual(
                names,
                {
                    "get_next_agent_work",
                    "report_agent_task_progress",
                    "submit_agent_task_result",
                    "submit_agent_action",
                },
            )
            self.assertNotIn("get_agent_task_context", names)
            progress = next(
                item
                for item in listed["result"]["tools"]
                if item["name"] == "report_agent_task_progress"
            )
            self.assertEqual(
                progress["inputSchema"]["properties"]["phase"]["enum"],
                [
                    "accepted",
                    "planning",
                    "working",
                    "waiting",
                    "blocked",
                    "finalizing",
                ],
            )

    def test_mcp_claim_progress_and_result_share_one_capability(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
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
                    "params": {
                        "name": "get_next_agent_work",
                        "arguments": {},
                    },
                },
            )
            work = claimed["result"]["structuredContent"]["work"]
            capability = work["task"]["task_capability"]
            self.assertTrue(capability.startswith("taskcap_"))
            self.assertIn("input_context", work)
            self.assertEqual(work["input_context"], {"keyword": "MCP"})
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
                        "arguments": {
                            "task_capability": capability,
                            "phase": "working",
                            "message": "Drafting",
                            "percent": 40,
                        },
                    },
                },
            )
            self.assertFalse(progress["result"]["isError"])
            self.assertEqual(
                progress["result"]["structuredContent"]["progress"]["sequence"],
                1,
            )

            submitted = dispatch_mcp_request(
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
                                "definition": "Model Context Protocol"
                            },
                        },
                    },
                },
            )
            self.assertFalse(submitted["result"]["isError"])
            with connect(tmp) as conn:
                self.assertEqual(get_task(conn, task["id"])["state"], "completed")

    def test_stdio_transport_is_line_delimited_json_rpc(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = io.StringIO(
                json.dumps(
                    {"jsonrpc": "2.0", "id": 1, "method": "ping"}
                )
                + "\n"
            )
            target = io.StringIO()
            self.assertEqual(run_stdio_server(tmp, source, target), 0)
            response = json.loads(target.getvalue())
            self.assertEqual(
                response,
                {"jsonrpc": "2.0", "id": 1, "result": {}},
            )

    def test_stdio_transport_rejects_malformed_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = io.StringIO("{not-json}\n")
            target = io.StringIO()
            self.assertEqual(run_stdio_server(tmp, source, target), 0)
            response = json.loads(target.getvalue())
            self.assertEqual(response["error"]["code"], -32700)


if __name__ == "__main__":
    unittest.main()
