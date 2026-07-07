import importlib.util
import inspect
import json
import tempfile
import unittest

from aaaat.db import connect, create_application, init_db
from aaaat.security import Mode
from aaaat.server import launch


FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
class FastApiServerTests(unittest.TestCase):
    def client(self, storage, mode=Mode.FULL):
        from fastapi.testclient import TestClient

        from aaaat.server_fastapi import create_app

        return TestClient(create_app(storage, mode))

    def test_launch_binds_to_loopback_by_default(self):
        self.assertEqual(inspect.signature(launch).parameters["host"].default, "127.0.0.1")

    def test_health_dashboard_payload_and_review_queue_match_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="FastAPI Co", role="Engineer", keywords=["ATS"])
            client = self.client(tmp)

            response = client.get("/api/health")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["mode"], "full")

            payload = client.get("/api/dashboard-payload").json()
            self.assertTrue(payload["applications"])
            self.assertTrue(payload["glossary"])

            queue = client.get(f"/api/review-queue?application_id={app['id']}").json()["review_queue"]
            self.assertTrue(queue)
            self.assertTrue(all(item["application_id"] == app["id"] for item in queue))

    def test_json_and_form_writes_preserve_compatibility(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.client(tmp)

            created = client.post("/api/applications", json={"company": "Browser Co", "role": "Operator"})
            self.assertEqual(created.status_code, 201)
            app_id = created.json()["id"]

            updated = client.patch(f"/api/applications/{app_id}", json={"next_action": "Call back", "keywords": "ATS, Python"})
            self.assertEqual(updated.status_code, 200)
            self.assertEqual(updated.json()["keywords"], ["ATS", "Python"])

            form = client.post("/api/glossary", data={"term": "Python", "definition": "Language", "category": "skill"}, follow_redirects=False)
            self.assertEqual(form.status_code, 303)
            self.assertEqual(form.headers["location"], "/")

            profile = client.post(
                "/api/profile/variables",
                data={"_method": "PATCH", "key": "display_name", "value": "Manual User"},
                follow_redirects=False,
            )
            self.assertEqual(profile.status_code, 303)
            self.assertEqual(profile.headers["location"], "/")

            artifact = client.post(
                "/api/artifacts",
                json={"application_id": app_id, "artifact_type": "cover_letter", "path": "cover.pdf", "label": "Cover", "review_state": "draft"},
            )
            self.assertEqual(artifact.status_code, 201)
            reviewed = client.patch(f"/api/artifacts/{artifact.json()['id']}", json={"review_state": "reviewed", "notes": "Ready"})
            self.assertEqual(reviewed.status_code, 200)
            self.assertEqual(reviewed.json()["review_state"], "reviewed")

    def test_read_only_mode_hides_and_rejects_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Read Only Co", role="Reviewer")
            client = self.client(tmp, Mode.READ_ONLY)

            html = client.get("/").text
            self.assertNotIn("data-write-control", html)
            self.assertNotIn("Raw intake", html)

            blocked = client.post(f"/api/applications/{app['id']}/raw-intake", json={"content": "blocked"})
            self.assertEqual(blocked.status_code, 403)
            blocked = client.patch(f"/api/applications/{app['id']}", json={"next_action": "blocked"})
            self.assertEqual(blocked.status_code, 403)

    def test_agent_context_uses_privacy_filtered_variables(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Context Co", role="Engineer")
                conn.execute(
                    "INSERT INTO profile_variables(key, value, updated_at) VALUES ('display_name', 'Private User', '2026-01-01T00:00:00+00:00')"
                )
                conn.commit()
                init_db(tmp)
            client = self.client(tmp)

            context = client.get(f"/api/applications/{app['id']}/context").json()
            self.assertEqual(context["variables"]["profile.display_name"], "{{ profile.display_name }}")
            self.assertNotIn("Private User", json.dumps(context))

    def test_static_htmx_asset_is_served(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.client(tmp)

            response = client.get("/static/htmx.min.js")
            self.assertEqual(response.status_code, 200)
            self.assertIn('version:"2.0.4"', response.text)
            self.assertIn("htmx", response.text[:200])

    def test_jinja_dashboard_is_default_and_legacy_renderer_is_available(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_application(conn, company="Renderer Co", role="Dashboard Engineer")
            client = self.client(tmp)

            active = client.get("/")
            self.assertEqual(active.status_code, 200)
            self.assertIn('data-dashboard-view="welcomeView"', active.text)
            self.assertIn("data-dashboard-view-link", active.text)

            fragment = client.get("/dashboard/fragments/selected-card?view=smartView")
            self.assertEqual(fragment.status_code, 200)
            self.assertIn("data-selected-app", fragment.text)

            legacy = client.get("/legacy")
            self.assertEqual(legacy.status_code, 200)
            self.assertIn("Applications", legacy.text)
            self.assertNotIn("data-dashboard-view-link", legacy.text)

            query_legacy = client.get("/?renderer=legacy")
            self.assertEqual(query_legacy.status_code, 200)
            self.assertIn("Applications", query_legacy.text)

    def test_product_routes_search_and_agent_context(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.client(tmp)

            created = client.post(
                "/api/candidatures",
                json={
                    "company": "Route Co",
                    "role": "Python Engineer",
                    "keywords": "Python, ATS",
                    "raw_offer": "Python backend role",
                    "include_cover_letter_task": True,
                },
            )
            self.assertEqual(created.status_code, 201)
            app_id = created.json()["id"]

            self.assertTrue(client.get("/api/candidatures").json()["candidatures"])
            self.assertEqual(client.get(f"/api/candidatures/{app_id}").json()["domain_type"], "Candidature")
            patched = client.patch(f"/api/candidatures/{app_id}", json={"pitch": "Approved pitch"})
            self.assertEqual(patched.status_code, 200)

            todo = client.post("/api/todos", json={"application_id": app_id, "title": "Call recruiter", "pinned": True})
            self.assertEqual(todo.status_code, 201)
            self.assertTrue(client.get(f"/api/todos?application_id={app_id}").json()["todos"])

            note = client.post("/api/notes", json={"application_id": app_id, "body": "Screening note"})
            self.assertEqual(note.status_code, 201)
            blob = client.post("/api/text-blobs", json={"application_id": app_id, "blob_type": "questions", "body": "Question draft"})
            self.assertEqual(blob.status_code, 201)
            updated_blob = client.patch(f"/api/text-blobs/{blob.json()['id']}", json={"review_state": "reviewed"})
            self.assertEqual(updated_blob.status_code, 200)

            keyword = client.post("/api/keywords", json={"term": "Python", "definition": "Language", "category": "skill"})
            self.assertEqual(keyword.status_code, 201)
            alias = client.post("/api/keywords/Python/aliases", json={"alias": "Py"})
            self.assertEqual(alias.status_code, 201)
            keyword_note = client.post("/api/keywords/Python/notes", json={"body": "Important keyword"})
            self.assertEqual(keyword_note.status_code, 201)
            self.assertTrue(client.get("/api/keywords").json()["keywords"])

            search = client.get("/api/search?q=Python")
            self.assertEqual(search.status_code, 200)
            self.assertTrue(search.json()["available"])
            self.assertTrue(search.json()["results"])

            variable = client.put("/api/variables/display_name", json={"value": "Private User", "exposure": "placeholder"})
            self.assertEqual(variable.status_code, 200)
            self.assertEqual(client.get("/api/variables/profile.display_name").json()["resolved_value"], "{{ profile.display_name }}")

            task = client.post(
                "/api/tasks",
                json={"application_id": app_id, "task_type": "pitch_draft", "title": "Draft pitch", "context_hint": "field:pitch"},
            )
            self.assertEqual(task.status_code, 201)
            task_id = task.json()["id"]
            context = client.get(f"/api/agent/tasks/{task_id}/context").json()
            self.assertIn("complete", context["write_back"])
            self.assertNotIn("Private User", json.dumps(context))

            completed = client.post(f"/api/tasks/{task_id}/complete", json={"result_body": "Suggested pitch", "agent_name": "Agent"})
            self.assertEqual(completed.status_code, 200)
            applied = client.post(f"/api/tasks/{task_id}/apply", json={})
            self.assertEqual(applied.status_code, 200)
            loaded = client.get(f"/api/candidatures/{app_id}").json()
            self.assertEqual(loaded["pitch"], "Approved pitch")
            self.assertTrue(any(item["body"] == "Suggested pitch" for item in loaded["text_blobs"]))

    def test_raw_offer_intake_creates_candidature_and_idempotent_initial_tasks(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.client(tmp)

            created = client.post(
                "/api/raw-offer-intake",
                json={
                    "content": "Python role with ATS keywords",
                    "keywords": "Python, NewKeyword",
                    "include_cv_task": True,
                    "include_form_responses_task": True,
                },
            )
            self.assertEqual(created.status_code, 201)
            app_id = created.json()["id"]
            task_types = {task["task_type"] for task in client.get(f"/api/tasks?application_id={app_id}").json()["tasks"]}
            self.assertIn("field_inference", task_types)
            self.assertIn("company_research", task_types)
            self.assertIn("keyword_definition", task_types)
            self.assertIn("draft_cv", task_types)
            self.assertIn("draft_form_responses", task_types)
            self.assertNotIn("draft_cover_letter", task_types)

    def test_read_only_blocks_new_write_route_families(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Blocked Co", role="Reviewer")
            client = self.client(tmp, Mode.READ_ONLY)

            self.assertEqual(client.post("/api/candidatures", json={"company": "Nope"}).status_code, 403)
            self.assertEqual(client.post("/api/tasks", json={"application_id": app["id"], "title": "Nope"}).status_code, 403)
            self.assertEqual(client.post("/api/todos", json={"title": "Nope"}).status_code, 403)
            self.assertEqual(client.post("/api/notes", json={"body": "Nope"}).status_code, 403)
            self.assertEqual(client.post("/api/text-blobs", json={"body": "Nope"}).status_code, 403)
            self.assertEqual(client.post("/api/keywords", json={"term": "Nope"}).status_code, 403)
            self.assertEqual(client.put("/api/variables/display_name", json={"value": "Nope"}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
