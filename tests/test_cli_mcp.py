import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.mcp_server import mcp_descriptor, validate_descriptor


class CliMcpTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "-B", "-m", "aaaat.cli", *args],
            text=True,
            capture_output=True,
            check=True,
        )

    def test_cli_basic_local_commands_work(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            created = json.loads(
                self.run_cli("--storage", tmp, "app", "create", "--company", "Demo Co", "--role", "Engineer").stdout
            )
            app_id = created["id"]
            updated = json.loads(
                self.run_cli("--storage", tmp, "app", "update", app_id, "--keywords", "ATS, Python").stdout
            )
            self.assertEqual(updated["keywords"], ["ATS", "Python"])
            self.assertIn("Engineer", self.run_cli("--storage", tmp, "app", "list").stdout)
            self.assertIn(app_id, self.run_cli("--storage", tmp, "app", "show", app_id).stdout)
            self.assertIn(
                "Audit intake",
                self.run_cli("--storage", tmp, "intake", "add", app_id, "--content", "Audit intake").stdout,
            )

            self.run_cli("--storage", tmp, "profile", "set", "display_name", "Audit Candidate")
            self.run_cli("--storage", tmp, "profile", "set", "email", "audit@example.invalid")
            self.run_cli("--storage", tmp, "profile", "set", "summary.default", "Audit summary")
            self.assertEqual(json.loads(self.run_cli("--storage", tmp, "profile", "missing").stdout), [])

    def test_agent_cli_uses_opaque_handle_and_cli_write_back(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            app_id = json.loads(
                self.run_cli("--storage", tmp, "app", "create", "--company", "CLI Co", "--role", "Backend Engineer").stdout
            )["id"]
            local_task = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "task",
                    "create",
                    "--application-id",
                    app_id,
                    "--type",
                    "company_research",
                    "--title",
                    "Research CLI Co",
                    "--context-hint",
                    "candidature:company_research",
                ).stdout
            )
            next_task = json.loads(self.run_cli("--storage", tmp, "agent", "next").stdout)["task"]
            task_handle = next_task["task_handle"]
            self.assertTrue(task_handle.startswith("taskh_"))
            self.assertNotEqual(task_handle, local_task["id"])
            self.assertNotIn("id", next_task)
            self.assertNotIn("application_id", json.dumps(next_task))

            context = json.loads(self.run_cli("--storage", tmp, "agent", "context", task_handle).stdout)
            self.assertEqual(context["task"]["task_handle"], task_handle)
            self.assertEqual(context["purpose"], "market_research")
            self.assertEqual(
                context["write_back"],
                {"submit_cli": f"aaaat agent submit {task_handle} --result-file result.json"},
            )
            self.assertNotIn(local_task["id"], json.dumps(context))
            self.assertNotIn("application_id", json.dumps(context))

            result_path = Path(tmp) / "result.json"
            result_path.write_text('{"company_research": "CLI research"}', encoding="utf-8")
            submitted = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "agent",
                    "submit",
                    task_handle,
                    "--result-file",
                    str(result_path),
                ).stdout
            )
            self.assertEqual(submitted["task"], {"task_handle": task_handle, "state": "completed"})
            self.assertNotIn(local_task["id"], json.dumps(submitted))

    def test_agent_action_cli_accepts_bounded_create_candidature_packet(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            action_path = Path(tmp) / "action.json"
            action_path.write_text(
                json.dumps(
                    {
                        "action": "create_candidature",
                        "payload": {
                            "source_material": {
                                "offer_text": "Raw CLI offer",
                                "application_form_text": "Raw CLI form",
                            },
                            "candidature": {"company": "Action CLI Co", "role": "Backend Engineer"},
                            "outputs": {"form_answers": "CLI form answers"},
                        },
                    }
                ),
                encoding="utf-8",
            )
            acknowledgement = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "agent",
                    "action",
                    "submit",
                    "--input-file",
                    str(action_path),
                ).stdout
            )
            self.assertEqual(acknowledgement["status"], "accepted")
            self.assertEqual(acknowledgement["action"], "create_candidature")
            self.assertNotIn("internal", acknowledgement)

    def test_mcp_descriptor_validates_current_capability_contract(self):
        descriptor = mcp_descriptor()
        self.assertTrue(validate_descriptor(descriptor))
        resources = {resource["uri"] for resource in descriptor["resources"]}
        tools = {tool["name"] for tool in descriptor["tools"]}
        self.assertIn("aaaat://agent/tasks/next", resources)
        self.assertIn("aaaat://agent/tasks/{task_handle}/context", resources)
        self.assertIn("aaaat://agent/context-bundle", resources)
        self.assertTrue(
            {
                "get_next_agent_task",
                "get_agent_task_context",
                "submit_agent_task_result",
                "get_agent_context_bundle",
                "submit_agent_action",
            }.issubset(tools)
        )
        descriptor_text = json.dumps(descriptor)
        self.assertNotIn("application_id", descriptor_text)
        self.assertNotIn("task_id", descriptor_text)
        for tool in descriptor["tools"]:
            self.assertEqual(tool["inputSchema"]["type"], "object")
            self.assertIn("properties", tool["inputSchema"])
        self.assertEqual(self.run_cli("mcp-validate").stdout.strip(), "ok")


if __name__ == "__main__":
    unittest.main()
