import json
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.agent_access import submit_agent_task_result, task_handle
from aaaat.candidatures import create_candidature, get_candidature
from aaaat.db import connect, init_db
from aaaat.dispatch.command import dispatch_command
from aaaat.dispatch.manual import dispatch_manual
from aaaat.tasks import apply_task_result, create_task, get_task
from aaaat.text_blobs import get_text_blob


class ProviderAgnosticDispatchWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        init_db(self.tmp.name)
        with connect(self.tmp.name) as conn:
            self.candidature = create_candidature(
                conn,
                company="Dispatch Co",
                role="Platform Engineer",
                raw_offer="Python platform role",
            )
            self.task = create_task(
                conn,
                "company_research",
                "Research Dispatch Co",
                application_id=self.candidature["id"],
                context_hint="candidature:company_research",
            )
        self.handle = task_handle(self.task)

    def runner_command(self, name: str, source: str) -> str:
        runner = Path(self.tmp.name) / name
        runner.write_text(source, encoding="utf-8")
        return f'"{sys.executable}" "{runner}"'

    def test_manual_packet_can_be_completed_and_applied_through_existing_task_binding(self):
        with connect(self.tmp.name) as conn:
            dispatch = dispatch_manual(conn, self.tmp.name, self.handle)

        packet_path = Path(dispatch["packet_path"])
        packet = json.loads(packet_path.read_text(encoding="utf-8"))
        self.assertEqual(packet["task_handle"], self.handle)
        self.assertEqual(packet["task_type"], "company_research")
        self.assertEqual(packet["purpose"], "market_research")
        self.assertIn("company_research", packet["response_format"]["required"])

        external_result = {"company_research": "Research produced by the user's preferred agent."}
        with connect(self.tmp.name) as conn:
            submitted = submit_agent_task_result(
                conn,
                self.handle,
                json.dumps(external_result),
                agent_name="preferred-agent",
                agent_runtime="manual",
                model_provider="user-managed",
            )
            before_apply = get_candidature(conn, self.candidature["id"])
            blob = get_text_blob(conn, submitted["result_blob_id"])
            applied = apply_task_result(conn, self.task["id"])
            after_apply = get_candidature(conn, self.candidature["id"])

        self.assertEqual(submitted["state"], "completed")
        self.assertEqual(before_apply["company_research"], "")
        self.assertEqual(blob["review_state"], "suggested")
        self.assertEqual(json.loads(blob["body"]), external_result)
        self.assertEqual(blob["agent_name"], "preferred-agent")
        self.assertEqual(applied["state"], "completed")
        self.assertEqual(after_apply["company_research"], external_result["company_research"])

    def test_command_backend_accepts_any_user_command_output_without_auto_apply(self):
        command = self.runner_command(
            "runner.py",
            "import json, sys\n"
            "packet = json.load(sys.stdin)\n"
            "assert packet['task_type'] == 'company_research'\n"
            "json.dump({'company_research': 'Result from user-owned command'}, sys.stdout)\n",
        )

        with connect(self.tmp.name) as conn:
            acknowledgement = dispatch_command(conn, self.handle, command)
            stored_task = get_task(conn, self.task["id"])
            blob = get_text_blob(conn, stored_task["result_blob_id"])

        self.assertEqual(acknowledgement["exit_code"], 0)
        self.assertTrue(acknowledgement["submitted"])
        self.assertEqual(stored_task["state"], "completed")
        self.assertEqual(json.loads(blob["body"])["company_research"], "Result from user-owned command")
        self.assertEqual(blob["agent_runtime"], "command")

    def test_failed_user_command_does_not_create_a_task_result(self):
        command = self.runner_command(
            "failing_runner.py",
            "import sys\nsys.stderr.write('runner failed')\nraise SystemExit(7)\n",
        )

        with connect(self.tmp.name) as conn:
            acknowledgement = dispatch_command(conn, self.handle, command)
            stored_task = get_task(conn, self.task["id"])

        self.assertEqual(acknowledgement["exit_code"], 7)
        self.assertFalse(acknowledgement["submitted"])
        self.assertIn("runner failed", acknowledgement["stderr"])
        self.assertIsNone(stored_task["result_blob_id"])
        self.assertEqual(stored_task["state"], "queued")


if __name__ == "__main__":
    unittest.main()
