import json
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.artifacts import get_artifact
from aaaat.candidatures import create_candidature, get_candidature
from aaaat.db import connect, init_db, set_profile_variable
from aaaat.tasks import get_task
from aaaat.text_blobs import get_text_blob
from aaaat.ui_desktop.agent_workflow import DesktopAgentWorkflowError, DesktopAgentWorkflowService


class DesktopAgentWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        init_db(self.tmp.name)
        with connect(self.tmp.name) as conn:
            set_profile_variable(conn, "profile.display_name", "Ada Example")
            self.candidature = create_candidature(
                conn,
                company="Release Co",
                role="Platform Engineer",
                raw_offer="Python platform role",
            )
        self.service = DesktopAgentWorkflowService(self.tmp.name)

    def write_result(self, name, payload):
        path = Path(self.tmp.name) / name
        path.write_text(json.dumps(payload), encoding="utf-8")
        return path

    def write_runner(self, name, source):
        path = Path(self.tmp.name) / name
        path.write_text(source, encoding="utf-8")
        return f'"{sys.executable}" "{path}"'

    def test_company_research_stays_suggested_until_explicit_apply(self):
        task = self.service.create_task(self.candidature["id"], "company_research")
        packet = self.service.export_packet(task["id"])
        submitted = self.service.submit_result_file(
            task["id"],
            self.write_result("research.json", {"company_research": "External research result"}),
            agent_name="preferred-agent",
        )

        with connect(self.tmp.name) as conn:
            before = get_candidature(conn, self.candidature["id"])
            blob = get_text_blob(conn, submitted["result_blob_id"])

        self.assertTrue(packet.exists())
        self.assertEqual(submitted["review_state"], "suggested")
        self.assertEqual(before["company_research"], "")
        self.assertEqual(blob["agent_name"], "preferred-agent")

        applied = self.service.apply_result(task["id"])
        with connect(self.tmp.name) as conn:
            after = get_candidature(conn, self.candidature["id"])
            applied_blob = get_text_blob(conn, applied["result_blob_id"])

        self.assertEqual(after["company_research"], "External research result")
        self.assertEqual(applied_blob["review_state"], "applied")

    def test_user_owned_command_can_complete_desktop_task(self):
        task = self.service.create_task(self.candidature["id"], "company_research")
        command = self.write_runner(
            "desktop-runner.py",
            "import json, sys\n"
            "packet = json.load(sys.stdin)\n"
            "assert packet['task_type'] == 'company_research'\n"
            "json.dump({'company_research': 'Desktop command result'}, sys.stdout)\n",
        )
        completed = self.service.run_command(task["id"], command)

        self.assertEqual(completed["state"], "completed")
        self.assertEqual(completed["review_state"], "suggested")
        self.assertEqual(json.loads(completed["result_body"])["company_research"], "Desktop command result")
        self.assertEqual(completed["agent_runtime"], "command")

    def test_user_owned_command_failure_leaves_desktop_task_queued(self):
        task = self.service.create_task(self.candidature["id"], "company_research")
        command = self.write_runner(
            "desktop-invalid-runner.py",
            "import json, sys\njson.dump({'summary': 'wrong shape'}, sys.stdout)\n",
        )
        with self.assertRaises(DesktopAgentWorkflowError):
            self.service.run_command(task["id"], command)

        with connect(self.tmp.name) as conn:
            stored = get_task(conn, task["id"])
        self.assertEqual(stored["state"], "queued")
        self.assertIsNone(stored["result_blob_id"])

    def test_user_can_edit_valid_result_before_apply(self):
        task = self.service.create_task(self.candidature["id"], "company_research")
        submitted = self.service.submit_result_file(
            task["id"],
            self.write_result("research-edit.json", {"company_research": "Initial research"}),
        )
        edited = self.service.update_result(
            task["id"],
            json.dumps({"company_research": "Reviewed and edited research"}),
        )

        with connect(self.tmp.name) as conn:
            blob = get_text_blob(conn, submitted["result_blob_id"])
            before = get_candidature(conn, self.candidature["id"])

        self.assertEqual(edited["review_state"], "suggested")
        self.assertEqual(json.loads(blob["body"])["company_research"], "Reviewed and edited research")
        self.assertIn("Edited by user", blob["notes"])
        self.assertEqual(before["company_research"], "")

        self.service.apply_result(task["id"])
        with connect(self.tmp.name) as conn:
            after = get_candidature(conn, self.candidature["id"])
        self.assertEqual(after["company_research"], "Reviewed and edited research")

    def test_import_and_edit_reject_results_that_do_not_match_task_contract(self):
        task = self.service.create_task(self.candidature["id"], "company_research")
        with self.assertRaises(DesktopAgentWorkflowError):
            self.service.submit_result_file(
                task["id"],
                self.write_result("invalid-research.json", {"summary": "wrong shape"}),
            )

        valid = self.service.submit_result_file(
            task["id"],
            self.write_result("valid-research.json", {"company_research": "Valid"}),
        )
        with self.assertRaises(DesktopAgentWorkflowError):
            self.service.update_result(task["id"], json.dumps({"summary": "wrong shape"}))

        with connect(self.tmp.name) as conn:
            stored = get_task(conn, task["id"])
            blob = get_text_blob(conn, valid["result_blob_id"])
        self.assertEqual(stored["state"], "completed")
        self.assertEqual(json.loads(blob["body"]), {"company_research": "Valid"})

    def test_cover_letter_requires_render_then_opens_and_reviews_artifact(self):
        task = self.service.create_task(self.candidature["id"], "draft_cover_letter")
        submitted = self.service.submit_result_file(
            task["id"],
            self.write_result(
                "cover-letter.json",
                {"cover_letter_body": "My experience matches the role and its platform challenges."},
            ),
        )

        with self.assertRaises(DesktopAgentWorkflowError):
            self.service.apply_result(task["id"])

        rendered = self.service.render_cover_letter(task["id"])
        tex_path = self.service.artifact_path(task["id"])
        self.assertEqual(tex_path, Path(rendered["artifact"]["tex_path"]))
        self.assertTrue(tex_path.exists())
        self.assertIn("My experience matches the role", tex_path.read_text(encoding="utf-8"))
        self.assertEqual(submitted["review_state"], "suggested")

        applied = self.service.apply_result(task["id"])
        with connect(self.tmp.name) as conn:
            artifact = get_artifact(conn, applied["artifact_id"])
            blob = get_text_blob(conn, applied["result_blob_id"])

        self.assertEqual(artifact["review_state"], "reviewed")
        self.assertEqual(blob["review_state"], "applied")

    def test_editing_cover_letter_after_render_requires_a_fresh_artifact(self):
        task = self.service.create_task(self.candidature["id"], "draft_cover_letter")
        self.service.submit_result_file(
            task["id"],
            self.write_result("cover-letter-stale.json", {"cover_letter_body": "First version"}),
        )
        self.service.render_cover_letter(task["id"])
        edited = self.service.update_result(
            task["id"],
            json.dumps({"cover_letter_body": "Second version"}),
        )

        self.assertIsNone(edited["artifact_id"])
        with self.assertRaises(DesktopAgentWorkflowError):
            self.service.apply_result(task["id"])

        rendered = self.service.render_cover_letter(task["id"])
        self.assertIn("Second version", Path(rendered["artifact"]["tex_path"]).read_text(encoding="utf-8"))

    def test_reject_archives_result_and_does_not_change_candidature(self):
        task = self.service.create_task(self.candidature["id"], "company_research")
        submitted = self.service.submit_result_file(
            task["id"],
            self.write_result("rejected.json", {"company_research": "Do not apply"}),
        )
        rejected = self.service.reject_result(task["id"])

        with connect(self.tmp.name) as conn:
            candidature = get_candidature(conn, self.candidature["id"])
            blob = get_text_blob(conn, submitted["result_blob_id"])

        self.assertEqual(rejected["state"], "cancelled")
        self.assertEqual(blob["review_state"], "archived")
        self.assertIn("Rejected by user", blob["notes"])
        self.assertEqual(candidature["company_research"], "")


if __name__ == "__main__":
    unittest.main()
