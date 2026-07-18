import json
import tempfile
import unittest

from aaaat.db import connect, ensure_workspace_database
from aaaat.profile_facts import (
    archive_profile_fact,
    create_profile_fact,
    list_profile_facts,
    profile_context,
    update_profile_fact,
)


class ProfileFactServiceTests(unittest.TestCase):
    def test_schema_init_creates_profile_facts_table(self):
        with tempfile.TemporaryDirectory() as tmp:
            ensure_workspace_database(tmp)
            with connect(tmp) as conn:
                row = conn.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profile_facts'").fetchone()

        self.assertIsNotNone(row)

    def test_service_create_list_update_and_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            ensure_workspace_database(tmp)
            with connect(tmp) as conn:
                fact = create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Python",
                    body="Backend automation and API work.",
                    tags="python, backend",
                    visibility="professional",
                    exposure="summarized",
                    use_for_cv=True,
                    use_for_agent_context=True,
                )
                self.assertEqual(list_profile_facts(conn, fact_type="skill")[0]["title"], "Python")
                updated = update_profile_fact(conn, fact["id"], exposure="placeholder", use_for_cv=False)
                self.assertEqual(updated["exposure"], "placeholder")
                self.assertFalse(updated["use_for_cv"])
                archived = archive_profile_fact(conn, fact["id"])
                self.assertEqual(archived["state"], "archived")

                self.assertEqual(list_profile_facts(conn), [])
                self.assertEqual(len(list_profile_facts(conn, include_archived=True)), 1)

    def test_profile_context_filters_by_purpose_and_exposure(self):
        with tempfile.TemporaryDirectory() as tmp:
            ensure_workspace_database(tmp)
            with connect(tmp) as conn:
                create_profile_fact(
                    conn,
                    fact_type="experience",
                    title="Banking operations",
                    body="Private banking operations detail with named systems.",
                    visibility="private",
                    exposure="summarized",
                    use_for_agent_context=True,
                    use_for_market_research=True,
                )
                create_profile_fact(
                    conn,
                    fact_type="salary_expectation",
                    title="Salary",
                    body="Sensitive exact salary expectation",
                    visibility="sensitive",
                    exposure="denied",
                    use_for_agent_context=True,
                    use_for_market_research=True,
                )

                agent = profile_context(conn, "candidature_fit", scope="agent")
                market = profile_context(conn, "market_research", scope="agent")
                local = profile_context(conn, "candidature_fit", scope="local")

        agent_text = json.dumps(agent)
        market_text = json.dumps(market)
        local_text = json.dumps(local)
        self.assertIn("Banking operations", agent_text)
        self.assertNotIn("Sensitive exact salary expectation", agent_text)
        self.assertNotIn("Sensitive exact salary expectation", market_text)
        self.assertNotIn("Private banking operations detail with named systems", market_text)
        self.assertIn("Private banking operations detail with named systems", local_text)
        for fact in agent["facts"]:
            self.assertNotIn("id", fact)
            self.assertIn("fact_ref", fact)



if __name__ == "__main__":
    unittest.main()
