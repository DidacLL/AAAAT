from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .dashboard import render_dashboard
from .db import add_raw_intake, connect, create_application, init_db, list_applications
from .payload import application_context, dashboard_payload
from .security import Mode
from .static_export import export_static_demo


class AAAATHandler(BaseHTTPRequestHandler):
    storage_path = ".private"
    mode = Mode.FULL

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        with connect(self.storage_path) as conn:
            if parsed.path == "/":
                payload = dashboard_payload(conn, include_raw=self.mode == Mode.FULL)
                self.send_html(render_dashboard(payload, self.mode))
            elif parsed.path == "/api/health":
                self.send_json({"ok": True, "mode": self.mode.value})
            elif parsed.path == "/api/dashboard-payload":
                self.send_json(dashboard_payload(conn, include_raw=self.mode == Mode.FULL))
            elif parsed.path == "/api/applications":
                self.send_json({"applications": list_applications(conn)})
            elif parsed.path.startswith("/api/applications/") and parsed.path.endswith("/context"):
                app_id = parsed.path.split("/")[3]
                self.send_json(application_context(conn, app_id))
            else:
                self.send_error(404)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if self.mode != Mode.FULL:
            self.send_error(403, "read only")
            return
        data = self.read_json()
        with connect(self.storage_path) as conn:
            if parsed.path == "/api/applications":
                self.send_json(create_application(conn, **data), status=201)
            elif parsed.path.endswith("/raw-intake") and parsed.path.startswith("/api/applications/"):
                app_id = parsed.path.split("/")[3]
                self.send_json(add_raw_intake(conn, app_id, data.get("content", ""), data.get("created_by", "agent")), status=201)
            elif parsed.path == "/api/export/static-demo":
                output = data.get("output_path", "outputs/static-demo.html")
                self.send_json({"path": str(export_static_demo(output))})
            else:
                self.send_error(404)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html: str) -> None:
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def launch(storage: str = ".private", read_only: bool = False, host: str = "127.0.0.1", port: int = 8765) -> None:
    init_db(storage)
    handler = type("ConfiguredAAAATHandler", (AAAATHandler,), {"storage_path": storage, "mode": Mode.READ_ONLY if read_only else Mode.FULL})
    server = ThreadingHTTPServer((host, port), handler)
    print(f"AAAAT listening on http://{host}:{port}")
    server.serve_forever()
