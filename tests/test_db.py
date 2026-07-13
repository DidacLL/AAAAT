import tempfile
import unittest
import zipfile
from pathlib import Path

from aaaat.artifacts import list_artifacts, save_artifact, update_artifact_state
from aaaat.db import (
    SCHEMA_VERSION,
    add_raw_intake,
    connect,
    create_application,
    create_raw_offer_intake,
    get_schema_version,
    init_db,
    list_applications,
    list_raw_intake,
)
from aaaat.demo_seed import seed as seed_desktop_demo
from aaaat.local_data import create_local_backup


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

    def test_raw_offer_intake_creates_active_candidature_with_retained_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_raw_offer_intake(conn, "Acme needs a Python engineer", "user")
                stored = list_applications(conn)[0]
                intake = list_raw_intake(conn, app["id"])

        self.assertEqual(stored["status"], "active")
        self.assertEqual(stored["company"], "Pending extraction")
        self.assertEqual(stored["role"], "Pending role")
        self.assertEqual(len(intake), 1)
        self.assertEqual(intake[0]["content"], "Acme needs a Python engineer")
        self.assertEqual(intake[0]["created_by"], "user")

    def test_desktop_demo_seed_creates_launchable_candidatures(self):
        with tempfile.TemporaryDirectory() as tmp:
            summary = seed_desktop_demo(tmp, count=3, reset=True)
            with connect(tmp) as conn:
                apps = list_applications(conn)
                raw_counts = [len(list_raw_intake(conn, app["id"])) for app in apps]

        self.assertEqual(summary, {"created": 3, "updated": 0, "total": 3})
        self.assertEqual(len(apps), 3)
        self.assertTrue(all(app["status"] in {"active", "closed"} for app in apps))
        self.assertTrue(all(count == 1 for count in raw_counts))
        self.assertTrue(any(app["keywords"] for app in apps))

    def test_schema_version_and_init_are_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            init_db(tmp)
            with connect(tmp) as conn:
                self.assertEqual(get_schema_version(conn), SCHEMA_VERSION)
                self.assertEqual(
                    conn.execute("SELECT COUNT(*) FROM schema_meta WHERE key = 'schema_version'").fetchone()[0],
                    1,
                )
                self.assertEqual(
                    conn.execute("SELECT COUNT(*) FROM glossary_terms WHERE term = 'ATS'").fetchone()[0],
                    1,
                )
                self.assertEqual(
                    conn.execute("SELECT COUNT(*) FROM templates WHERE name IN ('cv', 'cover-letter')").fetchone()[0],
                    2,
                )

    def test_backup_creation_includes_database_and_artifacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            artifact_dir = Path(tmp) / "artifacts"
            artifact_dir.mkdir()
            (artifact_dir / "cover-letter.tex").write_text("private local artifact", encoding="utf-8")

            backup = create_local_backup(tmp)

            self.assertTrue(backup.exists())
            self.assertEqual(backup.parent, Path(tmp) / "backups")
            with zipfile.ZipFile(backup) as archive:
                names = set(archive.namelist())
            self.assertIn("aaaat.sqlite3", names)
            self.assertIn("artifacts/cover-letter.tex", names)

    def test_backup_refuses_output_outside_storage_without_force(self):
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            public_output = Path(tmp) / "public-backups"
            init_db(storage)

            with self.assertRaises(ValueError):
                create_local_backup(storage, public_output)

            forced = create_local_backup(storage, public_output, force=True)
            self.assertTrue(forced.exists())

    def test_artifact_review_state_changes_and_archived_sorts_secondary(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Demo Co", role="Engineer")
                archived = save_artifact(conn, app["id"], "cover_letter", "archived.pdf", "Archived", review_state="archived")
                draft = save_artifact(conn, app["id"], "cover_letter", "draft.pdf", "Draft", review_state="draft")
                reviewed = save_artifact(conn, app["id"], "cover_letter", "reviewed.pdf", "Reviewed", review_state="reviewed")
                submitted = save_artifact(conn, app["id"], "cover_letter", "submitted.pdf", "Submitted", review_state="submitted")

                updated = update_artifact_state(conn, draft["id"], "archived", "Old draft")
                self.assertEqual(updated["review_state"], "archived")
                self.assertEqual(updated["notes"], "Old draft")

                ordered = list_artifacts(conn, app["id"])

        self.assertEqual([item["id"] for item in ordered[:2]], [submitted["id"], reviewed["id"]])
        self.assertEqual(ordered[-1]["id"], draft["id"])
        self.assertIn(archived["id"], [item["id"] for item in ordered[-2:]])


if __name__ == "__main__":
    unittest.main()
