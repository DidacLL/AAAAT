import json
import tempfile
import unittest

from aaaat.agent_access import (
    FORBIDDEN_AGENT_CONTEXT_KEYS,
    next_agent_work_item,
    submit_agent_task_result,
    task_capability,
)
from aaaat.candidatures import create_candidature
from aaaat.db import connect, init_db
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
    def test_next_returns_complete_bounded_work_item(self):
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
                work = next_agent_work_item(conn)

        self.assertIsNotNone(work)
        serialized = json.dumps(work)
        capability = work["task"]["task_capability"]
        self.assertTrue(capability.startswith("taskcap_"))
        self.assertNotEqual(capability, task["id"])
        self.assertIn("input_context", work)
        self.assertIn("response_format", work)
        self.assertEqual(work["task"]["allowed_actions"], ["report_progress", "submit_result"])
        self.assertNotIn(task["id"], serialized)
        self.assertNotIn(candidature["id"], serialized)
        self.assertTrue(FORBIDDEN_AGENT_CONTEXT_KEYS.isdisjoint(object_keys(work)))

    def test_capability_is_random_persisted_and_attempt_scoped(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                first = create_task(conn, "keyword_definition", "Define first", context_hint="keyword:First", idempotent=False)
                second = create_task(conn, "keyword_definition", "Define second", context_hint="keyword:Second", idempotent=False)
                first_capability = task_capability(conn, first)
                self.assertEqual(task_capability(conn, first), first_capability)
                second_capability = task_capability(conn, second)

        self.assertNotEqual(first_capability, second_capability)
        self.assertNotIn(first["id"], first_capability)
        self.assertGreaterEqual(len(first_capability), 40)

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
                candidature = create_candidature(
                    conn,
                    company="CV company",
                    role="Writer",
                    include_field_inference_task=False,
                    include_company_research_task=False,
                    include_keyword_detection_task=False,
                )
                create_task(
                    conn,
                    "draft_cv",
                    "Prepare tailored CV",
                    application_id=candidature["id"],
                    context_hint="artifact:cv",
                )
                work = next_agent_work_item(conn)

        serialized = json.dumps(work)
        self.assertIn("{{ profile_fact.skill.writing }}", serialized)
        self.assertNotIn("Private evidence", serialized)
        self.assertNotIn(fact["id"], serialized)

    def test_submit_uses_task_capability(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                task = create_task(conn, "keyword_definition", "Define term", context_hint="keyword:Portfolio")
                capability = task_capability(conn, task)
                completed = submit_agent_task_result(conn, capability, json.dumps({"definition": "A collection of work."}))

        self.assertEqual(completed["state"], "completed")
        self.assertNotEqual(capability, task["id"])


if __name__ == "__main__":
    unittest.main()
