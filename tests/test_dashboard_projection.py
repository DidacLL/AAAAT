import importlib.util
import tempfile
import unittest

from aaaat.career_plans import create_career_plan
from aaaat.dashboard_projection import build_dashboard_projection, normalize_view
from aaaat.db import connect, create_application, init_db, set_profile_variable, upsert_glossary_term
from aaaat.notes import create_note
from aaaat.payload import dashboard_payload
from aaaat.profile_facts import create_profile_fact
from aaaat.security import Mode
from aaaat.tasks import create_task
from aaaat.todos import create_todo


FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


class DashboardProjectionTests(unittest.TestCase):
    def populated_projection(self, mode=Mode.FULL, view="smartView", selected_keyword="Python"):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(conn, company="Projection Co", role="Backend Engineer", status="interview", priority="high", next_action="Prepare call", notes="Primary note text", keywords=["Python"], pitch="Reliable backend pitch")
            create_application(conn, company="Other Co", role="Data Engineer", priority="normal")
            create_note(conn, "Historical call note", application_id=app["id"], note_type="call")
            create_todo(conn, "Call recruiter", application_id=app["id"], pinned=True)
            create_task(conn, "company_research", "Research Projection Co", application_id=app["id"], priority="high")
            create_profile_fact(conn, fact_type="skill", title="Python", body="Backend APIs", use_for_cv=True, use_for_dashboard=True)
            create_career_plan(conn, body="Target backend platform roles", target_roles=["Backend Engineer"])
            set_profile_variable(conn, "display_name", "Projection Candidate")
            upsert_glossary_term(conn, "Python", "Programming language.", "skill")
            payload = dashboard_payload(conn)
            projection = build_dashboard_projection(payload, mode, view=view, selected_application_id=app["id"], selected_keyword=selected_keyword, search_query="Projection", conn=conn)
        return projection, app

    def test_projection_can_be_built_without_rendering_templates(self):
        projection, _ = self.populated_projection()
        self.assertEqual(projection["view_state"]["current_view"], "smartView")
        self.assertEqual(projection["view_state"]["view_key"], "smart")
        for key in ("welcome", "user", "smart", "detailed", "permissions"):
            self.assertIn(key, projection)

    def test_normalize_view_accepts_current_names_and_short_aliases(self):
        self.assertEqual(normalize_view("smartView"), "smartView")
        self.assertEqual(normalize_view("smart"), "smartView")
        self.assertEqual(normalize_view("unknown"), "welcomeView")
        self.assertEqual(normalize_view(None), "welcomeView")

    def test_projection_includes_mode_permissions(self):
        payload = {"applications": [], "glossary": [], "profile_variables": {}, "missing_profile_variables": []}
        full = build_dashboard_projection(payload, Mode.FULL)
        read_only = build_dashboard_projection(payload, Mode.READ_ONLY)
        static_demo = build_dashboard_projection(payload, Mode.STATIC_DEMO)
        self.assertTrue(full["permissions"]["is_full_local"])
        self.assertTrue(full["permissions"]["can_write"])
        self.assertFalse(read_only["permissions"]["can_write"])
        self.assertTrue(read_only["permissions"]["is_read_only"])
        self.assertFalse(static_demo["permissions"]["can_write"])
        self.assertTrue(static_demo["permissions"]["is_static_demo"])
        self.assertFalse(static_demo["permissions"]["can_show_raw_intake"])

    def test_welcome_and_user_projection_sections_are_structured(self):
        projection, _ = self.populated_projection(view="welcomeView")
        welcome_action_ids = {item["id"] for item in projection["welcome"]["primary_actions"]}
        self.assertTrue({"create_first_candidature", "configure_personal_data", "open_smart_view", "open_detailed_view"}.issubset(welcome_action_ids))
        user_section_ids = {item["id"] for item in projection["user"]["summary_sections"]}
        self.assertTrue({"personal_data", "career_strategy", "cv_fields", "template_variables", "settings"}.issubset(user_section_ids))
        self.assertGreaterEqual(projection["user"]["profile_summary"]["profile_fact_count"], 1)
        self.assertGreaterEqual(projection["user"]["career_summary"]["career_plan_count"], 1)

    def test_smart_projection_preserves_selection_primary_note_and_keyword_context(self):
        projection, app = self.populated_projection(view="smartView", selected_keyword="Python")
        smart = projection["smart"]
        self.assertGreaterEqual(len(smart["candidature_summaries"]), 2)
        self.assertEqual(smart["selected_candidature_detail"]["id"], app["id"])
        self.assertEqual(smart["primary_note"]["application_id"], app["id"])
        self.assertEqual(smart["primary_note"]["value"], "Primary note text")
        self.assertTrue(smart["primary_note"]["editable"])
        self.assertEqual(smart["primary_note"]["history_count"], 1)
        self.assertEqual(smart["selected_keyword_context"]["definition"], "Programming language.")

    def test_read_only_primary_note_is_visible_but_not_editable(self):
        projection, app = self.populated_projection(mode=Mode.READ_ONLY, view="smartView")
        primary_note = projection["smart"]["primary_note"]
        self.assertEqual(primary_note["application_id"], app["id"])
        self.assertTrue(primary_note["visible"])
        self.assertFalse(primary_note["editable"])

    def test_detailed_projection_has_rows_columns_filters_and_selected_toolbox(self):
        projection, app = self.populated_projection(view="detailedView")
        detailed = projection["detailed"]
        self.assertEqual(len(detailed["rows"]), 1)
        self.assertEqual(detailed["selected_row"]["id"], app["id"])
        self.assertTrue(detailed["has_selected_row"])
        available_columns = {item["key"] for item in detailed["available_columns"]}
        self.assertTrue({"company", "role", "status", "priority", "next_action", "notes_excerpt"}.issubset(available_columns))
        self.assertIn("company", detailed["visible_columns"])
        self.assertIn("company", detailed["column_order"])
        self.assertEqual(detailed["visible_column_defs"][0]["key"], "company")
        self.assertEqual(detailed["filters"]["search"], "Projection")
        selected_action_ids = {item["id"] for item in detailed["toolbox_actions"]}
        self.assertIn("generate_cv", selected_action_ids)
        self.assertIn("prepare_recruiter_call", selected_action_ids)

    def test_detailed_projection_general_toolbox_without_selected_row_even_with_applications(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_application(conn, company="Unselected Co", role="Engineer")
                payload = dashboard_payload(conn)
                projection = build_dashboard_projection(payload, Mode.FULL, view="detailedView", conn=conn)
        action_ids = {item["id"] for item in projection["detailed"]["toolbox_actions"]}
        self.assertIn("career_path_edit", action_ids)
        self.assertIn("import_create_candidature", action_ids)
        self.assertEqual(len(projection["detailed"]["rows"]), 1)
        self.assertEqual(projection["detailed"]["selected_row"], {})
        self.assertFalse(projection["detailed"]["has_selected_row"])

    def test_detailed_projection_includes_human_facing_task_queue_summary(self):
        projection, _ = self.populated_projection(view="detailedView")
        task_queue = projection["detailed"]["task_queue_summary"]
        self.assertTrue(task_queue["human_facing"])
        self.assertIn("pending", task_queue["groups"])
        self.assertGreaterEqual(task_queue["groups"]["pending"]["count"], 1)
        self.assertIn("review_needed", task_queue["groups"])
        self.assertEqual(task_queue["groups"]["queued_running"]["label"], "Queued/running")


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
class DashboardProjectionRuntimeBoundaryTests(unittest.TestCase):
    def test_agent_runtime_does_not_expose_dashboard_projection(self):
        from fastapi.testclient import TestClient
        from aaaat.server_fastapi import create_agent_app
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = TestClient(create_agent_app(tmp))
            route_paths = {getattr(route, "path", "") for route in client.app.routes}
            self.assertFalse(any("projection" in path for path in route_paths))
            self.assertEqual(client.get("/api/dashboard-projection").status_code, 404)
            self.assertEqual(client.get("/dashboard/fragments/selected-card").status_code, 404)


if __name__ == "__main__":
    unittest.main()
