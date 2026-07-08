import importlib.util
import inspect
import json
import tempfile
import unittest
from typing import Any

from aaaat.agent_access import FORBIDDEN_AGENT_CONTEXT_KEYS
from aaaat.candidatures import list_candidatures
from aaaat.db import connect, create_application, init_db
from aaaat.profile_facts import create_profile_fact
from aaaat.security import Mode
from aaaat.server import launch
from aaaat.tasks import create_task, list_tasks


FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


AGENT_RUNTIME_ROUTES = {
    ("GET", "/api/health"),
    ("GET", "/api/agent/tasks/next"),
    ("GET", "/api/agent/tasks/{task_handle}/context"),
    ("POST", "/api/agent/tasks/{task_handle}/result"),
    ("POST", "/api/agent/context-bundle"),
    ("POST", "/api/agent/actions"),
}


def object_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        keys.update(value)
        for item in value.values():
            keys.update(object_keys(item))
    elif isinstance(value, list):
        for item in value:
            keys.update(object_keys(item))
    return keys


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
class FastApiServerTests(unittest.TestCase):
    def dashboard_client(self, storage, mode=Mode.FULL):
        from fastapi.testclient import TestClient

        from aaaat.server_fastapi import create_dashboard_app

        return TestClient(create_dashboard_app(storage, mode))

    def agent_client(self, storage, mode=Mode.FULL):
        from fastapi.testclient import TestClient

        from aaaat.server_fastapi import create_agent_app

        return TestClient(create_agent_app(storage, mode))

    def route_paths(self, client):
        return {getattr(route, "path", "") for route in client.app.routes}

    def route_methods(self, client):
        methods = set()
        for route in client.app.routes:
            path = getattr(route, "path", "")
            for method in getattr(route, "methods", set()) or set():
                if method not in {"HEAD", "OPTIONS"}:
                    methods.add((method, path))
        return methods

    def create_agent_task(self, storage):
        with connect(storage) as conn:
            app = create_application(conn, company="Agent Co", role="Engineer")
            task = create_task(conn, "company_research", "Research", application_id=app["id"], context_hint="candidature:company_research")
        return task

    def test_launch_binds_to_loopback_by_default_and_supports_agent_api(self):
        self.assertEqual(inspect.signature(launch).parameters["host"].default, "127.0.0.1")
        self.assertIn("agent_api", inspect.signature(launch).parameters)

    def test_explicit_runtime_builders_create_distinct_apps(self):
        from aaaat.server_fastapi import create_agent_app, create_dashboard_app

        with tempfile.TemporaryDirectory() as tmp:
            dashboard = create_dashboard_app(tmp)
            agent = create_agent_app(tmp)

        self.assertEqual(dashboard.state.runtime, "dashboard")
        self.assertEqual(agent.state.runtime, "agent")
        self.assertNotEqual(dashboard.title, agent.title)

    def test_dashboard_runtime_renders_human_ui_and_dashboard_actions(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_application(conn, company="Dashboard Co", role="Engineer")
            client = self.dashboard_client(tmp)

            html = client.get("/").text
            self.assertIn('data-dashboard-view="welcomeView"', html)
            self.assertEqual(client.get("/static/htmx.min.js").status_code, 200)
            self.assertEqual(client.get("/openapi.json").status_code, 404)
            self.assertEqual(client.get("/dashboard/fragments/inspector").status_code, 200)

            registered = self.route_paths(client)
            self.assertIn("/", registered)
            self.assertTrue(any(path.startswith("/dashboard/fragments/") for path in registered))
            self.assertTrue(any(path.startswith("/dashboard/actions/") for path in registered))

    def test_dashboard_runtime_keeps_human_form_action_workflows(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.dashboard_client(tmp)

            response = client.post(
                "/dashboard/actions/raw-offer-intake",
                json={
                    "company": "Workflow Co",
                    "role": "Backend Engineer",
                    "content": "Raw offer text from the dashboard.",
                    "keywords": "Python, APIs",
                    "include_company_research_task": "true",
                },
            )
            self.assertEqual(response.status_code, 201, response.text)

            with connect(tmp) as conn:
                loaded = list_candidatures(conn, include_related=True)[0]
            self.assertEqual(loaded["company"], "Workflow Co")
            self.assertEqual(loaded["role"], "Backend Engineer")
            self.assertEqual(loaded["raw_intake"][0]["content"], "Raw offer text from the dashboard.")
            self.assertEqual(loaded["keywords"], ["APIs", "Python"])
            self.assertTrue(any(task["task_type"] == "company_research" for task in loaded["tasks"]))

    def test_agent_runtime_exposes_only_capability_routes(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.agent_client(tmp)

            self.assertEqual(self.route_methods(client), AGENT_RUNTIME_ROUTES)
            self.assertEqual(client.get("/api/health").json()["runtime"], "agent")
            self.assertEqual(client.get("/docs").status_code, 404)
            self.assertEqual(client.get("/openapi.json").status_code, 404)

    def test_agent_runtime_is_not_dashboard_ui(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.agent_client(tmp)

            health = client.get("/api/health")
            self.assertEqual(health.status_code, 200)
            self.assertEqual(health.json()["runtime"], "agent")
            self.assertEqual(client.get("/").status_code, 404)
            self.assertEqual(client.get("/static/htmx.min.js").status_code, 404)
            self.assertEqual(client.get("/dashboard/fragments/inspector").status_code, 404)
            self.assertEqual(client.post("/dashboard/actions/notes", json={}).status_code, 404)

    def test_agent_runtime_next_task_uses_task_handle(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            self.create_agent_task(tmp)
            client = self.agent_client(tmp)

            next_response = client.get("/api/agent/tasks/next")
            self.assertEqual(next_response.status_code, 200)
            task = next_response.json()["task"]
            self.assertIn("task_handle", task)
            self.assertNotIn("id", task)
            self.assertNotIn("application_id", task)
            self.assertEqual(task["task_type"], "company_research")
            self.assertEqual(task["allowed_actions"], ["context", "submit"])

    def test_agent_runtime_task_context_is_handle_scoped(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            task = self.create_agent_task(tmp)
            client = self.agent_client(tmp)

            context_response = client.get(f"/api/agent/tasks/{task['id']}/context")
            self.assertEqual(context_response.status_code, 200)
            context = context_response.json()
            self.assertEqual(context["task"]["task_handle"], task["id"])
            self.assertNotIn("id", context["task"])
            self.assertIn("company", context["context"])
            self.assertEqual(context["write_back"], {"submit": f"/api/agent/tasks/{task['id']}/result"})
            self.assertTrue(FORBIDDEN_AGENT_CONTEXT_KEYS.isdisjoint(object_keys(context)))

    def test_agent_runtime_submit_result_returns_narrow_ack(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            task = self.create_agent_task(tmp)
            client = self.agent_client(tmp)

            submitted = client.post(
                f"/api/agent/tasks/{task['id']}/result",
                json={"result_json": {"summary": "Agent research"}, "agent_name": "Agent", "agent_runtime": "http", "model_provider": "local"},
            )
            self.assertEqual(submitted.status_code, 200, submitted.text)
            ack = submitted.json()
            self.assertEqual(ack.get("status"), "accepted")
            self.assertEqual(set(ack), {"status", "task", "next"})
            self.assertEqual(set(ack["task"]), {"task_handle", "state"})
            self.assertEqual(ack["task"]["state"], "completed")
            self.assertTrue(FORBIDDEN_AGENT_CONTEXT_KEYS.isdisjoint(object_keys(ack)))

            with connect(tmp) as conn:
                task_row = next(item for item in list_tasks(conn) if item["id"] == task["id"])
            self.assertEqual(task_row["state"], "completed")

    def test_agent_runtime_context_bundle_and_action_session(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                fact = create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Python",
                    body="Private Python detail",
                    exposure="placeholder",
                    use_for_agent_context=True,
                )
            client = self.agent_client(tmp)

            bundle = client.post("/api/agent/context-bundle", json={"purpose": "candidature_fit"})
            self.assertEqual(bundle.status_code, 200)
            self.assertEqual(bundle.json()["scope"], "agent")
            self.assertIn("{{ profile_fact.skill.python }}", json.dumps(bundle.json()))
            self.assertNotIn(fact["id"], json.dumps(bundle.json()))

            submitted = client.post(
                "/api/agent/actions",
                json={
                    "action": "create_candidature",
                    "agent_name": "HTTP Agent",
                    "payload": {
                        "source_material": {"offer_text": "HTTP raw offer", "application_form_text": "HTTP raw form"},
                        "candidature": {"company": "HTTP Co", "role": "Platform Engineer"},
                        "outputs": {"form_answers": "HTTP form answers"},
                    },
                    "expose_internal_ids": True,
                },
            )
            self.assertEqual(submitted.status_code, 200)
            ack = submitted.json()
            self.assertEqual(ack["status"], "accepted")
            self.assertEqual(ack["action"], "create_candidature")
            self.assertNotIn("internal", ack)
            self.assertNotIn("application_id", ack)
            self.assertNotIn("candidature_id", ack)

            with connect(tmp) as conn:
                loaded = list_candidatures(conn, include_related=True)[0]
            self.assertEqual(loaded["company"], "HTTP Co")
            self.assertEqual(loaded["details"]["raw_application_form"], "HTTP raw form")
            self.assertEqual(loaded["form_answers"], "HTTP form answers")
            self.assertEqual(loaded["raw_intake"][0]["content"], "HTTP raw offer")

    def test_read_only_dashboard_blocks_dashboard_actions(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Blocked Co", role="Reviewer")
            client = self.dashboard_client(tmp, Mode.READ_ONLY)

            self.assertNotIn("data-write-control", client.get("/").text)
            self.assertEqual(client.post("/dashboard/actions/notes", json={"application_id": app["id"], "body": "Nope"}).status_code, 403)
            self.assertEqual(client.post(f"/dashboard/actions/applications/{app['id']}", json={"_method": "PATCH", "next_action": "Nope"}).status_code, 403)
            self.assertEqual(client.post("/dashboard/actions/render/cv", json={"application_id": app["id"]}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
