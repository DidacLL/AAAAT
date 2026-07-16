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
from aaaat.db import connect, init_db, profile_variables, set_profile_variable, upsert_glossary_term
from aaaat.profile_facts import create_profile_fact
from aaaat.tasks import create_task, list_tasks


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

    def test_profile_result_cannot_replace_an_existing_desktop_value(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "profile.display_name", "User-owned name")
                task = create_task(conn, "profile_completion", "Complete profile", context_hint="profile:completion")
                capability = task_capability(conn, task)
                work = next_agent_work_item(conn)
                self.assertNotIn("replace_existing", json.dumps(work["response_format"]))
                completed = submit_agent_task_result(
                    conn,
                    capability,
                    json.dumps(
                        {
                            "variables": {
                                "profile.display_name": "Agent replacement",
                                "profile.location": "Barcelona",
                            },
                            "replace_existing": True,
                        }
                    ),
                )
                values = profile_variables(conn)

        self.assertEqual(completed["profile_update"]["retained"], ["profile.display_name"])
        self.assertEqual(values["profile.display_name"], "User-owned name")
        self.assertEqual(values["profile.location"], "Barcelona")

    def test_keyword_result_cannot_replace_an_existing_canonical_definition(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                upsert_glossary_term(conn, "MCP", "Existing canonical definition.", "technology")
                task = create_task(conn, "keyword_definition", "Define MCP", context_hint="keyword:MCP")
                capability = task_capability(conn, task)
                submit_agent_task_result(
                    conn,
                    capability,
                    json.dumps({"definition": "Agent replacement.", "replace_existing": True}),
                )
                row = conn.execute("SELECT definition, category FROM glossary_terms WHERE term = ?", ("MCP",)).fetchone()

        self.assertEqual(row["definition"], "Existing canonical definition.")
        self.assertEqual(row["category"], "technology")

    def test_inferred_keywords_queue_only_missing_canonical_definitions(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                upsert_glossary_term(conn, "Python", "Existing Python definition.", "technology")
                candidature = create_candidature(
                    conn,
                    company="Keyword company",
                    role="Engineer",
                    include_field_inference_task=False,
                    include_company_research_task=False,
                    include_keyword_detection_task=False,
                )
                task = create_task(
                    conn,
                    "field_inference",
                    "Infer candidature fields",
                    application_id=candidature["id"],
                    context_hint="candidature:field_inference",
                )
                capability = task_capability(conn, task)
                submit_agent_task_result(
                    conn,
                    capability,
                    json.dumps({"fields": {"keywords": ["Python", "MCP"]}}),
                )
                tasks = list_tasks(conn, application_id=candidature["id"])
                python_row = conn.execute(
                    "SELECT definition FROM glossary_terms WHERE term = ?",
                    ("Python",),
                ).fetchone()
                mcp_row = conn.execute(
                    "SELECT definition FROM glossary_terms WHERE term = ?",
                    ("MCP",),
                ).fetchone()

        definition_tasks = [item for item in tasks if item["task_type"] == "keyword_definition"]
        self.assertEqual([item["context_hint"] for item in definition_tasks], ["keyword:MCP"])
        self.assertEqual(python_row["definition"], "Existing Python definition.")
        self.assertEqual(mcp_row["definition"], "")


if __name__ == "__main__":
    unittest.main()
