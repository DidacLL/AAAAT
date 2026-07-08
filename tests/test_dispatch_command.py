import json
import shlex
import subprocess
import sys
import tempfile
import unittest


class DispatchCommandTests(unittest.TestCase):
    def run_cli(self, *args, check=True):
        return subprocess.run(
            [sys.executable, "-B", "-m", "aaaat.cli", *args],
            text=True,
            capture_output=True,
            check=check,
        )

    def next_task_handle(self, storage: str) -> str:
        return json.loads(self.run_cli("--storage", storage, "agent", "next").stdout)["task"]["task_handle"]

    def test_command_backend_submits_stdout_without_auto_apply(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            app = json.loads(
                self.run_cli("--storage", tmp, "app", "create", "--company", "Command Co", "--role", "Backend Engineer").stdout
            )
            task = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "task",
                    "create",
                    "--application-id",
                    app["id"],
                    "--type",
                    "company_research",
                    "--title",
                    "Research Command Co",
                    "--instructions",
                    "Return a short research note.",
                    "--context-hint",
                    "candidature:company_research",
                ).stdout
            )
            task_handle = self.next_task_handle(tmp)
            self.assertTrue(task_handle.startswith("taskh_"))
            self.assertNotEqual(task_handle, task["id"])
            code = "import json, sys; packet=json.load(sys.stdin); print('RESULT:' + packet['title'])"
            cmd = f"{shlex.quote(sys.executable)} -c {shlex.quote(code)}"

            dispatch = json.loads(
                self.run_cli("--storage", tmp, "agent", "dispatch", task_handle, "--backend", "command", "--cmd", cmd).stdout
            )
            self.assertEqual(dispatch["backend"], "command")
            self.assertEqual(dispatch["task_handle"], task_handle)
            self.assertNotIn("task_id", dispatch)
            self.assertEqual(dispatch["exit_code"], 0)
            self.assertEqual(dispatch["stderr"], "")
            self.assertTrue(dispatch["submitted"])
            self.assertNotIn("stdout", dispatch)
            self.assertNotIn("RESULT:Research Command Co", json.dumps(dispatch))
            self.assertEqual(dispatch["task"], {"task_handle": task_handle, "state": "completed"})
            self.assertEqual(dispatch["next"], ["open_dashboard"])
            self.assertNotIn(task["id"], json.dumps(dispatch))
            self.assertNotIn("result_blob_id", json.dumps(dispatch))
            self.assertNotIn("application_id", json.dumps(dispatch))

            blobs = json.loads(self.run_cli("--storage", tmp, "blob", "list", "--application-id", app["id"]).stdout)
            self.assertEqual(blobs[0]["body"].strip(), "RESULT:Research Command Co")
            self.assertEqual(blobs[0]["review_state"], "suggested")
            updated_app = json.loads(self.run_cli("--storage", tmp, "app", "show", app["id"]).stdout)
            self.assertEqual(updated_app["company_research"], "")

    def test_command_backend_nonzero_exit_returns_diagnostics_without_submit(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            app = json.loads(self.run_cli("--storage", tmp, "app", "create", "--company", "Fail Co", "--role", "Engineer").stdout)
            task = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "task",
                    "create",
                    "--application-id",
                    app["id"],
                    "--type",
                    "company_research",
                    "--title",
                    "Research Fail Co",
                ).stdout
            )
            task_handle = self.next_task_handle(tmp)
            self.assertNotEqual(task_handle, task["id"])
            code = "import sys; sys.stderr.write('runner failed\\n'); sys.exit(7)"
            cmd = f"{shlex.quote(sys.executable)} -c {shlex.quote(code)}"

            dispatch = json.loads(
                self.run_cli("--storage", tmp, "agent", "dispatch", task_handle, "--backend", "command", "--cmd", cmd).stdout
            )
            self.assertEqual(dispatch["backend"], "command")
            self.assertEqual(dispatch["task_handle"], task_handle)
            self.assertEqual(dispatch["exit_code"], 7)
            self.assertEqual(dispatch["stderr"], "runner failed\n")
            self.assertFalse(dispatch["submitted"])
            self.assertNotIn("task", dispatch)
            self.assertNotIn(task["id"], json.dumps(dispatch))
            shown = json.loads(self.run_cli("--storage", tmp, "task", "show", task["id"]).stdout)
            self.assertEqual(shown["state"], "queued")
            self.assertFalse(shown["result_blob_id"])

    def test_command_backend_empty_stdout_does_not_submit(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            app = json.loads(self.run_cli("--storage", tmp, "app", "create", "--company", "Quiet Co", "--role", "Engineer").stdout)
            task = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "task",
                    "create",
                    "--application-id",
                    app["id"],
                    "--type",
                    "company_research",
                    "--title",
                    "Research Quiet Co",
                ).stdout
            )
            task_handle = self.next_task_handle(tmp)
            self.assertNotEqual(task_handle, task["id"])
            code = "import sys; sys.stderr.write('no stdout\\n')"
            cmd = f"{shlex.quote(sys.executable)} -c {shlex.quote(code)}"

            dispatch = json.loads(
                self.run_cli("--storage", tmp, "agent", "dispatch", task_handle, "--backend", "command", "--cmd", cmd).stdout
            )
            self.assertEqual(dispatch["backend"], "command")
            self.assertEqual(dispatch["task_handle"], task_handle)
            self.assertEqual(dispatch["exit_code"], 0)
            self.assertEqual(dispatch["stderr"], "no stdout\n")
            self.assertEqual(dispatch["error"], "empty_stdout")
            self.assertFalse(dispatch["submitted"])
            self.assertNotIn("task", dispatch)
            self.assertNotIn(task["id"], json.dumps(dispatch))
            shown = json.loads(self.run_cli("--storage", tmp, "task", "show", task["id"]).stdout)
            self.assertEqual(shown["state"], "queued")
            self.assertFalse(shown["result_blob_id"])
            blobs = json.loads(self.run_cli("--storage", tmp, "blob", "list", "--application-id", app["id"]).stdout)
            self.assertEqual(blobs, [])


if __name__ == "__main__":
    unittest.main()
