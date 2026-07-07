import importlib.util
import tempfile
import unittest

from aaaat.dashboard_views import dashboard_view_model, normalize_view, render_dashboard_view
from aaaat.db import connect, create_application, init_db
from aaaat.notes import create_note
from aaaat.payload import dashboard_payload
from aaaat.profile_facts import create_profile_fact
from aaaat.search import rebuild_index
from aaaat.security import Mode
from aaaat.tasks import create_task
from aaaat.todos import create_todo


JINJA_AVAILABLE = importlib.util.find_spec("jinja2") is not None


class DashboardViewHelpersTests(unittest.TestCase):
    def test_normalize_view_defaults_to_welcome(self):
        self.assertEqual(normalize_view("smartView"), "smartView")
        self.assertEqual(normalize_view("unknown"), "welcomeView")
        self.assertEqual(normalize_view(None), "welcomeView")


@unittest.skipUnless(JINJA_AVAILABLE, "Jinja2 is not installed")
class DashboardViewRenderTests(unittest.TestCase):
    def payload(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="View Co", role="Engineer", keywords=["ATS"], pitch="Call pitch")
            payload = dashboard_payload(conn)
        return payload, app

    def test_dashboard_views_keep_stable_hooks(self):
        payload, app = self.payload()
        html = render_dashboard_view(payload, Mode.FULL, view="detailedView", selected_application_id=app["id"])

        self.assertIn('data-dashboard-view="detailedView"', html)
        self.assertIn("data-app-row", html)
        self.assertIn("data-selected-app", html)
        self.assertIn('data-inline-field="next_action"', html)
        self.assertIn('data-inspector-tab="raw"', html)
        self.assertIn("data-write-control", html)
        self.assertIn("data-raw-offer-entry", html)
        self.assertIn('data-keyword="ATS"', html)

    def test_read_only_view_removes_write_and_raw_controls(self):
        payload, app = self.payload()
        html = render_dashboard_view(payload, Mode.READ_ONLY, view="detailedView", selected_application_id=app["id"])

        self.assertNotIn("data-write-control", html)
        self.assertNotIn('data-inspector-tab="raw"', html)
        self.assertNotIn("data-raw-offer-entry", html)

    def test_user_view_is_a_preset_not_a_duplicate_record(self):
        payload, app = self.payload()
        html = render_dashboard_view(payload, Mode.FULL, view="userView", selected_application_id=app["id"])

        self.assertIn('data-dashboard-view="userView"', html)
        self.assertIn("without storing a fork", html)

    def test_smart_view_shows_selected_keyword_and_search_results(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="Search View Co", role="Python Engineer", keywords=["Python"], pitch="Call pitch")
            create_note(conn, "Python screening note", application_id=app["id"])
            rebuild_index(conn)
            payload = dashboard_payload(conn)
            model = dashboard_view_model(
                payload,
                Mode.FULL,
                view="smartView",
                selected_application_id=app["id"],
                selected_keyword="Python",
                search_query="Python",
                conn=conn,
            )
            html = render_dashboard_view(payload, Mode.FULL, view_model=model)

        self.assertIn('data-dashboard-view="smartView"', html)
        self.assertIn('data-keyword="Python"', html)
        self.assertIn("data-search-results", html)
        self.assertIn("Search View Co", html)

    def test_welcome_view_surfaces_todos_tasks_and_important_candidatures(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="Welcome Co", role="Engineer", priority="high", next_action="Call today")
            create_todo(conn, "Prepare call", application_id=app["id"], pinned=True)
            create_task(conn, "company_research", "Research Welcome Co", application_id=app["id"], priority="high")
            payload = dashboard_payload(conn)
            model = dashboard_view_model(payload, Mode.FULL, view="welcomeView", selected_application_id=app["id"], conn=conn)
            html = render_dashboard_view(payload, Mode.FULL, view_model=model)

        self.assertIn("Open todos", html)
        self.assertIn("Prepare call", html)
        self.assertIn("Pending agent tasks", html)
        self.assertIn("Research Welcome Co", html)
        self.assertIn("Welcome Co", html)

    def test_detailed_view_exposes_core_and_detail_edit_controls(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="Detail Co", role="Engineer")
            payload = dashboard_payload(conn)
            model = dashboard_view_model(payload, Mode.FULL, view="detailedView", selected_application_id=app["id"], conn=conn)
            html = render_dashboard_view(payload, Mode.FULL, view_model=model)

        self.assertIn('data-inline-field="company"', html)
        self.assertIn('data-detail-field="description"', html)
        self.assertIn("/api/candidatures/", html)
        self.assertIn("data-generative-actions", html)
        self.assertIn("data-document-actions", html)
        self.assertIn("Render local template", html)
        self.assertIn("Queue agent draft", html)

    def test_dashboard_creation_panel_includes_all_task_toggles(self):
        payload, app = self.payload()
        html = render_dashboard_view(payload, Mode.FULL, view="welcomeView", selected_application_id=app["id"])

        for name in (
            "include_field_inference_task",
            "include_company_research_task",
            "include_keyword_detection_task",
            "include_cv_task",
            "include_cover_letter_task",
            "include_form_responses_task",
        ):
            self.assertIn(name, html)

    def test_user_view_and_profile_panel_are_editable_in_full_mode(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="User Co", role="Engineer", pitch="User pitch")
            create_profile_fact(
                conn,
                fact_type="skill",
                title="Python",
                body="Backend APIs",
                visibility="professional",
                exposure="summarized",
                use_for_cv=True,
                use_for_dashboard=True,
            )
            payload = dashboard_payload(conn)
            model = dashboard_view_model(payload, Mode.FULL, view="userView", selected_application_id=app["id"], conn=conn)
            html = render_dashboard_view(payload, Mode.FULL, view_model=model)

        self.assertIn("data-user-view-editor", html)
        self.assertIn("/dashboard/user-view", html)
        self.assertIn("data-profile-cv-panel", html)
        self.assertIn("visibility-professional", html)
        self.assertIn("exposure-summarized", html)

    def test_profile_panel_hides_write_controls_in_read_only_mode(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="Safe Co", role="Engineer")
            create_profile_fact(conn, fact_type="skill", title="Python", body="Backend APIs", use_for_dashboard=True)
            payload = dashboard_payload(conn)
            model = dashboard_view_model(payload, Mode.READ_ONLY, view="smartView", selected_application_id=app["id"], conn=conn)
            html = render_dashboard_view(payload, Mode.READ_ONLY, view_model=model)

        self.assertIn("data-profile-cv-panel", html)
        self.assertNotIn("profile-fact-add", html)
        self.assertNotIn("profile-fact-edit", html)


if __name__ == "__main__":
    unittest.main()
