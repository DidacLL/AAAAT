import contextlib
import importlib.util
import io
import json
import tempfile
import unittest

from aaaat.cli import main
from aaaat.db import connect, init_db
from aaaat.profile_facts import (
    archive_profile_fact,
    create_profile_fact,
    get_profile_fact,
    list_profile_facts,
    profile_context,
    update_profile_fact,
)
from aaaat.security import Mode


FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


class ProfileFactServiceTests(unittest.TestCase):
    def test_schema_init_creates_profile_facts_table(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                row = conn.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profile_facts'").fetchone()

        self.assertIsNotNone(row)

    def test_service_create_list_update_and_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
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
                self.assertEqual(archived["review_state"], "archived")

                self.assertEqual(list_profile_facts(conn), [])
                self.assertEqual(len(list_profile_facts(conn, include_archived=True)), 1)

    def test_profile_context_filters_by_purpose_and_exposure(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
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
                local = profile_context(conn, "candidature_fit", scope="local_dashboard")

        agent_text = json.dumps(agent)
        market_text = json.dumps(market)
        local_text = json.dumps(local)
        self.assertIn("Banking operations", agent_text)
        self.assertNotIn("Sensitive exact salary expectation", agent_text)
        self.assertNotIn("Sensitive exact salary expectation", market_text)
        self.assertNotIn("Private banking operations detail with named systems", market_text)
        self.assertIn("Private banking operations detail with named systems", local_text)


class ProfileFactCliTests(unittest.TestCase):
    def run_cli(self, args):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main(args), 0)
        return output.getvalue()

    def test_cli_add_list_and_context_smoke(self):
        with tempfile.TemporaryDirectory() as tmp:
            add = self.run_cli(
                [
                    "--storage",
                    tmp,
                    "profile",
                    "fact",
                    "add",
                    "--type",
                    "skill",
                    "--title",
                    "Python",
                    "--body",
                    "Backend APIs",
                    "--visibility",
                    "professional",
                    "--exposure",
                    "summarized",
                    "--use-for-cv",
                    "--use-for-agent-context",
                ]
            )
            fact_id = json.loads(add)["id"]
            listed = json.loads(self.run_cli(["--storage", tmp, "profile", "fact", "list"]))
            context = json.loads(self.run_cli(["--storage", tmp, "profile", "context", "--purpose", "cv_generation"]))

        self.assertEqual(listed[0]["id"], fact_id)
        self.assertEqual(context["facts"][0]["title"], "Python")


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
class ProfileFactFastApiTests(unittest.TestCase):
    def client(self, storage, mode=Mode.FULL):
        from fastapi.testclient import TestClient

        from aaaat.server_fastapi import create_app

        return TestClient(create_app(storage, mode))

    def test_fastapi_profile_fact_routes_and_read_only_dashboard(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.client(tmp)
            created = client.post(
                "/dashboard/actions/profile/facts",
                data={
                    "fact_type": "project",
                    "title": "AAAAT",
                    "body": "Agentic local job tracker",
                    "visibility": "professional",
                    "exposure": "summarized",
                    "use_for_cv": "1",
                    "use_for_agent_context": "1",
                },
                follow_redirects=False,
            )
            self.assertEqual(created.status_code, 303)
            self.assertEqual(client.get("/api/profile/facts").status_code, 404)
            with connect(tmp) as conn:
                fact_id = list_profile_facts(conn)[0]["id"]
                update_profile_fact(conn, fact_id, exposure="placeholder")
                self.assertEqual(profile_context(conn, "cv_generation")["facts"][0]["body"], "{{ profile_fact." + fact_id + " }}")

            read_only = self.client(tmp, Mode.READ_ONLY)
            self.assertEqual(read_only.post("/dashboard/actions/profile/facts", data={"fact_type": "skill"}).status_code, 403)
            self.assertEqual(read_only.post(f"/dashboard/actions/profile/facts/{fact_id}", data={"_method": "PATCH", "title": "Blocked"}).status_code, 403)
            self.assertEqual(read_only.post(f"/dashboard/actions/profile/facts/{fact_id}/archive", data={}).status_code, 403)

            html = read_only.get("/").text
            self.assertIn("data-profile-cv-panel", html)
            self.assertIn("AAAAT", html)
            self.assertNotIn("profile-fact-add", html)
            self.assertNotIn("profile-fact-edit", html)

            archived = client.post(f"/dashboard/actions/profile/facts/{fact_id}/archive", data={}, follow_redirects=False)
            self.assertEqual(archived.status_code, 303)
            with connect(tmp) as conn:
                self.assertEqual(get_profile_fact(conn, fact_id)["review_state"], "archived")


if __name__ == "__main__":
    unittest.main()
