import http.client
import inspect
import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer

from aaaat.db import connect, create_application, init_db
from aaaat.security import Mode
from aaaat.server import AAAATHandler, launch


class ServerApiTests(unittest.TestCase):
    def start_server(self, storage, mode):
        handler = type(
            "AuditAAAATHandler",
            (AAAATHandler,),
            {"storage_path": storage, "mode": mode},
        )
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server, thread

    def request(self, server, method, path, body=None):
        conn = http.client.HTTPConnection(server.server_address[0], server.server_address[1], timeout=5)
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        headers = {"Content-Type": "application/json"} if body is not None else {}
        conn.request(method, path, payload, headers)
        response = conn.getresponse()
        data = response.read().decode("utf-8")
        conn.close()
        return response.status, data

    def request_form(self, server, path, body):
        encoded = "&".join(f"{key}={value}" for key, value in body.items())
        conn = http.client.HTTPConnection(server.server_address[0], server.server_address[1], timeout=5)
        conn.request("POST", path, encoded, {"Content-Type": "application/x-www-form-urlencoded"})
        response = conn.getresponse()
        data = response.read().decode("utf-8")
        location = response.getheader("Location")
        conn.close()
        return response.status, data, location

    def test_launch_binds_to_loopback_by_default(self):
        self.assertEqual(inspect.signature(launch).parameters["host"].default, "127.0.0.1")

    def test_health_and_dashboard_payload_include_applications_and_glossary(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="API Demo Co", role="API Engineer", keywords=["ATS"])
            server, thread = self.start_server(tmp, Mode.FULL)
            try:
                status, body = self.request(server, "GET", "/api/health")
                self.assertEqual(status, 200)
                self.assertEqual(json.loads(body)["ok"], True)

                status, body = self.request(server, "GET", "/api/dashboard-payload")
                payload = json.loads(body)
                self.assertEqual(status, 200)
                self.assertTrue(payload["applications"])
                self.assertTrue(payload["glossary"])

                status, body = self.request(server, "GET", "/api/review-queue")
                queue = json.loads(body)["review_queue"]
                self.assertEqual(status, 200)
                self.assertTrue(queue)

                status, body = self.request(server, "GET", f"/api/review-queue?application_id={app['id']}")
                filtered = json.loads(body)["review_queue"]
                self.assertEqual(status, 200)
                self.assertTrue(filtered)
                self.assertTrue(all(item["application_id"] == app["id"] for item in filtered))
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)

    def test_read_only_mode_removes_write_and_raw_intake_controls(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Read Only Co", role="Reviewer")
            server, thread = self.start_server(tmp, Mode.READ_ONLY)
            try:
                status, html = self.request(server, "GET", "/")
                self.assertEqual(status, 200)
                self.assertNotIn("Raw intake", html)
                self.assertNotIn("data-write-control", html)

                status, _ = self.request(server, "POST", f"/api/applications/{app['id']}/raw-intake", {"content": "blocked"})
                self.assertEqual(status, 403)
                status, _ = self.request(server, "PATCH", f"/api/applications/{app['id']}", {"next_action": "blocked"})
                self.assertEqual(status, 403)
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)

    def test_full_mode_api_and_forms_create_update_manual_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            server, thread = self.start_server(tmp, Mode.FULL)
            try:
                status, body = self.request(server, "POST", "/api/applications", {"company": "Browser Co", "role": "Operator"})
                self.assertEqual(status, 201)
                app_id = json.loads(body)["id"]

                status, body = self.request(server, "POST", "/api/raw-offer-intake", {"content": "Raw offer text"})
                intake_app = json.loads(body)
                self.assertEqual(status, 201)
                self.assertEqual(intake_app["company"], "Pending extraction")
                self.assertEqual(intake_app["status"], "intake")

                status, body = self.request(server, "PATCH", f"/api/applications/{app_id}", {"next_action": "Call back", "keywords": "ATS, Python"})
                updated = json.loads(body)
                self.assertEqual(status, 200)
                self.assertEqual(updated["next_action"], "Call back")
                self.assertEqual(updated["keywords"], ["ATS", "Python"])

                status, _, location = self.request_form(server, "/api/glossary", {"term": "Python", "definition": "Language", "category": "skill"})
                self.assertEqual(status, 303)
                self.assertEqual(location, "/")

                status, _, location = self.request_form(server, "/api/profile/variables", {"_method": "PATCH", "key": "display_name", "value": "Manual User"})
                self.assertEqual(status, 303)
                self.assertEqual(location, "/")

                status, body = self.request(server, "POST", "/api/artifacts", {"application_id": app_id, "artifact_type": "cover_letter", "path": "cover.pdf", "label": "Cover", "review_state": "draft"})
                artifact_id = json.loads(body)["id"]
                status, body = self.request(server, "PATCH", f"/api/artifacts/{artifact_id}", {"review_state": "reviewed", "notes": "Ready"})
                self.assertEqual(status, 200)
                self.assertEqual(json.loads(body)["review_state"], "reviewed")
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
