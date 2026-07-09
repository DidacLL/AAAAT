import importlib.util
import tempfile
import unittest

from aaaat.artifacts import save_artifact
from aaaat.dashboard_views import dashboard_view_model, render_dashboard_fragment, render_dashboard_view
from aaaat.db import connect, create_application, init_db, upsert_glossary_term
from aaaat.notes import create_note
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


JINJA_AVAILABLE = importlib.util.find_spec("jinja2") is not None
FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


@unittest.skipUnless(JINJA_AVAILABLE, "Jinja2 is not installed")
class DashboardSmartViewTests(unittest.TestCase):
    def smart_model(self, mode=Mode.FULL, *, context_module="notes", selected_keyword="Python"):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(
                conn,
                company="Smart Projection Co",
                role="Backend Platform Engineer",
                status="screening",
                priority="high",
                source="LinkedIn",
                source_url="https://example.invalid/job",
                location="Barcelona",
                remote_mode="hybrid",
                next_action="Prepare recruiter call",
                notes="Primary Smart note value",
                keywords=["Python", "FastAPI", "SQLite", "LLM"],
                pitch="Backend platform pitch",
                risks_to_avoid="Do not overstate cloud ownership",
                smart_question="What does success look like after 90 days?",
                prepare_first="Review call card and compensation range",
                prepare_later="Compare offer with career strategy",
                call_signals="Recruiter mentioned platform ownership",
                offer_snapshot="Senior backend role focused on local-first tooling",
                company_research="Company builds developer productivity tools.",
                form_answers="Why us? Local-first product and Python stack.",
            )
            create_application(
                conn,
                company="Compact Only Co",
                role="Data Engineer",
                status="applied",
                priority="normal",
                source="Referral",
                next_action="Wait for reply",
                notes="SECONDARY FULL NOTE SHOULD NOT BE IN THE SMART LEFT LIST",
                keywords=["Pandas"],
            )
            create_note(conn, "Historical call note should stay secondary", application_id=app["id"], note_type="call")
            save_artifact(conn, app["id"], "cover_letter", "outputs/cover.pdf", "Cover letter", review_state="reviewed")
            upsert_glossary_term(conn, "Python", "Programming language used for backend services.", "skill")
            payload = dashboard_payload(conn)
            model = dashboard_view_model(
                payload,
                mode,
                view="smartView",
                selected_application_id=app["id"],
                selected_keyword=selected_keyword,
                selected_context_module=context_module,
                conn=conn,
            )
        return payload, model, app

    def test_left_panel_uses_compact_projection_summaries(self):
        _, model, _ = self.smart_model()
        html = render_dashboard_fragment("candidature-list", model)

        self.assertIn('data-smart-candidature-list', html)
        self.assertIn('data-smart-candidature-summary', html)
        self.assertIn("Smart Projection Co", html)
        self.assertIn("Backend Platform Engineer", html)
        self.assertIn("screening", html)
        self.assertIn("high", html)
        self.assertIn("Prepare recruiter call", html)
        self.assertIn("LinkedIn", html)
        self.assertIn('data-artifact-state-indicator', html)
        self.assertIn('data-keyword="Python"', html)
        self.assertNotIn("Primary Smart note value", html)
        self.assertNotIn("SECONDARY FULL NOTE SHOULD NOT BE IN THE SMART LEFT LIST", html)
        self.assertNotIn("Senior backend role focused on local-first tooling", html)

    def test_central_panel_renders_selected_operational_detail(self):
        _, model, _ = self.smart_model()
        html = render_dashboard_fragment("selected-card", model)

        self.assertIn('data-smart-operational-detail', html)
        self.assertIn("Smart Projection Co", html)
        self.assertIn("Backend Platform Engineer", html)
        self.assertIn("Barcelona", html)
        self.assertIn("hybrid", html)
        self.assertIn("Source URL", html)
        self.assertIn("Prepare recruiter call", html)
        self.assertIn("Backend platform pitch", html)
        self.assertIn("Do not overstate cloud ownership", html)
        self.assertIn("What does success look like after 90 days?", html)
        self.assertIn("Review call card and compensation range", html)
        self.assertIn("Compare offer with career strategy", html)
        self.assertIn("Recruiter mentioned platform ownership", html)
        self.assertIn("Senior backend role focused on local-first tooling", html)
        self.assertIn('data-operational-field="artifact_state_summary"', html)

    def test_notes_use_one_primary_note_field_in_full_local_mode(self):
        _, model, _ = self.smart_model(mode=Mode.FULL, context_module="notes")
        html = render_dashboard_fragment("selected-card", model)

        self.assertEqual(html.count('data-primary-note'), 1)
        self.assertIn("Primary Smart note value", html)
        self.assertIn('data-primary-note-editor', html)
        self.assertIn('textarea name="notes"', html)
        self.assertIn("Save primary note", html)
        self.assertNotIn("Historical call note should stay secondary", html)

    def test_read_only_mode_shows_primary_note_without_edit_control(self):
        _, model, _ = self.smart_model(mode=Mode.READ_ONLY, context_module="notes")
        html = render_dashboard_fragment("selected-card", model)

        self.assertIn("Primary Smart note value", html)
        self.assertIn('data-primary-note-readonly', html)
        self.assertNotIn('data-primary-note-editor', html)
        self.assertNotIn('textarea name="notes"', html)
        self.assertNotIn("Save primary note", html)

    def test_context_module_selector_and_modules_render_from_projection(self):
        _, model, _ = self.smart_model(context_module="artifacts")
        html = render_dashboard_fragment("inspector", model)

        self.assertIn('data-smart-context-selector', html)
        for label in ("Notes", "Keywords", "Artifacts", "Call card", "Company research", "Form answers", "Agent suggestions"):
            self.assertIn(label, html)
        self.assertIn('data-smart-context-panel="artifacts"', html)
        self.assertIn("Cover letter", html)
        self.assertIn("reviewed", html)

    def test_smart_view_does_not_show_quick_action_forms_by_default(self):
        _, model, _ = self.smart_model(mode=Mode.FULL)
        html = render_dashboard_fragment("selected-card", model)

        self.assertNotIn("Quick annotation", html)
        self.assertNotIn("Meeting / follow-up", html)
        self.assertNotIn("Ask an agent", html)
        self.assertNotIn('/dashboard/actions/notes', html)
        self.assertNotIn('/dashboard/actions/todos', html)
        self.assertNotIn('/dashboard/actions/tasks', html)

    def test_keyword_context_keeps_selected_candidature_visible(self):
        payload, model, _ = self.smart_model(context_module="keywords", selected_keyword="Python")
        html = render_dashboard_view(payload, Mode.FULL, view_model=model)

        self.assertIn('data-selected-app', html)
        self.assertIn("Smart Projection Co", html)
        self.assertIn("Backend Platform Engineer", html)
        self.assertIn('data-smart-context-panel="keywords"', html)
        self.assertIn('data-keyword-panel', html)
        self.assertIn("Programming language used for backend services.", html)


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
class DashboardSmartViewRuntimeBoundaryTests(unittest.TestCase):
    def test_agent_runtime_does_not_expose_dashboard_projection_or_fragments(self):
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
