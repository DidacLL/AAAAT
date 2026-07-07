from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .artifacts import save_artifact, update_artifact_state
from .dashboard import render_dashboard, render_raw_offer_intake_page
from .db import (
    add_raw_intake,
    connect,
    create_application,
    create_raw_offer_intake,
    init_db,
    list_applications,
    set_profile_variable,
    update_application,
    upsert_glossary_term,
)
from .payload import application_context, dashboard_payload
from .review_queue import review_queue
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
                query = parse_qs(parsed.query)
                selected_id = query.get("application_id", [None])[0]
                selected_keyword = query.get("keyword", [None])[0]
                active_tab = query.get("tab", ["company"])[0]
                self.send_html(render_dashboard(payload, self.mode, selected_id, selected_keyword, active_tab))
            elif parsed.path == "/intake":
                self.send_html(render_raw_offer_intake_page(self.mode))
            elif parsed.path == "/api/health":
                self.send_json({"ok": True, "mode": self.mode.value})
            elif parsed.path == "/api/dashboard-payload":
                self.send_json(dashboard_payload(conn, include_raw=self.mode == Mode.FULL))
            elif parsed.path == "/api/review-queue":
                query = parse_qs(parsed.query)
                application_id = query.get("application_id", [None])[0]
                payload = dashboard_payload(conn, include_raw=False)
                self.send_json({"review_queue": review_queue(payload, application_id)})
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
            self.send_json({"error": "read only"}, status=403)
            return
        data, is_form = self.read_body()
        if data.get("_method", "").upper() == "PATCH":
            self.handle_patch(parsed.path, data, is_form)
            return
        with connect(self.storage_path) as conn:
            if parsed.path == "/api/applications":
                app = create_application(conn, **data)
                self.respond(app, 201, is_form, f"/?application_id={app['id']}")
            elif parsed.path.endswith("/raw-intake") and parsed.path.startswith("/api/applications/"):
                app_id = parsed.path.split("/")[3]
                item = add_raw_intake(conn, app_id, data.get("content", ""), data.get("created_by", "agent"))
                self.respond(item, 201, is_form, f"/?application_id={app_id}")
            elif parsed.path == "/api/glossary":
                term = upsert_glossary_term(conn, data.get("term", ""), data.get("definition", ""), data.get("category", ""))
                self.respond(term, 201, is_form, "/")
            elif parsed.path == "/api/raw-offer-intake":
                app = create_raw_offer_intake(conn, data.get("content", ""), data.get("created_by", "user") or "user")
                self.respond(app, 201, is_form, f"/?application_id={app['id']}&tab=raw")
            elif parsed.path == "/api/artifacts":
                artifact = save_artifact(
                    conn,
                    data.get("application_id") or None,
                    data.get("artifact_type", ""),
                    data.get("path", ""),
                    data.get("label", ""),
                    source_context=data.get("source_context", "manual"),
                    agent_name=data.get("agent_name", ""),
                    agent_runtime=data.get("agent_runtime", ""),
                    model_provider=data.get("model_provider", ""),
                    review_state=data.get("review_state", "draft"),
                    notes=data.get("notes", ""),
                )
                self.respond(artifact, 201, is_form, f"/?application_id={artifact.get('application_id') or ''}")
            elif parsed.path == "/api/export/static-demo":
                output = data.get("output_path", "outputs/static-demo.html")
                self.respond({"path": str(export_static_demo(output))}, 200, is_form, "/")
            else:
                self.send_error(404)

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)
        if self.mode != Mode.FULL:
            self.send_json({"error": "read only"}, status=403)
            return
        data, is_form = self.read_body()
        self.handle_patch(parsed.path, data, is_form)

    def handle_patch(self, path: str, data: dict, is_form: bool) -> None:
        with connect(self.storage_path) as conn:
            if path.startswith("/api/applications/"):
                app_id = path.split("/")[3]
                app = update_application(conn, app_id, **data)
                self.respond(app, 200, is_form, f"/?application_id={app_id}")
            elif path == "/api/profile/variables":
                set_profile_variable(conn, data.get("key", ""), data.get("value", ""))
                self.respond({"ok": True, "key": data.get("key", "")}, 200, is_form, "/")
            elif path.startswith("/api/artifacts/"):
                artifact_id = path.split("/")[3]
                artifact = update_artifact_state(
                    conn,
                    artifact_id,
                    data.get("review_state", "draft"),
                    data.get("notes") if "notes" in data else None,
                )
                self.respond(artifact, 200, is_form, f"/?application_id={artifact.get('application_id') or ''}")
            else:
                self.send_error(404)

    def read_body(self) -> tuple[dict, bool]:
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}, False
        raw = self.rfile.read(length).decode("utf-8")
        content_type = self.headers.get("Content-Type", "")
        if "application/x-www-form-urlencoded" in content_type:
            parsed = parse_qs(raw, keep_blank_values=True)
            return {key: values[-1] for key, values in parsed.items()}, True
        return json.loads(raw), False

    def respond(self, payload: dict, status: int, is_form: bool, redirect_to: str) -> None:
        if is_form:
            self.send_response(303)
            self.send_header("Location", redirect_to)
            self.end_headers()
        else:
            self.send_json(payload, status=status)

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
    from .server_fastapi import launch as launch_fastapi

    launch_fastapi(storage, read_only, host=host, port=port)
