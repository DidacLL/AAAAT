import sys
import tempfile
import unittest

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_contains_private_values
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import add_raw_intake, connect, create_application, init_db, list_applications, list_raw_intake, set_profile_variable
from aaaat.demo_seed import seed
from aaaat.payload import dashboard_payload
from aaaat.profile_facts import create_profile_fact
from aaaat.security import Mode


class DesktopProjectionBehaviorTests(unittest.TestCase):
    def make_payload(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(
                conn,
                company="Desktop Co",
                role="Backend Engineer",
                status="meeting",
                priority="high",
                next_action="Prepare recruiter call",
                notes="Primary recruiter-call note",
                pitch="Compact pitch",
                smart_question="What does success look like?",
                risks_to_avoid="Do not overclaim frontend depth",
                prepare_first="Review backend projects",
                prepare_later="Read company blog",
                company_research="Local-first product context",
                form_answers="Draft form answer",
                keywords=["Python"],
            )
            add_raw_intake(conn, app["id"], "Literal offer text " * 80, created_by="test")
            payload = dashboard_payload(conn, include_raw=True)
        return payload, app

    def test_selected_candidature_is_projected_for_smart_workflow(self):
        payload, app = self.make_payload()
        projection = build_dashboard_projection(
            payload,
            Mode.FULL,
            view="smart",
            selected_application_id=app["id"],
            selected_keyword="Python",
        )

        self.assertEqual(projection["view_state"]["current_view"], "smart")
        self.assertEqual(projection["view_state"]["selected_candidature_ref"], app["id"])
        detail = projection["smart"]["selected_candidature_detail"]
        self.assertEqual(detail["company"], "Desktop Co")
        self.assertEqual(detail["role"], "Backend Engineer")
        self.assertEqual(projection["smart"]["primary_note"]["body"], "Primary recruiter-call note")
        self.assertTrue(projection["smart"]["source_text"]["has_raw"])

    def test_detailed_projection_preserves_selected_row_and_available_columns(self):
        payload, app = self.make_payload()
        projection = build_dashboard_projection(payload, Mode.FULL, view="detailed", selected_application_id=app["id"])
        detailed = projection["detailed"]

        self.assertEqual(detailed["selected_row"]["ref"], app["id"])
        self.assertEqual(detailed["selected_row"]["company"], "Desktop Co")
        available_ids = {column["id"] for column in detailed["available_columns"]}
        self.assertTrue({"company", "role", "status", "priority"}.issubset(available_ids))
        self.assertTrue(set(detailed["visible_columns"]).issubset(available_ids))

    def test_user_projection_uses_persisted_profile_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "profile.display_name", "Ada Lovelace")
                create_profile_fact(
                    conn,
                    fact_type="skill",
                    title="Python backend",
                    body="Builds local-first backend tooling.",
                    visibility="professional",
                    exposure="summarized",
                    use_for_dashboard=True,
                )
                payload = dashboard_payload(conn, include_raw=True)

        user = build_dashboard_projection(payload, Mode.FULL, view="user")["user"]
        self.assertIn("Ada Lovelace", {item["value"] for item in user["profile_variables"]})
        self.assertTrue(any(item["title"] == "Python backend" for item in user["profile_facts"]))

    def test_read_only_projection_disables_mutation_and_raw_intake(self):
        payload, app = self.make_payload()
        permissions = build_dashboard_projection(
            payload,
            Mode.READ_ONLY,
            view="smart",
            selected_application_id=app["id"],
        )["permissions"]

        self.assertFalse(permissions["can_write"])
        self.assertFalse(permissions["allow_dashboard_actions"])
        self.assertFalse(permissions["can_show_raw_intake"])

    def test_projection_imports_do_not_load_wx(self):
        payload, _app = self.make_payload()
        build_dashboard_projection(payload, Mode.FULL, view="smart")
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))


class DesktopFieldAndLayoutBehaviorTests(unittest.TestCase):
    def test_user_change_collection_only_returns_changed_writable_fields(self):
        from aaaat.ui_desktop.user_fields import collect_writable_user_changes

        changes = collect_writable_user_changes(
            {"profile.display_name": "Ada", "raw_provenance": "old"},
            {"profile.display_name": "Ada L.", "raw_provenance": "new", "unsupported": "new"},
            {"profile.display_name": "profile.display_name", "raw_provenance": None, "unsupported": "profile.unsupported"},
        )
        self.assertEqual(changes, {"profile.display_name": "Ada L."})

    def test_layout_state_round_trips_and_excludes_private_values(self):
        state = DashboardLayoutState.default()
        state.selected_view = "detailed"
        state.selected_candidature_ref = "app_123"
        state.selected_keyword = "Python"
        state.pane_layout["smart"] = {"left": 210, "right": 200}

        restored = DashboardLayoutState.from_json(state.to_json())
        self.assertEqual(restored.selected_view, "detailed")
        self.assertEqual(restored.selected_candidature_ref, "app_123")
        self.assertEqual(restored.selected_keyword, "Python")
        self.assertFalse(layout_state_contains_private_values(restored))

    def test_layout_state_persists_to_disk(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = f"{tmp}/ui_state.json"
            state = DashboardLayoutState.default()
            state.selected_view = "user"
            state.save(path)
            loaded = DashboardLayoutState.load(path)
        self.assertEqual(loaded.selected_view, "user")


class DesktopRuntimeAndSeedBehaviorTests(unittest.TestCase):
    def test_desktop_projection_builder_runs_without_wx(self):
        from aaaat.ui_desktop.app import build_desktop_projection

        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            projection = build_desktop_projection(tmp, Mode.FULL)
        self.assertIn(projection["view_state"]["current_view"], {"welcome", "smart"})
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))

    def test_seed_is_idempotent_and_creates_realistic_local_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            first = seed(tmp, count=4, reset=True)
            second = seed(tmp, count=4)
            with connect(tmp) as conn:
                apps = list_applications(conn)
                intake_counts = [len(list_raw_intake(conn, app["id"])) for app in apps]

        self.assertEqual(first["created"], 4)
        self.assertEqual(second["updated"], 4)
        self.assertEqual(len(apps), 4)
        self.assertTrue(all(count == 1 for count in intake_counts))
        self.assertTrue(any(app["pitch"] for app in apps))
        self.assertTrue(any(app["keywords"] for app in apps))


if __name__ == "__main__":
    unittest.main()
