import json
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

    def test_import_rejects_result_that_does_not_match_task_contract(self):
        task = self.service.create_task(self.candidature["id"], "company_research")
        with self.assertRaises(DesktopAgentWorkflowError):
            self.service.submit_result_file(
                task["id"],
                self.write_result("invalid-research.json", {"summary": "wrong shape"}),
            )

        with connect(self.tmp.name) as conn:
            stored = get_task(conn, task["id"])
        self.assertEqual(stored["state"], "queued")
        self.assertIsNone(stored["result_blob_id"])

    def test_cover_letter_result_renders_local_artifact_then_reviews_on_apply(self):
        task = self.service.create_task(self.candidature["id"], "draft_cover_letter")
        submitted = self.service.submit_result_file(
            task["id"],
            self.write_result(
                "cover-letter.json",
                {"cover_letter_body": "My experience matches the role and its platform challenges."},
            ),
        )
        rendered = self.service.render_cover_letter(task["id"])

        tex_path = Path(rendered["artifact"]["tex_path"])
        self.assertTrue(tex_path.exists())
        self.assertIn("My experience matches the role", tex_path.read_text(encoding="utf-8"))
        self.assertEqual(submitted["review_state"], "suggested")

        applied = self.service.apply_result(task["id"])
        with connect(self.tmp.name) as conn:
            artifact = get_artifact(conn, applied["artifact_id"])
            blob = get_text_blob(conn, applied["result_blob_id"])

        self.assertEqual(artifact["review_state"], "reviewed")
        self.assertEqual(blob["review_state"], "applied")

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
