import importlib.util
import inspect
import json
import tempfile
import unittest

from aaaat.candidatures import get_candidature, list_candidatures
from aaaat.db import connect, create_application, init_db, set_profile_variable
from aaaat.profile_facts import create_profile_fact
from aaaat.security import Mode
from aaaat.server import launch
from aaaat.tasks import create_task, list_tasks


FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


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

    def test_launch_binds_to_loopback_by_default_and_supports_agent_api(self):
        self.assertEqual(inspect.signature(launch).parameters["host"].default, "127.0.0.1")
        self.assertIn("agent_api", inspect.signature(launch).parameters)

    def test_explicit_runtime_builders_replace_surface_as_concept(self):
        from aaaat.server_fastapi import create_agent_app, create_app, create_dashboard_app

        with tempfile.TemporaryDirectory() as tmp:
            dashboard = create_dashboard_app(tmp)
            agent = create_agent_app(tmp)
            wrapped_dashboard = create_app(tmp, surface="dashboard")
            wrapped_agent = create_app(tmp, surface="agent")

        self.assertEqual(dashboard.state.runtime, "dashboard")
        self.assertEqual(agent.state.runtime, "agent")
        self.assertEqual(wrapped_dashboard.state.runtime, "dashboard")
        self.assertEqual(wrapped_agent.state.runtime, "agent")

    def test_dashboard_runtime_renders_human_ui_and_dashboard_actions(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Dashboard Co", role="Engineer")
            client = self.dashboard_client(tmp)

            html = client.get("/").text
            self.assertIn('data-dashboard-view="welcomeView"', html)
            self.assertIn(app["id"], html)
            self.assertEqual(client.get("/static/htmx.min.js").status_code, 200)
            self.assertEqual(client.get("/dashboard/fragments/selected-card").status_code, 200)
            self.assertEqual(client.get("/openapi.json").status_code, 404)

            registered = self.route_paths(client)
            self.assertIn("/", registered)
            self.assertIn("/dashboard/fragments/{fragment}", registered)
            self.assertTrue(any(path.startswith("/dashboard/actions/") for path in registered))
            self.assertFalse(any(path.startswith("/api/agent/") for path in registered))

    def test_dashboard_actions_preserve_human_workflows(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Local Candidate")
                set_profile_variable(conn, "email", "candidate@example.test")
                set_profile_variable(conn, "summary.default", "Private local summary")
            client = self.dashboard_client(tmp)

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

            core_updated = client.post(
                f"/dashboard/actions/applications/{app_id}",
                data={"_method": "PATCH", "next_action": "Prepare recruiter call"},
                follow_redirects=False,
            )
            updated = client.post(
                f"/dashboard/actions/candidatures/{app_id}",
                data={"_method": "PATCH", "description": "Detailed offer", "questions_to_ask": "Ask about roadmap"},
                follow_redirects=False,
            )
            note = client.post("/dashboard/actions/notes", data={"application_id": app_id, "note_type": "call", "body": "Call note"}, follow_redirects=False)
            todo = client.post("/dashboard/actions/todos", data={"application_id": app_id, "title": "Follow up"}, follow_redirects=False)
            task = client.post(
                "/dashboard/actions/tasks",
                data={"application_id": app_id, "task_type": "company_research", "title": "Research company"},
                follow_redirects=False,
            )
            render = client.post("/dashboard/actions/render/cv", data={"application_id": app_id}, follow_redirects=False)
            self.assertEqual(core_updated.status_code, 303)
            self.assertEqual(updated.status_code, 303)
            self.assertEqual(note.status_code, 303)
            self.assertEqual(todo.status_code, 303)
            self.assertEqual(task.status_code, 303)
            self.assertEqual(render.status_code, 303)

            with connect(tmp) as conn:
                loaded = get_candidature(conn, app_id)
            self.assertEqual(loaded["next_action"], "Prepare recruiter call")
            self.assertEqual(loaded["details"]["description"], "Detailed offer")
            self.assertTrue(any(item["body"] == "Call note" for item in loaded["notes_records"]))
            self.assertTrue(any(item["title"] == "Follow up" for item in loaded["todos"]))
            self.assertTrue(any(item["artifact_type"] == "cv" for item in loaded["artifacts"]))

    def test_agent_runtime_mounts_only_bounded_capability_routes(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = self.agent_client(tmp)

            self.assertEqual(client.get("/").status_code, 404)
            self.assertEqual(client.get("/legacy").status_code, 404)
            self.assertEqual(client.get("/intake").status_code, 404)
            self.assertEqual(client.get("/static/htmx.min.js").status_code, 404)
            self.assertEqual(client.get("/dashboard/fragments/selected-card").status_code, 404)
            self.assertEqual(client.post("/dashboard/actions/notes", json={}).status_code, 404)
            self.assertEqual(client.get("/api/health").json()["runtime"], "agent")

            openapi_paths = set(client.get("/openapi.json").json()["paths"])
            expected = {
                "/api/health",
                "/api/agent/tasks/next",
                "/api/agent/tasks/{task_handle}/context",
                "/api/agent/tasks/{task_handle}/result",
                "/api/agent/context-bundle",
                "/api/agent/actions",
            }
            self.assertEqual(openapi_paths, expected)

            forbidden_prefixes = (
                "/api/applications",
                "/api/candidatures",
                "/api/search",
                "/api/profile",
                "/api/dashboard",
                "/api/tasks",
                "/api/notes",
                "/api/todos",
                "/api/text-blobs",
                "/api/artifacts",
                "/dashboard/",
                "/static/",
            )
            for prefix in forbidden_prefixes:
                self.assertFalse(any(path.startswith(prefix) for path in openapi_paths), prefix)
            self.assertNotIn("/api/agent/tasks", openapi_paths)
            self.assertNotIn("/api/agent/tasks/{task_handle}/claim", openapi_paths)
            self.assertNotIn("/api/agent/tasks/{task_handle}/release", openapi_paths)

    def test_agent_runtime_next_context_and_result_are_task_handle_scoped(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Agent Co", role="Engineer")
                create_task(conn, "company_research", "Research", application_id=app["id"], context_hint="candidature:company_research")
            client = self.agent_client(tmp)

            next_response = client.get("/api/agent/tasks/next")
            self.assertEqual(next_response.status_code, 200)
            task = next_response.json()["task"]
            task_handle = task["task_handle"]
            self.assertNotIn("id", task)
            self.assertNotIn("application_id", json.dumps(task))
            self.assertEqual(task["task_type"], "company_research")

            context_response = client.get(f"/api/agent/tasks/{task_handle}/context")
            self.assertEqual(context_response.status_code, 200)
            context = context_response.json()
            serialized_context = json.dumps(context)
            self.assertEqual(context["task"]["task_handle"], task_handle)
            self.assertIn("company", context["context"])
            self.assertNotIn(app["id"], serialized_context)
            self.assertNotIn("application_id", serialized_context)
            self.assertNotIn("candidature_id", serialized_context)
            self.assertNotIn("profile_fact_id", serialized_context)
            self.assertNotIn("artifact_id", serialized_context)
            self.assertNotIn("/api/tasks/", serialized_context)
            self.assertEqual(context["write_back"], {"submit": f"/api/agent/tasks/{task_handle}/result"})

            submitted = client.post(
                f"/api/agent/tasks/{task_handle}/result",
                json={"result_json": {"summary": "Agent research"}, "agent_name": "Agent", "agent_runtime": "http", "model_provider": "local"},
            )
            self.assertEqual(submitted.status_code, 200)
            ack = submitted.json()
            self.assertEqual(ack["status"], "accepted")
            self.assertEqual(ack["task"]["task_handle"], task_handle)
            self.assertNotIn("application_id", json.dumps(ack))
            self.assertNotIn("result_blob_id", json.dumps(ack))

            with connect(tmp) as conn:
                task_row = next(item for item in list_tasks(conn) if item["id"] == task_handle)
            self.assertEqual(task_row["state"], "completed")

    def test_agent_runtime_context_bundle_and_action_session(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_profile_fact(
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
            self.assertIn("{{ profile_fact.", json.dumps(bundle.json()))
            self.assertNotIn("Private Python detail", json.dumps(bundle.json()))

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
            self.assertNotIn("internal", ack)
            self.assertNotIn("application_id", json.dumps(ack))
            self.assertNotIn("candidature_id", json.dumps(ack))
            self.assertNotIn("artifact_id", json.dumps(ack))

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
            self.assertEqual(client.post("/dashboard/actions/notes", data={"application_id": app["id"], "body": "Nope"}).status_code, 403)
            self.assertEqual(client.post(f"/dashboard/actions/applications/{app['id']}", data={"_method": "PATCH", "next_action": "Nope"}).status_code, 403)
            self.assertEqual(client.post("/dashboard/actions/render/cv", data={"application_id": app["id"]}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
