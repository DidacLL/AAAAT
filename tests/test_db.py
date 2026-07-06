import tempfile
import unittest

from aaaat.artifacts import list_artifacts, save_artifact
from aaaat.db import add_raw_intake, connect, create_application, init_db, list_raw_intake


class DbTests(unittest.TestCase):
    def test_database_initializes_application_raw_intake_and_artifact_provenance(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = init_db(tmp)
            self.assertTrue(path.exists())
            with connect(tmp) as conn:
                app = create_application(conn, company="Demo Co", role="Engineer", keywords=["ATS"])
                self.assertEqual(app["company"], "Demo Co")

                intake = add_raw_intake(conn, app["id"], "Recruiter note", "agent")
                self.assertEqual(intake["created_by"], "agent")
                self.assertEqual(len(list_raw_intake(conn, app["id"])), 1)

                artifact = save_artifact(
                    conn,
                    app["id"],
                    "cover_letter",
                    "local/cover.pdf",
                    "Cover letter",
                    source_context="application-context",
                    agent_name="TestAgent",
                    agent_runtime="codex",
                    model_provider="optional-provider",
                    review_state="reviewed",
                )
                stored = list_artifacts(conn, app["id"])[0]
                self.assertEqual(stored["id"], artifact["id"])
                self.assertEqual(stored["application_id"], app["id"])
                self.assertEqual(stored["artifact_type"], "cover_letter")
                self.assertEqual(stored["path"], "local/cover.pdf")
                self.assertEqual(stored["label"], "Cover letter")
                self.assertTrue(stored["created_at"])
                self.assertEqual(stored["agent_name"], "TestAgent")
                self.assertEqual(stored["agent_runtime"], "codex")
                self.assertEqual(stored["model_provider"], "optional-provider")
                self.assertEqual(stored["source_context"], "application-context")
                self.assertEqual(stored["review_state"], "reviewed")
                self.assertEqual(stored["notes"], "")


if __name__ == "__main__":
    unittest.main()
