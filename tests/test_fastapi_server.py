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


if __name__ == "__main__":
    unittest.main()
