import json
import tempfile
import unittest
from typing import Any

from aaaat.agent_access import (
    FORBIDDEN_AGENT_CONTEXT_KEYS,
    build_agent_task_context,
    claim_agent_task,
    list_agent_task_envelopes,
    next_agent_task_envelope,
    release_agent_task,
    submit_agent_task_result,
    task_handle,
    task_result_ack,
)
from aaaat.candidatures import create_candidature, get_candidature
from aaaat.db import connect, create_application, init_db, set_profile_variable
from aaaat.dispatch.packet import build_task_packet
from aaaat.profile_facts import create_profile_fact
from aaaat.tasks import apply_task_result, create_task, get_task
from aaaat.text_blobs import get_text_blob


def object_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        keys.update(value)
        for item in value.values():
            keys.update(object_keys(item))
    elif isinstance(value, list):
        for item in value:
            keys.update(object_keys(item))
    return keys


class AgentAccessTests(unittest.TestCase):
    def test_task_envelopes_are_handle_scoped_and_minimal(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Envelope Co", role="Engineer")
                task = create_task(conn, "company_research", "Research", application_id=app["id"], context_hint="candidature:company_research")
                handle = task_handle(task)
                envelopes = list_agent_task_envelopes(conn, state="queued")
                next_task = next_agent_task_envelope(conn)

        self.assertTrue(envelopes)
        self.assertEqual(next_task["state"], "queued")
        matching = next(item for item in envelopes if item["task_handle"] == handle)
        self.assertNotEqual(handle, task["id"])
        self.assertTrue(handle.startswith("taskh_"))
        self.assertEqual(matching["allowed_actions"], ["context", "submit"])
        self.assertEqual(matching["purpose"], "market_research")
        self.assertNotIn("id", matching)
        self.assertNotIn("application_id", matching)
        self.assertNotIn(task["id"], json.dumps(envelopes))
        self.assertNotIn("Envelope Co", json.dumps(envelopes))

    def test_task_context_is_specific_to_the_opaque_task_handle(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_candidature(conn, company="Field Co", role="Engineer", raw_offer="Python role in Madrid")
                create_candidature(conn, company="Other Private Co", role="Private Role", raw_offer="Do not leak")
                task = create_task(conn, "field_inference", "Infer", application_id=app["id"], context_hint="candidature:field_inference")
                handle = task_handle(task)
                context = build_agent_task_context(conn, handle)
                with self.assertRaises(KeyError):
                    build_agent_task_context(conn, task["id"])

        serialized = json.dumps(context)
        self.assertEqual(context["task"]["task_handle"], handle)
        self.assertNotEqual(context["task"]["task_handle"], task["id"])
        self.assertNotIn("id", context["task"])
        self.assertEqual(context["purpose"], "candidature_field_inference")
        self.assertTrue(context["instructions"]["default"])
        self.assertEqual(context["response_format"]["type"], "json_object")
        self.assertIn("fields", context["response_format"]["required"])
        self.assertIn("source_material", context["input_context"])
        self.assertIn("missing_fields", context["input_context"])
        self.assertIn("protected_fields", context["input_context"])
        self.assertNotIn("Other Private Co", serialized)
        self.assertNotIn("Do not leak", serialized)
        self.assertNotIn(task["id"], serialized)
        self.assertTrue(FORBIDDEN_AGENT_CONTEXT_KEYS.isdisjoint(object_keys(context)))
        self.assertEqual(context["write_back"], {"submit": f"/api/agent/tasks/{handle}/result"})

    def test_task_packet_is_self_contained_and_uses_contract_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_candidature(conn, company="Packet Co", role="Engineer", raw_offer="Role needs Python")
                task = create_task(conn, "company_research", "Research Packet Co", application_id=app["id"], context_hint="candidature:company_research")
                handle = task_handle(task)
                packet = build_task_packet(conn, handle)

        self.assertEqual(
            set(packet),
            {
                "packet_version",
                "task_handle",
                "task_type",
                "title",
                "instructions",
                "purpose",
                "input_context",
                "output_contract",
                "response_format",
                "allowed_actions",
                "privacy_notes",
                "callback_instructions",
            },
        )
        self.assertEqual(packet["task_handle"], handle)
        self.assertEqual(packet["task_type"], "company_research")
        self.assertEqual(packet["purpose"], "market_research")
        self.assertTrue(packet["instructions"]["default"])
        self.assertIn("company_research", packet["response_format"]["required"])
        self.assertFalse(packet["output_contract"]["entity_ids_allowed"])
        self.assertEqual(packet["allowed_actions"], ["context", "submit"])
        serialized = json.dumps(packet)
        self.assertNotIn(task["id"], serialized)
        self.assertNotIn("application_id", serialized)
        self.assertTrue(FORBIDDEN_AGENT_CONTEXT_KEYS.isdisjoint(object_keys(packet)))

    def test_cv_context_uses_privacy_filtered_profile_context_without_fact_ids(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Private Candidate")
                fact = create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Python",
                    body="PRIVATE PROFILE FACT",
                    exposure="placeholder",
                    use_for_cv=True,
                )
                app = create_candidature(conn, company="CV Co", role="Engineer", keywords=["Python"], include_cv_task=True)
                task = next(item for item in app["tasks"] if item["task_type"] == "draft_cv")
                context = build_agent_task_context(conn, task_handle(task))

        serialized = json.dumps(context)
        self.assertIn("profile_context", context["input_context"])
        self.assertIn("{{ profile_fact.skill.python }}", serialized)
        self.assertNotIn(fact["id"], serialized)
        self.assertNotIn("PRIVATE PROFILE FACT", serialized)
        self.assertIn("cv_positioning", context["response_format"]["required"])
        self.assertTrue(FORBIDDEN_AGENT_CONTEXT_KEYS.isdisjoint(object_keys(context)))
        for fact_context in context["input_context"]["profile_context"]["facts"]:
            self.assertNotIn("id", fact_context)
            self.assertIn("fact_ref", fact_context)

    def test_task_submission_ack_is_narrow_and_apply_uses_internal_binding(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_candidature(conn, company="Submit Co", role="Engineer", pitch="Human pitch")
                task = create_task(conn, "company_research", "Research", application_id=app["id"], context_hint="candidature:company_research")
                handle = task_handle(task)
                claimed = claim_agent_task(conn, handle, agent_name="Agent", agent_runtime="cli")
                released = release_agent_task(conn, handle)
                submitted = submit_agent_task_result(
                    conn,
                    handle,
                    json.dumps({"company_research": "Agent research"}),
                    agent_name="Agent",
                    agent_runtime="cli",
                    model_provider="local",
                )
                ack = task_result_ack(submitted)
                loaded_before_apply = get_candidature(conn, app["id"])
                blob = get_text_blob(conn, submitted["result_blob_id"])
                task_row = get_task(conn, task["id"])
                applied = apply_task_result(conn, task["id"])
                loaded_after_apply = get_candidature(conn, app["id"])

        self.assertEqual(claimed["state"], "claimed")
        self.assertEqual(released["state"], "queued")
        self.assertEqual(submitted["state"], "completed")
        self.assertEqual(set(ack), {"status", "task", "next"})
        self.assertEqual(ack["task"], {"task_handle": handle, "state": "completed"})
        self.assertNotIn(task["id"], json.dumps(ack))
        self.assertTrue(FORBIDDEN_AGENT_CONTEXT_KEYS.isdisjoint(object_keys(ack)))
        self.assertEqual(loaded_before_apply["company_research"], "")
        self.assertEqual(loaded_after_apply["company_research"], "Agent research")
        self.assertEqual(applied["state"], "completed")
        self.assertEqual(json.loads(blob["body"])["company_research"], "Agent research")
        self.assertEqual(blob["agent_name"], "Agent")
        self.assertEqual(blob["agent_runtime"], "cli")
        self.assertEqual(blob["model_provider"], "local")
        self.assertEqual(task_row["result_blob_id"], blob["id"])


if __name__ == "__main__":
    unittest.main()
