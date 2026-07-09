import importlib.util
import tempfile
import unittest

from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.dashboard_views import dashboard_view_model, render_dashboard_fragment, render_dashboard_view
from aaaat.db import connect, create_application, init_db
from aaaat.payload import dashboard_payload
from aaaat.security import Mode
from aaaat.tasks import create_task


JINJA_AVAILABLE = importlib.util.find_spec("jinja2") is not None
FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


@unittest.skipUnless(JINJA_AVAILABLE, "Jinja2 is not installed")
class DashboardDetailedViewTests(unittest.TestCase):
    def detailed_fixture(self, mode=Mode.FULL, *, selected=True):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="Grid Co", role="Backend Engineer", status="screening", priority="high", source="Referral", location="Barcelona", next_action="Schedule recruiter call", notes="Primary detailed note", keywords=["Python", "SQLite"])
            create_application(conn, company="Rows Co", role="Data Engineer", status="applied", priority="normal", source="LinkedIn", next_action="Wait for reply", keywords=["Pandas"])
            create_task(conn, "company_research", "Research Grid Co", application_id=app["id"], priority="high")
            create_task(conn, "draft_cv", "Completed CV task", application_id=app["id"], state="completed", idempotent=False)
            payload = dashboard_payload(conn)
            model = dashboard_view_model(payload, mode, view="detailedView", selected_application_id=app["id"] if selected else None, conn=conn)
        return payload, model, app

    def test_central_panel_renders_candidature_grid(self):
        payload, model, _ = self.detailed_fixture(selected=True)
        html = render_dashboard_view(payload, Mode.FULL, view_model=model)
        self.assertIn('data-dashboard-view="detailedView"', html)
        self.assertIn('data-detailed-grid', html)
        self.assertIn('data-detailed-table', html)
        self.assertIn('data-detailed-row', html)
        self.assertIn("Grid Co", html)
        self.assertIn("Rows Co", html)
        self.assertNotIn('data-detailed-fields', html)
        self.assertNotIn('data-inline-field="company"', html)
        self.assertNotIn('data-detail-field="description"', html)

    def test_rows_and_columns_come_from_detailed_projection_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Column Co", role="Platform Engineer", status="interview", priority="high")
                payload = dashboard_payload(conn)
                model = build_dashboard_projection(payload, Mode.FULL, view="detailedView", selected_application_id=app["id"], visible_columns=["role", "company"], column_order=["role", "company", "status"], conn=conn)
            html = render_dashboard_fragment("selected-card", model)
        self.assertEqual([column["key"] for column in model["detailed"]["visible_column_defs"]], ["role", "company"])
        self.assertIn('data-detailed-column="role"', html)
        self.assertIn('data-detailed-column="company"', html)
        self.assertNotIn('data-detailed-column="status"', html)
        self.assertIn('data-detailed-visible-columns', html)
        self.assertIn('data-detailed-column-order', html)

    def test_search_query_filters_projected_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_application(conn, company="Alpha Co", role="Backend Engineer")
                create_application(conn, company="Beta Co", role="Data Engineer")
                payload = dashboard_payload(conn)
                model = build_dashboard_projection(payload, Mode.FULL, view="detailedView", search_query="Beta", conn=conn)
        self.assertEqual(model["detailed"]["all_row_count"], 2)
        self.assertEqual(model["detailed"]["filtered_row_count"], 1)
        self.assertEqual(model["detailed"]["rows"][0]["company"], "Beta Co")

    def test_no_selected_row_shows_general_toolbox_and_no_standard_candidature_list(self):
        payload, model, _ = self.detailed_fixture(selected=False)
        html = render_dashboard_view(payload, Mode.FULL, view_model=model)
        self.assertIn('data-detailed-toolbox-state="general"', html)
        self.assertIn('data-detailed-toolbox-action', html)
        self.assertIn('career_path_edit', html)
        self.assertIn('import_create_candidature', html)
        self.assertNotIn('generate_cv', html)
        self.assertNotIn('aria-label="Candidatures"', html)

    def test_selected_row_shows_candidature_specific_toolbox(self):
        payload, model, _ = self.detailed_fixture(selected=True)
        html = render_dashboard_view(payload, Mode.FULL, view_model=model)
        self.assertIn('data-detailed-toolbox-state="selected"', html)
        self.assertIn('data-detailed-toolbox-action', html)
        self.assertIn('generate_cv', html)
        self.assertIn('prepare_recruiter_call', html)
        self.assertIn('data-selected-row="true"', html)

    def test_toolbox_actions_are_collapsed_dashboard_panels(self):
        payload, model, _ = self.detailed_fixture(selected=True)
        html = render_dashboard_view(payload, Mode.FULL, view_model=model)
        self.assertIn('data-panel-kind="action"', html)
        self.assertIn('data-panel-default="collapsed"', html)
        self.assertIn('data-panel-control="toggle"', html)
        self.assertIn('x-bind:data-panel-state', html)
        self.assertNotIn("<details", html)

    def test_right_panel_renders_human_facing_task_queue_groups(self):
        payload, model, _ = self.detailed_fixture(selected=True)
        html = render_dashboard_view(payload, Mode.FULL, view_model=model)
        self.assertIn('data-detailed-task-queue', html)
        self.assertIn('data-dashboard-task-queue-boundary', html)
        for group in ("pending", "queued_running", "review_needed", "failed", "deferred", "recently_completed"):
            self.assertIn(f'data-task-queue-group="{group}"', html)
        self.assertIn("Research Grid Co", html)
        self.assertIn("Completed CV task", html)

    def test_large_document_and_generative_forms_are_not_visible_by_default(self):
        payload, model, _ = self.detailed_fixture(selected=True)
        html = render_dashboard_view(payload, Mode.FULL, view_model=model)
        self.assertNotIn('data-document-actions', html)
        self.assertNotIn('data-generative-actions', html)
        self.assertNotIn('/dashboard/actions/render/cv', html)
        self.assertNotIn('/dashboard/actions/render/cover-letter', html)

    def test_read_only_and_static_demo_keep_grid_without_write_or_raw_controls(self):
        for mode in (Mode.READ_ONLY, Mode.STATIC_DEMO):
            payload, model, _ = self.detailed_fixture(mode=mode, selected=True)
            html = render_dashboard_view(payload, mode, view_model=model)
            self.assertIn('data-detailed-grid', html)
            self.assertIn("Grid Co", html)
            self.assertNotIn('data-write-control', html)
            self.assertNotIn('data-raw-offer-entry', html)


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
class DashboardDetailedViewRuntimeBoundaryTests(unittest.TestCase):
    def test_agent_runtime_does_not_expose_dashboard_projection_or_routes(self):
        from fastapi.testclient import TestClient
        from aaaat.server_fastapi import create_agent_app
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = TestClient(create_agent_app(tmp))
            route_paths = {getattr(route, "path", "") for route in client.app.routes}
            self.assertFalse(any("projection" in path for path in route_paths))
            self.assertFalse(any(path.startswith("/dashboard") for path in route_paths))
            self.assertEqual(client.get("/api/dashboard-projection").status_code, 404)
            self.assertEqual(client.get("/dashboard/fragments/selected-card").status_code, 404)


if __name__ == "__main__":
    unittest.main()
