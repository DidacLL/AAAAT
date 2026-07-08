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
            created = self.run_cli("--storage", tmp, "app", "create", "--company", "Demo Co", "--role", "Engineer")
            app_id = json.loads(created.stdout)["id"]
            updated = self.run_cli("--storage", tmp, "app", "update", app_id, "--next-action", "Call recruiter", "--keywords", "ATS, Python")
            updated_data = json.loads(updated.stdout)
            self.assertEqual(updated_data["next_action"], "Call recruiter")
            self.assertEqual(updated_data["keywords"], ["ATS", "Python"])

            listed = self.run_cli("--storage", tmp, "app", "list")
            self.assertIn("Engineer", listed.stdout)
            shown = self.run_cli("--storage", tmp, "app", "show", app_id)
            self.assertIn(app_id, shown.stdout)
            intake = self.run_cli("--storage", tmp, "intake", "add", app_id, "--content", "Audit intake")
            self.assertIn("Audit intake", intake.stdout)
            raw_offer = self.run_cli("--storage", tmp, "intake", "raw-offer", "--content", "Raw offer text")
            self.assertEqual(json.loads(raw_offer.stdout)["status"], "intake")
            artifacts = self.run_cli("--storage", tmp, "artifact", "list", app_id)
            self.assertEqual(json.loads(artifacts.stdout), [])
            glossary = self.run_cli("--storage", tmp, "glossary", "set", "Python", "--definition", "Programming language", "--category", "skill")
            self.assertEqual(json.loads(glossary.stdout)["category"], "skill")

            missing = self.run_cli("--storage", tmp, "profile", "missing")
            self.assertIn("profile.display_name", missing.stdout)
            self.run_cli("--storage", tmp, "profile", "set", "display_name", "Audit Candidate")
            self.run_cli("--storage", tmp, "profile", "set", "email", "audit@example.invalid")
            self.run_cli("--storage", tmp, "profile", "set", "summary.default", "Audit summary")
            self.assertEqual(json.loads(self.run_cli("--storage", tmp, "profile", "missing").stdout), [])

            cv_path = str(Path(tmp) / "cv.tex")
            cv = self.run_cli("--storage", tmp, "render", "cv", "--output", cv_path)
            self.assertIn("cv", cv.stdout)
            self.assertIn("Audit Candidate", Path(cv_path).read_text(encoding="utf-8"))
            cover_path = str(Path(tmp) / "cover-letter.tex")
            cover = self.run_cli("--storage", tmp, "render", "cover-letter", app_id, "--body", "Audit body", "--output", cover_path)
            self.assertIn("cover_letter", cover.stdout)
            self.assertIn("Audit body", Path(cover_path).read_text(encoding="utf-8"))

            guide = self.run_cli("agent-guide")
            self.assertIn("Dashboard runtime", guide.stdout)
            self.assertIn("Agent runtime", guide.stdout)

    def test_agent_cli_task_context_and_submit_work_by_opaque_task_handle(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            created = self.run_cli("--storage", tmp, "app", "create", "--company", "CLI Co", "--role", "Backend Engineer")
            app_id = json.loads(created.stdout)["id"]
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
            tasks = json.loads(self.run_cli("--storage", tmp, "agent", "tasks", "--state", "queued").stdout)
            self.assertTrue(tasks)
            task_handle = next_task["task_handle"]
            self.assertTrue(task_handle.startswith("taskh_"))
            self.assertNotEqual(task_handle, local_task["id"])
            self.assertEqual(tasks[0]["task_handle"], task_handle)
            self.assertEqual(tasks[0]["allowed_actions"], ["context", "submit"])
            self.assertNotIn("id", tasks[0])
            self.assertNotIn(local_task["id"], json.dumps(tasks))
            self.assertNotIn("application_id", json.dumps(tasks))

            context = json.loads(self.run_cli("--storage", tmp, "agent", "context", task_handle).stdout)
            self.assertEqual(context["task"]["task_handle"], task_handle)
            self.assertEqual(context["purpose"], "market_research")
            self.assertIn("instructions", context)
            self.assertIn("response_format", context)
            self.assertEqual(context["write_back"], {"submit": f"/api/agent/tasks/{task_handle}/result"})
            self.assertNotIn("application_id", json.dumps(context))
            self.assertNotIn(local_task["id"], json.dumps(context))

            raw_id_context = subprocess.run(
                [sys.executable, "-B", "-m", "aaaat.cli", "--storage", tmp, "agent", "context", local_task["id"]],
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertNotEqual(raw_id_context.returncode, 0)

            packet = json.loads(self.run_cli("--storage", tmp, "agent", "packet", task_handle).stdout)
            self.assertEqual(packet["task_handle"], task_handle)
            self.assertEqual(packet["task_type"], "company_research")
            self.assertEqual(packet["purpose"], "market_research")
            self.assertIn("input_context", packet)
            self.assertIn("output_contract", packet)
            self.assertIn("response_format", packet)
            self.assertIn("privacy_notes", packet)
            self.assertNotIn("id", packet)
            self.assertNotIn("task_id", json.dumps(packet).lower())
            self.assertNotIn(local_task["id"], json.dumps(packet))

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
                    "--agent-name",
                    "CLI Agent",
                    "--model-provider",
                    "local",
                ).stdout
            )
            self.assertEqual(set(submitted), {"status", "task", "next"})
            self.assertEqual(submitted["task"], {"task_handle": task_handle, "state": "completed"})
            self.assertNotIn(local_task["id"], json.dumps(submitted))
            self.assertNotIn("application_id", json.dumps(submitted))
            self.assertNotIn("artifact_id", json.dumps(submitted))

            context_help = self.run_cli("agent", "context", "--help").stdout
            submit_help = self.run_cli("agent", "submit", "--help").stdout
            self.assertIn("task_handle", context_help)
            self.assertIn("task_handle", submit_help)
            self.assertNotIn("artifact-id", submit_help)

    def test_agent_action_session_cli_commands_work(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            self.run_cli(
                "--storage",
                tmp,
                "profile",
                "fact",
                "add",
                "--type",
                "skill",
                "--title",
                "Python",
                "--body",
                "Private Python detail",
                "--exposure",
                "placeholder",
                "--use-for-agent-context",
            )
            bundle = json.loads(self.run_cli("--storage", tmp, "agent", "context-bundle", "--purpose", "candidature_fit").stdout)
            self.assertEqual(bundle["purpose"], "candidature_fit")
            self.assertEqual(bundle["scope"], "agent")
            self.assertIn("{{ profile_fact.skill.python }}", json.dumps(bundle))
            self.assertIn("fact_ref", json.dumps(bundle))

            action_path = Path(tmp) / "action.json"
            action_path.write_text(
                json.dumps(
                    {
                        "action": "create_candidature",
                        "payload": {
                            "source_material": {"offer_text": "Raw CLI offer", "application_form_text": "Raw CLI form"},
                            "candidature": {"company": "Action CLI Co", "role": "Backend Engineer"},
                            "outputs": {"form_answers": "CLI form answers", "cover_letter_body": "CLI cover body"},
                        },
                    }
                ),
                encoding="utf-8",
            )
            ack = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "agent",
                    "action",
                    "submit",
                    "--input-file",
                    str(action_path),
                    "--agent-name",
                    "CLI Agent",
                ).stdout
            )
            self.assertEqual(ack["status"], "accepted")
            self.assertEqual(ack["action"], "create_candidature")
            self.assertNotIn("internal", ack)

    def test_mcp_descriptor_validates_capability_contract(self):
        descriptor = mcp_descriptor()
        self.assertTrue(validate_descriptor(descriptor))
        descriptor_text = json.dumps(descriptor).lower()
        resources = {resource["uri"] for resource in descriptor["resources"]}
        tools = {tool["name"] for tool in descriptor["tools"]}
        self.assertIn("aaaat://agent/tasks/next", resources)
        self.assertIn("aaaat://agent/tasks/{task_handle}/context", resources)
        self.assertIn("aaaat://agent/context-bundle", resources)
        self.assertIn("get_next_agent_task", tools)
        self.assertIn("submit_agent_task_result", tools)
        self.assertIn("get_agent_context_bundle", tools)
        self.assertIn("submit_agent_action", tools)
        self.assertIn("task_handle", descriptor_text)
        self.assertIn("response_format", descriptor_text)
        self.assertIn("output_contract", descriptor_text)
        self.assertNotIn("task_id", descriptor_text)
        self.assertNotIn("application_id", descriptor_text)
        self.assertNotIn("server", descriptor_text)
        for tool in descriptor["tools"]:
            self.assertEqual(tool["inputSchema"]["type"], "object")
            self.assertIn("properties", tool["inputSchema"])
        self.assertEqual(self.run_cli("mcp-validate").stdout.strip(), "ok")

    def test_mcp_docs_describe_descriptor_only_compatibility(self):
        root = Path(__file__).resolve().parent.parent
        mcp_doc = (root / "docs" / "mcp.md").read_text(encoding="utf-8").lower()
        readme = (root / "README.md").read_text(encoding="utf-8").lower()
        agents = (root / "AGENTS.md").read_text(encoding="utf-8").lower()
        self.assertIn("descriptor/tool-schema compatibility", mcp_doc)
        self.assertIn("does not implement a full mcp server transport", mcp_doc)
        self.assertIn("does not ship a full mcp server transport", readme)
        self.assertIn("descriptor-only compatibility", agents)
        for transport in ("stdio", "sse", "streamable http"):
            self.assertIn(transport, mcp_doc)

    def test_generated_agent_guide_and_descriptor_describe_capabilities(self):
        guide = self.run_cli("agent-guide").stdout.lower()
        descriptor = mcp_descriptor()
        tool_names = {tool["name"] for tool in descriptor["tools"]}
        self.assertIn("dashboard runtime", guide)
        self.assertIn("agent runtime", guide)
        self.assertIn("task handle", guide)
        self.assertIn("opaque", guide)
        self.assertIn("response format", guide)
        self.assertIn("bounded", guide)
        self.assertTrue({"get_next_agent_task", "get_agent_task_context", "submit_agent_task_result", "get_agent_context_bundle", "submit_agent_action"}.issubset(tool_names))

    def test_mcp_descriptor_is_capability_only_no_llm_calls(self):
        root = Path(__file__).resolve().parent.parent
        mcp_source = (root / "aaaat" / "mcp_server.py").read_text(encoding="utf-8").lower()
        self.assertNotIn("openai", mcp_source)
        self.assertNotIn("anthropic", mcp_source)
        self.assertNotIn("api_key", mcp_source)
        self.assertNotIn("chat.completions", mcp_source)
        self.assertNotIn("from mcp", mcp_source)
        self.assertNotIn("import mcp", mcp_source)
        self.assertNotIn("fastmcp", mcp_source)
        self.assertNotIn("stdio_server", mcp_source)
        self.assertNotIn("sse_server", mcp_source)
        self.assertNotIn("streamable_http", mcp_source)


if __name__ == "__main__":
    unittest.main()
