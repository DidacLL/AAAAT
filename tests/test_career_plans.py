import contextlib
import io
import json
import tempfile
import unittest

from aaaat.agent_actions import get_agent_context_bundle
from aaaat.career_plans import (
    archive_career_plan,
    career_plan_context,
    create_career_plan,
    get_career_plan,
    list_career_plans,
    update_career_plan,
)
from aaaat.cli import main
from aaaat.db import connect, init_db
from aaaat.profile_facts import create_profile_fact


class CareerPlanServiceTests(unittest.TestCase):
    def test_schema_init_creates_career_plans_table(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                row = conn.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'career_plans'").fetchone()

        self.assertIsNotNone(row)

    def test_service_create_update_archive_and_context(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                plan = create_career_plan(
                    conn,
                    body="Focus on local-first developer tooling roles.",
                    objectives="senior backend, platform ownership",
                    constraints=["remote-friendly", "no relocation"],
                    target_markets="EU, UK",
                    target_roles="Backend Engineer, Platform Engineer",
                    source="user",
                )
                updated = update_career_plan(conn, plan["id"], objectives=["platform ownership"], target_roles="Platform Engineer")
                agent_context = career_plan_context(conn, "cover_letter", scope="agent")
                local_context = career_plan_context(conn, "cover_letter", scope="local")
                archived = archive_career_plan(conn, plan["id"])
                active = list_career_plans(conn)
                all_plans = list_career_plans(conn, include_archived=True)

        self.assertEqual(updated["objectives"], ["platform ownership"])
        self.assertEqual(updated["target_roles"], ["Platform Engineer"])
        self.assertEqual(agent_context["purpose"], "cover_letter")
        self.assertEqual(agent_context["scope"], "agent")
        self.assertEqual(agent_context["career_plans"][0]["body"], "Focus on local-first developer tooling roles.")
        self.assertNotIn("id", agent_context["career_plans"][0])
        self.assertIn("plan_ref", agent_context["career_plans"][0])
        self.assertEqual(local_context["career_plans"][0]["id"], plan["id"])
        self.assertEqual(archived["review_state"], "archived")
        self.assertEqual(active, [])
        self.assertEqual(len(all_plans), 1)

    def test_agent_context_bundles_include_career_plan_without_ids(self):
        purposes = {
            "cover_letter",
            "cv_generation",
            "candidature_fit",
            "market_research",
            "recruiter_call",
            "form_answers",
            "career_plan_review",
        }
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                plan = create_career_plan(
                    conn,
                    body="Prioritize backend automation roles in Barcelona or remote EU.",
                    objectives=["increase seniority"],
                    constraints=["avoid relocation"],
                    target_markets=["EU"],
                    target_roles=["Backend Engineer"],
                )
                fact = create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Python",
                    body="PRIVATE PYTHON DETAIL",
                    exposure="placeholder",
                    use_for_agent_context=True,
                    use_for_cover_letter=True,
                    use_for_cv=True,
                    use_for_market_research=True,
                )
                bundles = {purpose: get_agent_context_bundle(conn, purpose) for purpose in purposes}

        for purpose, bundle in bundles.items():
            serialized = json.dumps(bundle)
            self.assertEqual(bundle["purpose"], purpose)
            self.assertEqual(bundle["scope"], "agent")
            self.assertIn("career_plans", bundle)
            self.assertEqual(bundle["career_plans"][0]["target_roles"], ["Backend Engineer"])
            self.assertNotIn(plan["id"], serialized)
            self.assertNotIn("career_plan_id", serialized)
            self.assertNotIn(fact["id"], serialized)
            self.assertNotIn("PRIVATE PYTHON DETAIL", serialized)
        self.assertIn("{{ profile_fact.skill.python }}", json.dumps(bundles["career_plan_review"]))


class CareerPlanCliTests(unittest.TestCase):
    def run_cli(self, args):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main(args), 0)
        return output.getvalue()

    def test_cli_add_list_context_and_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            added = json.loads(
                self.run_cli(
                    [
                        "--storage",
                        tmp,
                        "career-plan",
                        "add",
                        "--body",
                        "Target product engineering roles.",
                        "--objectives",
                        "ownership, growth",
                        "--constraints",
                        "remote-friendly",
                        "--target-markets",
                        "EU",
                        "--target-roles",
                        "Backend Engineer",
                    ]
                )
            )
            listed = json.loads(self.run_cli(["--storage", tmp, "career-plan", "list"]))
            context = json.loads(
                self.run_cli(
                    [
                        "--storage",
                        tmp,
                        "career-plan",
                        "context",
                        "--purpose",
                        "career_plan_review",
                        "--scope",
                        "agent",
                    ]
                )
            )
            archived = json.loads(self.run_cli(["--storage", tmp, "career-plan", "archive", added["id"]]))

        self.assertEqual(listed[0]["id"], added["id"])
        self.assertEqual(listed[0]["target_roles"], ["Backend Engineer"])
        self.assertEqual(context["career_plans"][0]["body"], "Target product engineering roles.")
        self.assertNotIn("id", context["career_plans"][0])
        self.assertEqual(archived["review_state"], "archived")


if __name__ == "__main__":
    unittest.main()
