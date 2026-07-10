import importlib.util
import tempfile
import unittest

from aaaat.career_plans import create_career_plan
from aaaat.dashboard_views import dashboard_view_model, render_dashboard_view
from aaaat.db import connect, create_application, init_db, set_profile_variable
from aaaat.payload import dashboard_payload
from aaaat.profile_facts import create_profile_fact
from aaaat.security import Mode


JINJA_AVAILABLE = importlib.util.find_spec("jinja2") is not None


@unittest.skipUnless(JINJA_AVAILABLE, "Jinja2 is not installed")
class DashboardWelcomeUserViewTests(unittest.TestCase):
    def render_view(self, storage, mode=Mode.FULL, view="welcomeView", application_id=None):
        with connect(storage) as conn:
            payload = dashboard_payload(conn)
            model = dashboard_view_model(
                payload,
                mode,
                view=view,
                selected_application_id=application_id,
                conn=conn,
            )
        return render_dashboard_view(payload, mode, view_model=model)

    def test_welcome_view_renders_for_first_run_with_projection_actions(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            html = self.render_view(tmp, Mode.FULL, view="welcomeView")

        self.assertIn('data-dashboard-view="welcomeView"', html)
        self.assertIn("data-welcome-view", html)
        self.assertIn("local-first", html)
        self.assertIn('data-welcome-side-orientation', html)
        self.assertIn('data-welcome-primary-action="create_first_candidature"', html)
        self.assertIn('data-welcome-primary-action="import_source_material"', html)
        self.assertIn('data-welcome-primary-action="configure_personal_data"', html)
        self.assertIn('data-welcome-primary-action="configure_career_strategy"', html)
        self.assertIn('data-welcome-primary-action="configure_cv_templates"', html)
        self.assertIn('/?view=userView', html)
        self.assertIn('/?view=smartView', html)
        self.assertIn('/?view=detailedView', html)
        self.assertNotIn("data-app-row", html)

    def test_welcome_view_keeps_setup_forms_collapsed_by_default(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            html = self.render_view(tmp, Mode.FULL, view="welcomeView")

        self.assertIn('data-panel-id="welcome-new-candidature"', html)
        self.assertIn('data-panel-id="welcome-setup-checklist"', html)
        self.assertIn('data-panel-kind="creation"', html)
        self.assertIn('data-welcome-setup-panel', html)
        self.assertIn('raw-offer-intake-form', html)
        self.assertGreaterEqual(html.count('data-panel-default="collapsed"'), 2)
        self.assertGreaterEqual(html.count('x-data="{ open: false }"'), 2)
        self.assertIn('data-panel-control="toggle"', html)
        self.assertNotIn('data-panel-id="global-raw-intake"', html)
        self.assertNotIn("<details", html)
        self.assertNotIn('data-detailed-fields', html)

    def test_user_view_renders_control_center_sections_without_candidature_list(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Operational Co", role="Backend Engineer", pitch="Candidate pitch")
                set_profile_variable(conn, "display_name", "Local Candidate")
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
                create_career_plan(conn, body="Target platform backend roles", target_roles=["Backend Engineer"])
            html = self.render_view(tmp, Mode.FULL, view="userView", application_id=app["id"])

        self.assertIn('data-dashboard-view="userView"', html)
        self.assertIn("data-user-control-center", html)
        self.assertIn('data-user-summary-section="personal_data"', html)
        self.assertIn('data-user-summary-section="career_strategy"', html)
        self.assertIn('data-user-summary-section="cv_fields"', html)
        self.assertIn('data-user-summary-section="template_variables"', html)
        self.assertIn('data-user-summary-section="settings"', html)
        self.assertIn("data-user-panel", html)
        self.assertIn("personal_data", html)
        self.assertIn("career_strategy", html)
        self.assertIn("cv_fields", html)
        self.assertIn("settings", html)
        self.assertIn("without storing a fork", html)
        self.assertIn("visibility-professional", html)
        self.assertIn("exposure-summarized", html)
        self.assertNotIn("data-app-row", html)
        self.assertNotIn("data-important-candidature", html)
        self.assertNotIn("raw-offer-intake-form", html)

    def test_user_view_groups_forms_in_expandable_panels(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Panel Co", role="Engineer")
            html = self.render_view(tmp, Mode.FULL, view="userView", application_id=app["id"])

        for panel_id in ("user-personal-data", "user-career-strategy", "user-cv-fields", "user-settings"):
            self.assertIn(f'data-panel-id="{panel_id}"', html)
        self.assertGreaterEqual(html.count('data-expandable-panel'), 5)
        self.assertGreaterEqual(html.count('data-panel-default="collapsed"'), 5)
        self.assertGreaterEqual(html.count('x-show="open"'), 5)
        self.assertIn('data-write-control="profile-variable-add"', html)
        self.assertIn('data-write-control="profile-fact-add"', html)
        self.assertNotIn("<details", html)
        self.assertNotIn("<summary", html)

    def test_user_view_hides_write_controls_in_read_only_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Read Co", role="Engineer")
                create_profile_fact(conn, fact_type="skill", title="Python", body="Backend APIs", use_for_dashboard=True)
            html = self.render_view(tmp, Mode.READ_ONLY, view="userView", application_id=app["id"])

        self.assertIn('data-dashboard-view="userView"', html)
        self.assertIn("data-user-control-center", html)
        self.assertNotIn("data-write-control", html)
        self.assertNotIn("/dashboard/actions/user-view", html)
        self.assertNotIn("profile-fact-add", html)
        self.assertNotIn("profile-fact-edit", html)

    def test_user_view_static_demo_hides_private_data_and_write_controls(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Private Co", role="Engineer")
                create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Private Python",
                    body="Private Python detail",
                    visibility="private",
                    exposure="raw",
                    use_for_dashboard=True,
                )
                create_career_plan(conn, body="Private career strategy", target_roles=["Principal Engineer"])
            html = self.render_view(tmp, Mode.STATIC_DEMO, view="userView", application_id=app["id"])

        self.assertIn('data-dashboard-view="userView"', html)
        self.assertIn("data-user-control-center", html)
        self.assertNotIn("data-write-control", html)
        self.assertNotIn("Private Python detail", html)
        self.assertNotIn("Private career strategy", html)
        self.assertIn("Static demo mode hides private profile facts", html)
        self.assertIn("Static demo mode hides private strategy content", html)


if __name__ == "__main__":
    unittest.main()
