import json
import tempfile
import unittest

from aaaat.agent_access import (
    FORBIDDEN_AGENT_CONTEXT_KEYS,
    build_agent_task_context,
    list_agent_task_envelopes,
    submit_agent_task_result,
    task_handle,
)
from aaaat.candidatures import create_candidature
from aaaat.db import connect, init_db
from aaaat.dispatch.packet import build_task_packet
from aaaat.profile_facts import create_profile_fact
from aaaat.tasks import create_task


def object_keys(value):
    keys = set()
    if isinstance(value, dict):
        keys.update(value)
        for item in value.values():
            keys.update(object_keys(item))
    elif isinstance(value, list):
        for item in value:
            keys.update(object_keys(item))
    return keys


class AgentAccessContractTests(unittest.TestCase):
    def test_envelopes_are_opaque_and_do_not_expose_candidature_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(
                    conn,
                    company="Private company",
                    role="Private role",
                    raw_offer="Private offer",
                )
                task = create_task(
                    conn,
                    "company_research",
                    "Research company",
                    application_id=candidature["id"],
                    context_hint="candidature:company_research",
                )
                handle = task_handle(task)
                envelopes = list_agent_task_envelopes(conn, state="queued")
                matching = next(item for item in envelopes if item["task_handle"] == handle)

        serialized = json.dumps(envelopes)
        self.assertTrue(matching["task_handle"].startswith("taskh_"))
        self.assertNotEqual(matching["task_handle"], task["id"])
        self.assertNotIn(task["id"], serialized)
        self.assertNotIn(candidature["id"], serialized)
        self.assertNotIn("Private company", serialized)
        self.assertEqual(matching["allowed_actions"], ["context", "submit"])

    def test_task_context_uses_cli_write_back_and_bounded_input_context(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(
                    conn,
                    company="Context company",
                    role="Engineer",
                    raw_offer="Python role in Madrid",
                )
                task = create_task(
                    conn,
                    "field_inference",
                    "Review offer details",
                    application_id=candidature["id"],
                    context_hint="candidature:field_inference",
                )
                handle = task_handle(task)
                context = build_agent_task_context(conn, handle)

        serialized = json.dumps(context)
        self.assertNotIn("context", context)
        self.assertIn("input_context", context)
        self.assertIn("source_material", context["input_context"])
        self.assertEqual(
            context["write_back"],
            {"submit_cli": f"aaaat agent submit {handle} --result-file result.json"},
        )
        self.assertNotIn("/api/", serialized)
        self.assertNotIn(task["id"], serialized)
        self.assertTrue(FORBIDDEN_AGENT_CONTEXT_KEYS.isdisjoint(object_keys(context)))

    def test_profile_context_respects_fact_exposure(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                fact = create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Writing",
                    body="Private evidence",
                    exposure="placeholder",
                    use_for_cv=True,
                )
                candidature = create_candidature(conn, company="CV company", role="Writer")
                task = create_task(
                    conn,
                    "draft_cv",
                    "Prepare tailored CV",
                    application_id=candidature["id"],
                    context_hint="artifact:cv",
                )
                context = build_agent_task_context(conn, task_handle(task))

        serialized = json.dumps(context)
        self.assertIn("{{ profile_fact.skill.writing }}", serialized)
        self.assertNotIn("Private evidence", serialized)
        self.assertNotIn(fact["id"], serialized)

    def test_portable_packet_uses_current_input_context_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(conn, company="Packet company", role="Analyst")
                task = create_task(
                    conn,
                    "company_research",
                    "Update company context",
                    application_id=candidature["id"],
                    context_hint="candidature:company_research",
                )
                handle = task_handle(task)
                packet = build_task_packet(conn, handle)

        self.assertEqual(packet["task_handle"], handle)
        self.assertEqual(packet["purpose"], "market_research")
        self.assertIn("input_context", packet)
        self.assertIn("cli_submit_result_file", packet["callback_instructions"])
        self.assertNotIn("/api/", json.dumps(packet))

    def test_submit_uses_opaque_handle(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                task = create_task(conn, "keyword_definition", "Define term", context_hint="keyword:Portfolio")
                handle = task_handle(task)
                completed = submit_agent_task_result(conn, handle, json.dumps({"definition": "A collection of work."}))

        self.assertEqual(completed["state"], "completed")
        self.assertNotEqual(handle, task["id"])


if __name__ == "__main__":
    unittest.main()
