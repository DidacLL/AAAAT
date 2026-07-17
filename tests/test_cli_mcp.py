import contextlib
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.cli import main
from aaaat.mcp_server import mcp_descriptor, validate_descriptor


class CliMcpTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "-B", "-m", "aaaat.cli", *args],
            text=True,
            capture_output=True,
            check=True,
        )

    def call_main(self, *args):
        output = io.StringIO()
        errors = io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            result = main(list(args))
        return result, output.getvalue(), errors.getvalue()

    def run_main(self, *args):
        result, output, errors = self.call_main(*args)
        self.assertEqual(result, 0, errors)
        return output

    def test_cli_basic_local_commands_work(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_main("--storage", tmp, "init")
            created = json.loads(
                self.run_main("--storage", tmp, "app", "create", "--company", "Demo Co", "--role", "Engineer")
            )
            app_id = created["id"]
            updated = json.loads(
                self.run_main("--storage", tmp, "app", "update", app_id, "--keywords", "ATS, Python")
            )
            self.assertEqual(updated["keywords"], ["ATS", "Python"])
            self.assertIn("Engineer", self.run_main("--storage", tmp, "app", "list"))
            self.assertIn(app_id, self.run_main("--storage", tmp, "app", "show", app_id))
            self.assertIn(
                "Audit intake",
                self.run_main("--storage", tmp, "intake", "add", app_id, "--content", "Audit intake"),
            )

            blob = json.loads(
                self.run_main(
                    "--storage", tmp, "blob", "add",
                    "--application-id", app_id,
                    "--type", "note",
                    "--title", "Historical material",
                    "--body", "Retained text",
                    "--state", "history",
                )
            )
            self.assertEqual(blob["state"], "history")

            self.run_main("--storage", tmp, "profile", "set", "display_name", "Audit Candidate")
            self.run_main("--storage", tmp, "profile", "set", "email", "audit@example.invalid")
            self.run_main("--storage", tmp, "profile", "set", "summary.default", "Audit summary")
            self.assertEqual(json.loads(self.run_main("--storage", tmp, "profile", "missing")), [])

    def test_agent_cli_returns_complete_work_and_accepts_capability_write_back(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_main("--storage", tmp, "init")
            app_id = json.loads(
                self.run_main("--storage", tmp, "app", "create", "--company", "CLI Co", "--role", "Backend Engineer")
            )["id"]
            local_task = json.loads(
                self.run_main(
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
            )
            work = json.loads(self.run_main("--storage", tmp, "agent", "next"))["work"]
            capability = work["task"]["task_capability"]
            self.assertTrue(capability.startswith("taskcap_"))
            self.assertNotEqual(capability, local_task["id"])
            self.assertEqual(work["purpose"], "market_research")
            self.assertIn("input_context", work)
            self.assertIn("response_format", work)
            self.assertNotIn(local_task["id"], json.dumps(work))
            self.assertNotIn("application_id", json.dumps(work))

            result_path = Path(tmp) / "result.json"
            result_path.write_text('{"company_research": "CLI research"}', encoding="utf-8")
            submitted = json.loads(
                self.run_main(
                    "--storage",
                    tmp,
                    "agent",
                    "submit",
                    capability,
                    "--result-file",
                    str(result_path),
                )
            )
            self.assertEqual(submitted["status"], "accepted")
            self.assertEqual(submitted["state"], "completed")
            self.assertNotIn(capability, json.dumps(submitted))
            self.assertNotIn(local_task["id"], json.dumps(submitted))

            with self.assertRaises(SystemExit):
                self.call_main("--storage", tmp, "agent", "context", capability)

    def test_agent_action_cli_accepts_bounded_create_candidature_packet(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_main("--storage", tmp, "init")
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
                self.run_main(
                    "--storage",
                    tmp,
                    "agent",
                    "action",
                    "submit",
                    "--input-file",
                    str(action_path),
                )
            )
            self.assertEqual(acknowledgement["status"], "accepted")
            self.assertEqual(acknowledgement["action"], "create_candidature")
            self.assertNotIn("internal", acknowledgement)

    def test_expected_cli_errors_are_concise_and_render_missing_profile_is_actionable(self):
        with tempfile.TemporaryDirectory() as tmp:
            missing_app = subprocess.run(
                [sys.executable, "-B", "-m", "aaaat.cli", "--storage", tmp, "app", "show", "missing"],
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(missing_app.returncode, 2)
            self.assertIn("Application not found", missing_app.stderr)
            self.assertNotIn("Traceback", missing_app.stderr)
            self.assertEqual(missing_app.stdout, "")

            render = subprocess.run(
                [sys.executable, "-B", "-m", "aaaat.cli", "--storage", tmp, "render", "cv"],
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(render.returncode, 2)
            self.assertIn("Complete the missing profile fields", render.stderr)
            self.assertNotIn("Traceback", render.stderr)

    def test_restore_command_restores_into_new_workspace(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source"
            self.run_main("--storage", str(source), "init")
            backup = self.run_main("--storage", str(source), "backup").strip()
            restored = Path(tmp) / "restored"
            result = json.loads(self.run_main("restore", backup, "--output", str(restored)))
            self.assertEqual(Path(result["workspace"]), restored.resolve())
            self.assertTrue((restored / "aaaat.sqlite3").exists())

    def test_restore_rejects_a_malformed_archive_without_traceback(self):
        with tempfile.TemporaryDirectory() as tmp:
            malformed = Path(tmp) / "not-a-backup.zip"
            malformed.write_bytes(b"not a zip archive")
            code, output, errors = self.call_main(
                "restore", str(malformed), "--output", str(Path(tmp) / "restored")
            )
            self.assertEqual(code, 2)
            self.assertIn("error:", errors)
            self.assertNotIn("Traceback", errors)
            self.assertEqual(output, "")

    def test_mcp_descriptor_validates_unified_capability_contract(self):
        descriptor = mcp_descriptor()
        self.assertTrue(validate_descriptor(descriptor))
        resources = {resource["uri"] for resource in descriptor["resources"]}
        tools = {tool["name"] for tool in descriptor["tools"]}
        self.assertEqual(resources, set())
        self.assertTrue(
            {
                "get_next_agent_work",
                "submit_agent_task_result",
                "submit_agent_action",
            }.issubset(tools)
        )
        self.assertNotIn("get_agent_task_context", tools)
        descriptor_text = json.dumps(descriptor)
        self.assertNotIn("application_id", descriptor_text)
        self.assertNotIn("task_id", descriptor_text)
        self.assertNotIn("task_handle", descriptor_text)
        for tool in descriptor["tools"]:
            self.assertEqual(tool["inputSchema"]["type"], "object")
            self.assertIn("properties", tool["inputSchema"])
        self.assertEqual(self.run_main("mcp-validate").strip(), "ok")


if __name__ == "__main__":
    unittest.main()
