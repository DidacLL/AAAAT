import subprocess
import sys
import tempfile
import unittest
import json
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

    def test_cli_basic_commands_work(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            created = self.run_cli("--storage", tmp, "app", "create", "--company", "Demo Co", "--role", "Engineer")
            self.assertIn("Demo Co", created.stdout)
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
            raw_offer_data = json.loads(raw_offer.stdout)
            self.assertEqual(raw_offer_data["company"], "Pending extraction")
            self.assertEqual(raw_offer_data["status"], "intake")
            artifacts = self.run_cli("--storage", tmp, "artifact", "list", app_id)
            self.assertEqual(json.loads(artifacts.stdout), [])
            glossary = self.run_cli("--storage", tmp, "glossary", "set", "Python", "--definition", "Programming language", "--category", "skill")
            self.assertEqual(json.loads(glossary.stdout)["category"], "skill")

            missing = self.run_cli("--storage", tmp, "profile", "missing")
            self.assertIn("profile.display_name", missing.stdout)
            review_queue = self.run_cli("--storage", tmp, "review-queue")
            self.assertIn("pitch", review_queue.stdout)
            app_review_queue = self.run_cli("--storage", tmp, "review-queue", app_id)
            self.assertIn(app_id, app_review_queue.stdout)

            self.run_cli("--storage", tmp, "profile", "set", "display_name", "Audit Candidate")
            self.run_cli("--storage", tmp, "profile", "set", "email", "audit@example.invalid")
            self.run_cli("--storage", tmp, "profile", "set", "summary.default", "Audit summary")
            missing = self.run_cli("--storage", tmp, "profile", "missing")
            self.assertEqual(json.loads(missing.stdout), [])
            cv_path = str(Path(tmp) / "cv.tex")
            cv = self.run_cli("--storage", tmp, "render", "cv", "--output", cv_path)
            self.assertIn("cv", cv.stdout)
            self.assertIn("Audit Candidate", Path(cv_path).read_text(encoding="utf-8"))
            cover_path = str(Path(tmp) / "cover-letter.tex")
            cover = self.run_cli(
                "--storage",
                tmp,
                "render",
                "cover-letter",
                app_id,
                "--body",
                "Audit body",
                "--output",
                cover_path,
            )
            self.assertIn("cover_letter", cover.stdout)
            self.assertIn("Audit body", Path(cover_path).read_text(encoding="utf-8"))
            artifact_id = json.loads(cover.stdout)["id"]
            state = self.run_cli("--storage", tmp, "artifact", "update-state", artifact_id, "--state", "submitted", "--notes", "Sent")
            state_data = json.loads(state.stdout)
            self.assertEqual(state_data["review_state"], "submitted")
            self.assertEqual(state_data["notes"], "Sent")

            demo_path = str(Path(tmp) / "static-demo.html")
            demo = self.run_cli("export", "static-demo", demo_path)
            self.assertIn("static-demo.html", demo.stdout)
            self.assertIn("Northstar Systems", Path(demo_path).read_text(encoding="utf-8"))

            guide = self.run_cli("agent-guide")
            self.assertIn("AAAAT", guide.stdout)

    def test_agent_cli_protocol_commands_work(self):
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
            task_id = tasks[0]["id"]
            self.assertIn("allowed_actions", tasks[0])
            self.assertNotIn("raw_intake", json.dumps(tasks))

            context = json.loads(self.run_cli("--storage", tmp, "agent", "context", task_id).stdout)
            self.assertEqual(context["task"]["id"], task_id)
            self.assertNotIn("/api/tasks/", json.dumps(context))

            claimed = json.loads(self.run_cli("--storage", tmp, "agent", "claim", task_id, "--agent-name", "CLI Agent").stdout)
            self.assertEqual(claimed["state"], "claimed")
            released = json.loads(self.run_cli("--storage", tmp, "agent", "release", task_id).stdout)
            self.assertEqual(released["state"], "queued")
            result_path = Path(tmp) / "result.txt"
            result_path.write_text('{"company": "CLI Co"}', encoding="utf-8")
            submitted = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "agent",
                    "submit",
                    task_id,
                    "--result-file",
                    str(result_path),
                    "--agent-name",
                    "CLI Agent",
                    "--model-provider",
                    "local",
                ).stdout
            )
            self.assertEqual(submitted["state"], "completed")
            self.assertEqual(submitted["application_id"], app_id)

    def test_mcp_descriptor_validates(self):
        descriptor = mcp_descriptor()
        self.assertTrue(validate_descriptor(descriptor))
        self.assertIn("tools", descriptor["capabilities"])
        self.assertTrue(descriptor["resources"])
        self.assertTrue(descriptor["tools"])
        self.assertTrue(descriptor["prompts"])
        resources = {resource["uri"] for resource in descriptor["resources"]}
        tools = {tool["name"] for tool in descriptor["tools"]}
        self.assertIn("aaaat://agent/tasks", resources)
        self.assertIn("aaaat://agent/tasks/{task_id}/context", resources)
        self.assertIn("submit_agent_task_result", tools)
        self.assertNotIn("aaaat://dashboard-payload", resources)
        self.assertNotIn("list_applications", tools)
        for tool in descriptor["tools"]:
            self.assertEqual(tool["inputSchema"]["type"], "object")
            self.assertIn("properties", tool["inputSchema"])

    def test_mcp_descriptor_is_capability_only_no_llm_calls(self):
        root = Path(__file__).resolve().parent.parent
        mcp_source = (root / "aaaat" / "mcp_server.py").read_text(encoding="utf-8").lower()
        self.assertNotIn("openai", mcp_source)
        self.assertNotIn("anthropic", mcp_source)
        self.assertNotIn("api_key", mcp_source)
        self.assertNotIn("chat.completions", mcp_source)


if __name__ == "__main__":
    unittest.main()
