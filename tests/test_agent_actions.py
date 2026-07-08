import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.agent_actions import get_agent_context_bundle, submit_agent_action
from aaaat.artifacts import list_artifacts
from aaaat.candidatures import list_candidatures
from aaaat.db import connect, init_db, set_profile_variable
from aaaat.profile_facts import create_profile_fact
from aaaat.tasks import list_tasks
from aaaat.text_blobs import list_text_blobs


FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


class AgentActionsTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "-B", "-m", "aaaat.cli", *args],
            text=True,
            capture_output=True,
            check=True,
        )

    def action(self, *, render=False):
        payload = {
            "action": "create_candidature",
            "payload": {
                "candidature": {
                    "company": "Acme",
                    "role": "Backend Engineer",
                    "source_url": "https://example.invalid/job",
                    "location": "Barcelona",
                    "remote_mode": "hybrid",
                    "offer_snapshot": "Backend platform role",
                    "keywords": ["Python", "APIs"],
                },
                "research": {
                    "company_research": "Acme builds developer tools.",
                    "pitch": "Positioning text",
                    "smart_question": "How does the team measure platform leverage?",
                },
                "form_answers": "Form answer draft",
                "cover_letter": {"body": "Cover-letter body from the LLM app."},
            },
        }
        if render:
            payload["payload"]["render"] = {"cover_letter": True}
        return payload

    def test_context_bundle_is_purpose_scoped(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_profile_fact(
                    conn,
                    fact_type="project",
                    title="AAAAT",
                    body="PRIVATE BODY",
                    exposure="placeholder",
                    use_for_cover_letter=True,
                )
                bundle = get_agent_context_bundle(conn, "cover_letter")

        self.assertEqual(set(bundle), {"status", "purpose", "context"})
        self.assertEqual(bundle["status"], "ok")
        self.assertEqual(bundle["purpose"], "cover_letter")
        self.assertIn("profile_context", bundle["context"])
        serialized = json.dumps(bundle)
        self.assertIn("{{ profile_fact.", serialized)
        self.assertNotIn("PRIVATE BODY", serialized)
        self.assertNotIn("candidatures", serialized)
        self.assertNotIn("applications", serialized)

    def test_context_bundle_rejects_unsupported_purpose(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                with self.assertRaises(ValueError):
                    get_agent_context_bundle(conn, "everything")

    def test_create_candidature_action_stores_data_without_ids_or_auto_tasks(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                response = submit_agent_action(conn, self.action(), agent_name="LLM App", storage_path=tmp)
                apps = list_candidatures(conn)
                app = apps[0]
                blobs = list_text_blobs(conn, app["id"])
                tasks = list_tasks(conn, application_id=app["id"])

        self.assertEqual(response, {"status": "accepted", "action": "create_candidature", "created": True, "rendered": False, "next": ["open_dashboard"]})
        self.assertEqual(app["company"], "Acme")
        self.assertEqual(app["role"], "Backend Engineer")
        self.assertEqual(app["location"], "Barcelona")
        self.assertEqual(app["company_research"], "Acme builds developer tools.")
        self.assertEqual(app["pitch"], "Positioning text")
        self.assertEqual(app["form_answers"], "Form answer draft")
        self.assertEqual(app["keywords"], ["APIs", "Python"])
        self.assertEqual(app["details"]["tech_stack"], "")
        self.assertEqual(tasks, [])
        self.assertTrue(any(blob["blob_type"] == "render_input" and blob["body"] == "Cover-letter body from the LLM app." for blob in blobs))
        self.assertNotIn("id", response)
        self.assertNotIn("application_id", response)
        self.assertNotIn("artifact_id", response)
        self.assertNotIn("path", response)

    def test_create_candidature_action_renders_cover_letter_locally(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Demo Candidate")
                response = submit_agent_action(conn, self.action(render=True), storage_path=tmp)
                app = list_candidatures(conn)[0]
                artifacts = list_artifacts(conn, app["id"])
                rendered = Path(artifacts[0]["path"]).read_text(encoding="utf-8")

        self.assertTrue(response["rendered"])
        self.assertEqual(len(artifacts), 1)
        self.assertEqual(artifacts[0]["artifact_type"], "cover_letter")
        self.assertEqual(artifacts[0]["source_context"], "template:cover-letter")
        self.assertIn("Cover-letter body from the LLM app.", rendered)
        self.assertNotIn("path", response)
        self.assertNotIn("artifact_id", response)

    def test_action_validation_is_allowlist_based(self):
        invalid = [
            {},
            {"action": "delete_everything", "payload": {}},
            {"action": "create_candidature"},
            {"action": "create_candidature", "payload": {"candidature": {"company": "Acme"}}},
            {"action": "create_candidature", "payload": {"unknown": {}}},
            {"action": "create_candidature", "payload": {"candidature": {"company": "Acme", "role": "Engineer", "notes": "not agent"}}},
            {"action": "create_candidature", "payload": {"candidature": {"company": "Acme", "role": "Engineer"}, "render": {"cover_letter": "yes"}}},
            {"action": "create_candidature", "payload": {"candidature": {"company": "Acme", "role": "Engineer"}, "cover_letter": {"body": 3}}},
            {"action": "create_candidature", "payload": {"candidature": {"company": "Acme", "role": "Engineer"}, "extra": {}}, "id": "app_1"},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                for item in invalid:
                    with self.subTest(item=item):
                        with self.assertRaises(ValueError):
                            submit_agent_action(conn, item, storage_path=tmp)

    def test_agent_action_cli_commands_work(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            context = json.loads(self.run_cli("--storage", tmp, "agent", "context-bundle", "--purpose", "cover_letter").stdout)
            self.assertEqual(context["status"], "ok")
            self.assertEqual(context["purpose"], "cover_letter")

            body_response = json.loads(
                self.run_cli("--storage", tmp, "agent", "action", "submit", "--input-body", json.dumps(self.action())).stdout
            )
            self.assertEqual(body_response["action"], "create_candidature")
            self.assertNotIn("application_id", body_response)

            path = Path(tmp) / "action.json"
            path.write_text(json.dumps(self.action()), encoding="utf-8")
            file_response = json.loads(self.run_cli("--storage", tmp, "agent", "action", "submit", "--input-file", str(path)).stdout)
            self.assertEqual(file_response["status"], "accepted")
            self.assertNotIn("application_id", file_response)

    @unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
    def test_agent_action_http_routes_are_agent_surface_only(self):
        from fastapi.testclient import TestClient

        from aaaat.server_fastapi import create_app

        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            dashboard = TestClient(create_app(tmp, surface="dashboard"))
            agent = TestClient(create_app(tmp, surface="agent"))

            self.assertEqual(dashboard.post("/api/agent/context-bundle", json={"purpose": "cover_letter"}).status_code, 404)
            self.assertEqual(dashboard.post("/api/agent/actions", json=self.action()).status_code, 404)
            self.assertEqual(agent.post("/api/agent/intake/raw-offer", json={"content": "raw"}).status_code, 404)

            context = agent.post("/api/agent/context-bundle", json={"purpose": "cover_letter"})
            self.assertEqual(context.status_code, 200)
            self.assertEqual(context.json()["status"], "ok")

            submitted = agent.post("/api/agent/actions", json=self.action())
            self.assertEqual(submitted.status_code, 200)
            response = submitted.json()
            self.assertEqual(response["status"], "accepted")
            self.assertNotIn("application_id", response)
            self.assertNotIn("artifact_id", response)
            self.assertNotIn("path", response)


if __name__ == "__main__":
    unittest.main()
