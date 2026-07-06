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

    def test_launch_binds_to_loopback_by_default(self):
        self.assertEqual(inspect.signature(launch).parameters["host"].default, "127.0.0.1")

    def test_health_and_dashboard_payload_include_applications_and_glossary(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_application(conn, company="API Demo Co", role="API Engineer", keywords=["ATS"])
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
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
