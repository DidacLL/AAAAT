import json
import tempfile
import unittest

from aaaat.agent_access import (
    build_agent_task_context,
    claim_agent_task,
    list_agent_task_envelopes,
    release_agent_task,
    submit_agent_task_result,
)
from aaaat.candidatures import create_candidature, get_candidature
from aaaat.db import connect, init_db, set_profile_variable
from aaaat.profile_facts import create_profile_fact
from aaaat.tasks import create_task, get_task
from aaaat.text_blobs import get_text_blob


class AgentAccessTests(unittest.TestCase):
    def test_task_envelopes_are_minimal(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_candidature(conn, company="Envelope Co", role="Engineer", raw_offer="Secret offer")
                create_task(conn, "company_research", "Research", application_id=app["id"], context_hint="candidature:company_research")
                envelopes = list_agent_task_envelopes(conn, state="queued")

        self.assertTrue(envelopes)
        allowed = {"id", "task_type", "title", "state", "priority", "context_hint", "created_at", "updated_at", "allowed_actions"}
        for envelope in envelopes:
            self.assertLessEqual(set(envelope), allowed)
        serialized = json.dumps(envelopes)
        self.assertNotIn("raw_intake", serialized)
        self.assertNotIn("Secret offer", serialized)
        self.assertNotIn("notes_records", serialized)
        self.assertNotIn("profile_facts", serialized)
        self.assertNotIn("variables", serialized)
        self.assertNotIn("artifacts", serialized)
        self.assertNotIn("text_blobs", serialized)

    def test_field_inference_context_is_task_specific(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_candidature(conn, company="Field Co", role="Engineer", raw_offer="Python role in Madrid")
                other = create_candidature(conn, company="Other Private Co", role="Private Role", raw_offer="Do not leak")
                task = create_task(conn, "field_inference", "Infer", application_id=app["id"], context_hint="candidature:field_inference")
                context = build_agent_task_context(conn, task["id"])

        serialized = json.dumps(context)
        self.assertEqual(context["task"]["id"], task["id"])
        self.assertIn("source_material", context["context"])
        self.assertIn("missing_fields", context["context"])
        self.assertIn("protected_fields", context["context"])
        self.assertNotIn(other["id"], serialized)
        self.assertNotIn("Other Private Co", serialized)
        self.assertNotIn("Do not leak", serialized)
        self.assertNotIn("raw_intake", serialized)
        self.assertNotIn("/api/tasks/", serialized)
        self.assertIn("/api/agent/tasks/", serialized)

    def test_cv_context_uses_privacy_filtered_profile_context(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Private Candidate")
                create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Python",
                    body="PRIVATE PROFILE FACT",
                    exposure="placeholder",
                    use_for_cv=True,
                )
                app = create_candidature(conn, company="CV Co", role="Engineer", keywords=["Python"], include_cv_task=True)
                task = next(item for item in app["tasks"] if item["task_type"] == "draft_cv")
                context = build_agent_task_context(conn, task["id"])

        serialized = json.dumps(context)
        self.assertIn("profile_context", context["context"])
        self.assertNotIn("Private Candidate", serialized)
        self.assertNotIn("PRIVATE PROFILE FACT", serialized)
        self.assertIn("{{ profile_fact.", serialized)

    def test_submit_claim_and_release_preserve_task_boundary(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_candidature(conn, company="Submit Co", role="Engineer", pitch="Human pitch")
                task = create_task(conn, "pitch_draft", "Draft pitch", application_id=app["id"], context_hint="field:pitch")
                claimed = claim_agent_task(conn, task["id"], agent_name="Agent", agent_runtime="cli")
                released = release_agent_task(conn, task["id"])
                submitted = submit_agent_task_result(
                    conn,
                    task["id"],
                    "Agent pitch",
                    agent_name="Agent",
                    agent_runtime="cli",
                    model_provider="local",
                )
                loaded = get_candidature(conn, app["id"])
                blob = get_text_blob(conn, submitted["result_blob_id"])
                task_row = get_task(conn, task["id"])

        self.assertEqual(claimed["state"], "claimed")
        self.assertEqual(released["state"], "queued")
        self.assertEqual(submitted["state"], "completed")
        self.assertEqual(loaded["pitch"], "Human pitch")
        self.assertEqual(blob["body"], "Agent pitch")
        self.assertEqual(blob["agent_name"], "Agent")
        self.assertEqual(blob["agent_runtime"], "cli")
        self.assertEqual(blob["model_provider"], "local")
        self.assertEqual(task_row["result_blob_id"], blob["id"])


if __name__ == "__main__":
    unittest.main()
