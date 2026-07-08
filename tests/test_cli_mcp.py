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

    def test_agent_cli_task_context_uses_task_handle_shape(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            created = self.run_cli("--storage", tmp, "app", "create", "--company", "CLI Co", "--role", "Backend Engineer")
            app_id = json.loads(created.stdout)["id"]
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
            )
            tasks = json.loads(self.run_cli("--storage", tmp, "agent", "tasks", "--state", "queued").stdout)
            self.assertTrue(tasks)
            task_handle = tasks[0]["task_handle"]
            self.assertNotIn("id", tasks[0])
            self.assertNotIn("application_id", json.dumps(tasks))
            self.assertIn("allowed_actions", tasks[0])
            self.assertNotIn("raw_intake", json.dumps(tasks))

            context = json.loads(self.run_cli("--storage", tmp, "agent", "context", task_handle).stdout)
            self.assertEqual(context["task"]["task_handle"], task_handle)
            self.assertNotIn(app_id, json.dumps(context))
            self.assertNotIn("application_id", json.dumps(context))
            self.assertNotIn("/api/tasks/", json.dumps(context))

            result_path = Path(tmp) / "result.json"
            result_path.write_text('{"company": "CLI Co"}', encoding="utf-8")
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
            self.assertEqual(submitted["state"], "completed")

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
            self.assertIn("{{ profile_fact.", json.dumps(bundle))
            self.assertNotIn("Private Python detail", json.dumps(bundle))

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

    def test_mcp_descriptor_validates_and_matches_agent_runtime_contract(self):
        descriptor = mcp_descriptor()
        self.assertTrue(validate_descriptor(descriptor))
        resources = {resource["uri"] for resource in descriptor["resources"]}
        tools = {tool["name"] for tool in descriptor["tools"]}
        self.assertIn("aaaat://agent/tasks/next", resources)
        self.assertIn("aaaat://agent/tasks/{task_handle}/context", resources)
        self.assertIn("aaaat://agent/context-bundle", resources)
        self.assertIn("get_next_agent_task", tools)
        self.assertIn("submit_agent_task_result", tools)
        self.assertIn("get_agent_context_bundle", tools)
        self.assertIn("submit_agent_action", tools)
        self.assertNotIn("aaaat://agent/tasks", resources)
        self.assertNotIn("list_agent_tasks", tools)
        self.assertNotIn("claim_agent_task", tools)
        self.assertNotIn("release_agent_task", tools)
        self.assertNotIn("list_applications", tools)
        for tool in descriptor["tools"]:
            self.assertEqual(tool["inputSchema"]["type"], "object")
            self.assertIn("properties", tool["inputSchema"])
        self.assertEqual(self.run_cli("mcp-validate").stdout.strip(), "ok")

    def test_generated_agent_contract_is_capability_scoped(self):
        guide = self.run_cli("agent-guide").stdout.lower()
        descriptor_text = json.dumps(mcp_descriptor(), sort_keys=True).lower()
        combined_contract = guide + "\n" + descriptor_text
        self.assertIn("dashboard runtime", combined_contract)
        self.assertIn("agent runtime", combined_contract)
        self.assertIn("task handle", combined_contract)
        self.assertIn("bounded", combined_contract)
        self.assertIn("no dashboard html", combined_contract)
        self.assertIn("no broad", combined_contract)
        forbidden_contract_terms = (
            "list_agent_tasks",
            "claim_agent_task",
            "release_agent_task",
            "dashboard-payload",
            "dashboard_payload",
            "application/context",
            "search_applications",
            "profile_dump",
            "dump_profile",
            "dump_variables",
            "aaaat://variables",
            "generic_crud",
            "application_id",
            "candidature_id",
            "profile_fact_id",
            "artifact_id",
        )
        for term in forbidden_contract_terms:
            self.assertNotIn(term, combined_contract)

    def test_mcp_descriptor_is_capability_only_no_llm_calls(self):
        root = Path(__file__).resolve().parent.parent
        mcp_source = (root / "aaaat" / "mcp_server.py").read_text(encoding="utf-8").lower()
        self.assertNotIn("openai", mcp_source)
        self.assertNotIn("anthropic", mcp_source)
        self.assertNotIn("api_key", mcp_source)
        self.assertNotIn("chat.completions", mcp_source)


if __name__ == "__main__":
    unittest.main()
