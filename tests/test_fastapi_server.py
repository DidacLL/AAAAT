import importlib.util
import inspect
import json
import tempfile
import unittest

from aaaat.candidatures import get_candidature
from aaaat.db import connect, create_application, init_db, set_profile_variable
from aaaat.profile_facts import create_profile_fact
from aaaat.security import Mode
from aaaat.server import launch
from aaaat.tasks import create_task, list_tasks


FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
class FastApiServerTests(unittest.TestCase):
    def client(self, storage, mode=Mode.FULL, surface="dashboard"):
        from fastapi.testclient import TestClient

        from aaaat.server_fastapi import create_app

        return TestClient(create_app(storage, mode, surface=surface))

    def test_launch_binds_to_loopback_by_default_and_supports_agent_api(self):
        self.assertEqual(inspect.signature(launch).parameters["host"].default, "127.0.0.1")
        self.assertIn("agent_api", inspect.signature(launch).parameters)

    def test_dashboard_renders_but_broad_private_json_apis_are_absent(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_application(conn, company="Dashboard Co", role="Engineer")
            client = self.client(tmp)

            html = client.get("/").text
            self.assertIn('data-dashboard-view="welcomeView"', html)
            self.assertEqual(client.get("/static/htmx.min.js").status_code, 200)
            self.assertEqual(client.get("/openapi.json").status_code, 404)

            blocked = [
                "/api/dashboard-payload",
                "/api/review-queue",
                "/api/applications",
                "/api/candidatures",
                "/api/search?q=Dashboard",
                "/api/variables",
                "/api/profile/facts",
                "/api/profile/context?purpose=cv_generation",
                "/api/tasks",
                "/api/todos",
                "/api/notes",
                "/api/text-blobs",
                "/api/keywords",
                "/api/artifacts",
            ]
            for path in blocked:
                self.assertEqual(client.get(path).status_code, 404, path)
            self.assertEqual(client.post("/api/render/cv", json={}).status_code, 404)
            self.assertEqual(client.post("/api/applications", json={"company": "Nope"}).status_code, 404)

    def test_dashboard_actions_preserve_human_workflows(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Local Candidate")
                set_profile_variable(conn, "email", "candidate@example.test")
                set_profile_variable(conn, "summary.default", "Private local summary")
            client = self.client(tmp)

            created = client.post(
                "/dashboard/actions/raw-offer-intake",
                data={
                    "content": "Python role with screening call",
                    "company": "Action Co",
                    "role": "Platform Engineer",
                    "keywords": "Python, Platform",
                    "include_cv_task": "1",
                },
                follow_redirects=False,
            )
            self.assertEqual(created.status_code, 303)
            app_id = created.headers["location"].split("application_id=", 1)[1].split("&", 1)[0]

            updated = client.post(
                f"/dashboard/actions/candidatures/{app_id}",
                data={"_method": "PATCH", "description": "Detailed offer", "questions_to_ask": "Ask about roadmap"},
                follow_redirects=False,
            )
            self.assertEqual(updated.status_code, 303)
            note = client.post("/dashboard/actions/notes", data={"application_id": app_id, "note_type": "call", "body": "Call note"}, follow_redirects=False)
            todo = client.post("/dashboard/actions/todos", data={"application_id": app_id, "title": "Follow up"}, follow_redirects=False)
            task = client.post(
                "/dashboard/actions/tasks",
                data={"application_id": app_id, "task_type": "company_research", "title": "Research company"},
                follow_redirects=False,
            )
            render = client.post("/dashboard/actions/render/cv", data={"application_id": app_id}, follow_redirects=False)
            self.assertEqual(note.status_code, 303)
            self.assertEqual(todo.status_code, 303)
            self.assertEqual(task.status_code, 303)
            self.assertEqual(render.status_code, 303)

            with connect(tmp) as conn:
                loaded = get_candidature(conn, app_id)
            self.assertEqual(loaded["details"]["description"], "Detailed offer")
            self.assertTrue(any(item["body"] == "Call note" for item in loaded["notes_records"]))
            self.assertTrue(any(item["title"] == "Follow up" for item in loaded["todos"]))
            self.assertTrue(any(item["artifact_type"] == "cv" for item in loaded["artifacts"]))

    def test_agent_surface_is_task_only_and_minimized(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Agent Co", role="Engineer")
                task = create_task(conn, "company_research", "Research", application_id=app["id"], context_hint="candidature:company_research")
            client = self.client(tmp, surface="agent")

            self.assertEqual(client.get("/").status_code, 404)
            self.assertEqual(client.get("/static/htmx.min.js").status_code, 404)
            self.assertEqual(client.get("/api/health").json()["surface"], "agent")
            openapi_paths = set(client.get("/openapi.json").json()["paths"])
            self.assertIn("/api/agent/tasks", openapi_paths)
            self.assertTrue(all(path == "/api/health" or path.startswith("/api/agent/") for path in openapi_paths))
            self.assertEqual(client.get("/api/applications").status_code, 404)
            self.assertEqual(client.get("/api/candidatures").status_code, 404)
            self.assertEqual(client.get("/api/search?q=Agent").status_code, 404)
            self.assertEqual(client.get("/api/profile/context?purpose=cv_generation").status_code, 404)

            tasks = client.get("/api/agent/tasks").json()["tasks"]
            self.assertEqual(tasks[0]["id"], task["id"])
            self.assertNotIn("company", tasks[0])
            context = client.get(f"/api/agent/tasks/{task['id']}/context").json()
            serialized = json.dumps(context)
            self.assertIn("task", context)
            self.assertIn("context", context)
            self.assertNotIn("dashboard", serialized.lower())
            self.assertNotIn("/api/tasks/", serialized)

    def test_agent_surface_submit_claim_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Submit Co", role="Engineer", pitch="Human pitch")
                task = create_task(conn, "pitch_draft", "Draft pitch", application_id=app["id"], context_hint="field:pitch")
            client = self.client(tmp, surface="agent")

            claimed = client.post(f"/api/agent/tasks/{task['id']}/claim", json={"agent_name": "Agent"})
            self.assertEqual(claimed.status_code, 200)
            released = client.post(f"/api/agent/tasks/{task['id']}/release", json={})
            self.assertEqual(released.status_code, 200)
            submitted = client.post(
                f"/api/agent/tasks/{task['id']}/result",
                json={"result_body": "Suggested pitch", "agent_name": "Agent", "agent_runtime": "http", "model_provider": "local"},
            )
            self.assertEqual(submitted.status_code, 200)

            with connect(tmp) as conn:
                loaded = get_candidature(conn, app["id"])
                task_row = next(item for item in list_tasks(conn, application_id=app["id"]) if item["id"] == task["id"])
            self.assertEqual(loaded["pitch"], "Human pitch")
            self.assertEqual(task_row["state"], "completed")

    def test_read_only_dashboard_blocks_dashboard_actions(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Blocked Co", role="Reviewer")
            client = self.client(tmp, Mode.READ_ONLY)

            self.assertNotIn("data-write-control", client.get("/").text)
            self.assertEqual(client.post("/dashboard/actions/notes", data={"application_id": app["id"], "body": "Nope"}).status_code, 403)
            self.assertEqual(client.post("/dashboard/actions/render/cv", data={"application_id": app["id"]}).status_code, 403)

    def test_dashboard_profile_fact_actions_do_not_restore_broad_profile_api(self):
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
                },
                follow_redirects=False,
            )
            self.assertEqual(created.status_code, 303)
            self.assertEqual(client.get("/api/profile/facts").status_code, 404)
            self.assertEqual(client.get("/api/profile/context?purpose=cv_generation").status_code, 404)

            with connect(tmp) as conn:
                fact = create_profile_fact(conn, fact_type="skill", title="Python", body="Private Python", use_for_dashboard=True)
            read_only = self.client(tmp, Mode.READ_ONLY)
            html = read_only.get("/").text
            self.assertIn("data-profile-cv-panel", html)
            self.assertIn("Python", html)
            self.assertNotIn("profile-fact-add", html)
            self.assertNotIn("profile-fact-edit", html)


if __name__ == "__main__":
    unittest.main()
