import json
import tempfile
import unittest

from aaaat.agent_actions import get_agent_context_bundle, submit_agent_action
from aaaat.candidatures import list_candidatures
from aaaat.career_plans import create_career_plan
from aaaat.db import connect, init_db, set_profile_variable
from aaaat.profile_facts import create_profile_fact


class AgentActionTests(unittest.TestCase):
    def test_context_bundle_uses_agent_profile_exposure_and_career_plan(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Python",
                    body="PRIVATE PYTHON DETAIL",
                    exposure="placeholder",
                    use_for_cover_letter=True,
                )
                plan = create_career_plan(
                    conn,
                    body="Target local-first backend tooling roles.",
                    objectives=["senior backend"],
                    constraints=["remote-friendly"],
                    target_markets=["EU"],
                    target_roles=["Backend Engineer"],
                )
                bundle = get_agent_context_bundle(conn, "cover_letter")

        serialized = json.dumps(bundle)
        self.assertEqual(bundle["purpose"], "cover_letter")
        self.assertEqual(bundle["scope"], "agent")
        self.assertIn("{{ profile_fact.", serialized)
        self.assertIn("career_plans", bundle)
        self.assertEqual(bundle["career_plans"][0]["body"], "Target local-first backend tooling roles.")
        self.assertNotIn(plan["id"], serialized)
        self.assertNotIn("PRIVATE PYTHON DETAIL", serialized)

    def test_create_candidature_preserves_source_outputs_and_renders_locally(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Local Candidate")
                set_profile_variable(conn, "email", "candidate@example.invalid")
                packet = {
                    "action": "create_candidature",
                    "payload": {
                        "source_material": {
                            "offer_text": "Full raw offer with Python and APIs.",
                            "offer_url": "https://example.invalid/jobs/1",
                            "offer_source": "job board",
                            "application_form_text": "Raw form asks salary and availability.",
                            "user_instructions": "Keep the letter concise.",
                            "conversation_context": "The user prefers backend automation roles.",
                        },
                        "candidature": {
                            "company": "Acme",
                            "role": "Backend Engineer",
                            "location": "Barcelona",
                            "remote_mode": "hybrid",
                            "offer_snapshot": "Backend API role.",
                            "keywords": ["Python", "APIs"],
                            "description": "Build platform automation.",
                            "tech_stack": "Python, FastAPI",
                            "valuation": 8,
                        },
                        "outputs": {
                            "company_research": "Acme builds developer tools.",
                            "technical_reading": "Read their API docs.",
                            "call_signals": "Ask about platform ownership.",
                            "pitch": "Backend automation positioning.",
                            "smart_question": "How do teams ship internal tooling?",
                            "risks_to_avoid": "Avoid over-indexing on management.",
                            "prepare_first": "Review API product.",
                            "prepare_later": "Map team structure.",
                            "form_answers": "Salary: flexible. Availability: two weeks.",
                            "cover_letter_body": "I can help Acme automate backend workflows.",
                            "cv_positioning": "Lead with Python automation.",
                        },
                        "render": {"cover_letter": True},
                    },
                }
                ack = submit_agent_action(
                    conn,
                    packet,
                    agent_name="Agent",
                    agent_runtime="cli",
                    model_provider="local",
                    expose_internal_ids=True,
                    storage_path=tmp,
                )
                loaded = list_candidatures(conn, include_related=True)[0]

        self.assertEqual(
            ack,
            {
                "status": "accepted",
                "action": "create_candidature",
                "created": True,
                "rendered": {"cover_letter": True},
                "next": ["open_dashboard"],
            },
        )
        self.assertNotIn("internal", ack)
        self.assertEqual(loaded["company"], "Acme")
        self.assertEqual(loaded["role"], "Backend Engineer")
        self.assertEqual(loaded["source"], "job board")
        self.assertEqual(loaded["source_url"], "https://example.invalid/jobs/1")
        self.assertEqual(loaded["keywords"], ["APIs", "Python"])
        self.assertEqual(loaded["company_research"], "Acme builds developer tools.")
        self.assertEqual(loaded["technical_reading"], "Read their API docs.")
        self.assertEqual(loaded["form_answers"], "Salary: flexible. Availability: two weeks.")
        self.assertEqual(loaded["details"]["raw_application_form"], "Raw form asks salary and availability.")
        self.assertEqual(loaded["details"]["description"], "Build platform automation.")
        self.assertEqual(loaded["details"]["tech_stack"], "Python, FastAPI")
        self.assertEqual(loaded["details"]["valuation"], 8)
        self.assertEqual([item["content"] for item in loaded["raw_intake"]], ["Full raw offer with Python and APIs."])
        blob_types = {item["blob_type"]: item for item in loaded["text_blobs"]}
        self.assertEqual(blob_types["cover_letter_body"]["body"], "I can help Acme automate backend workflows.")
        self.assertEqual(blob_types["cv_positioning"]["body"], "Lead with Python automation.")
        self.assertEqual(blob_types["user_instructions"]["created_by"], "agent")
        self.assertTrue(any(item["artifact_type"] == "cover_letter" for item in loaded["artifacts"]))
        self.assertEqual(loaded["tasks"], [])

    def test_create_candidature_requested_tasks_queue_bounded_follow_up(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                ack = submit_agent_action(
                    conn,
                    {
                        "action": "create_candidature",
                        "payload": {
                            "source_material": {"offer_text": "Backend platform role."},
                            "candidature": {"company": "Research Co", "role": "Backend Engineer"},
                            "requested_tasks": [
                                {
                                    "task_type": "company_research",
                                    "priority": "low",
                                    "reason": "Research was not completed during the conversation.",
                                }
                            ],
                        },
                    },
                    agent_name="Agent",
                    agent_runtime="cli",
                    storage_path=tmp,
                )
                loaded = list_candidatures(conn, include_related=True)[0]

        self.assertEqual(ack["queued"], {"count": 1})
        self.assertEqual(ack["next"], ["open_dashboard"])
        serialized_ack = json.dumps(ack)
        self.assertNotIn("task_", serialized_ack)
        self.assertNotIn("app_", serialized_ack)
        self.assertNotIn(tmp, serialized_ack)
        self.assertEqual(len(loaded["tasks"]), 1)
        task = loaded["tasks"][0]
        self.assertEqual(task["task_type"], "company_research")
        self.assertEqual(task["priority"], "low")
        self.assertEqual(task["context_hint"], "candidature:company_research")
        self.assertIn("Research was not completed", task["instructions"])
        self.assertEqual(task["created_by"], "agent")

    def test_requested_tasks_skip_completed_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Local Candidate")
                set_profile_variable(conn, "email", "candidate@example.invalid")
                ack = submit_agent_action(
                    conn,
                    {
                        "action": "create_candidature",
                        "payload": {
                            "candidature": {"company": "Done Co", "role": "Platform Engineer"},
                            "outputs": {
                                "company_research": "Already researched.",
                                "form_answers": "Already drafted.",
                                "cover_letter_body": "Already drafted cover letter.",
                                "cv_positioning": "Already positioned CV.",
                            },
                            "render": {"cover_letter": True},
                            "requested_tasks": [
                                {"task_type": "company_research", "reason": "duplicate"},
                                {"task_type": "draft_form_responses", "reason": "duplicate"},
                                {"task_type": "draft_cover_letter", "reason": "duplicate"},
                                {"task_type": "draft_cv", "reason": "duplicate"},
                            ],
                        },
                    },
                    storage_path=tmp,
                )
                loaded = list_candidatures(conn, include_related=True)[0]

        self.assertEqual(ack["queued"], {"count": 0})
        self.assertEqual(loaded["tasks"], [])
        self.assertTrue(any(item["artifact_type"] == "cover_letter" for item in loaded["artifacts"]))
        self.assertEqual(loaded["company_research"], "Already researched.")
        self.assertEqual(loaded["form_answers"], "Already drafted.")

    def test_requested_tasks_reject_unsupported_types_and_malformed_keyword_tasks(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                with self.assertRaisesRegex(ValueError, "Unsupported requested task type: career_plan_review"):
                    submit_agent_action(
                        conn,
                        {
                            "action": "create_candidature",
                            "payload": {"requested_tasks": [{"task_type": "career_plan_review"}]},
                        },
                    )
                with self.assertRaisesRegex(ValueError, "keyword_definition requested task requires keyword"):
                    submit_agent_action(
                        conn,
                        {
                            "action": "create_candidature",
                            "payload": {"requested_tasks": [{"task_type": "keyword_definition"}]},
                        },
                    )

    def test_cv_render_uses_existing_template_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Local Candidate")
                set_profile_variable(conn, "email", "candidate@example.invalid")
                set_profile_variable(conn, "summary.default", "Builds local tools.")
                ack = submit_agent_action(
                    conn,
                    {
                        "action": "create_candidature",
                        "payload": {
                            "candidature": {"company": "CV Co", "role": "Platform Engineer"},
                            "outputs": {"pitch": "Platform automation."},
                            "render": {"cv": True},
                        },
                    },
                    storage_path=tmp,
                )
                loaded = list_candidatures(conn, include_related=True)[0]

        self.assertEqual(ack["rendered"], {"cv": True})
        self.assertTrue(any(item["artifact_type"] == "cv" for item in loaded["artifacts"]))

    def test_action_validation_rejects_unknown_and_malformed_packets(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                with self.assertRaisesRegex(ValueError, "Unsupported agent action"):
                    submit_agent_action(conn, {"action": "delete_candidature", "payload": {}})
                with self.assertRaisesRegex(ValueError, "payload must be an object"):
                    submit_agent_action(conn, {"action": "create_candidature", "payload": []})
                with self.assertRaisesRegex(ValueError, "Unsupported create_candidature payload sections"):
                    submit_agent_action(conn, {"action": "create_candidature", "payload": {"private_database_query": {}}})
                with self.assertRaisesRegex(ValueError, "section must be a list: requested_tasks"):
                    submit_agent_action(conn, {"action": "create_candidature", "payload": {"requested_tasks": {}}})
                with self.assertRaisesRegex(ValueError, "valid JSON"):
                    submit_agent_action(conn, "{not-json")
                with self.assertRaisesRegex(ValueError, "cover_letter_body is required"):
                    submit_agent_action(
                        conn,
                        {"action": "create_candidature", "payload": {"render": {"cover_letter": True}}},
                        storage_path=tmp,
                    )


if __name__ == "__main__":
    unittest.main()
