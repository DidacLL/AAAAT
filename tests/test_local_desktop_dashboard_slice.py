import builtins
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from aaaat.dashboard_layout import DashboardLayoutState, layout_state_contains_private_values
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import connect, list_applications, list_raw_intake, profile_variables
from aaaat.demo_seed import seed
from aaaat.tasks import list_tasks
from aaaat.ui_desktop.services import DesktopCommandService
from aaaat.ui_desktop.user_fields import WRITABLE_USER_STORAGE_KEYS, grouped_user_fields


class DesktopReleaseReadinessSliceTests(unittest.TestCase):
    def test_clean_storage_seed_builds_smart_projection_without_wx(self):
        from aaaat.ui_desktop.app import build_desktop_projection

        with tempfile.TemporaryDirectory() as parent:
            storage = Path(parent) / "fresh-private"
            self.assertFalse(storage.exists())

            summary = seed(storage, count=4, reset=True)
            projection = build_desktop_projection(storage)

            with connect(storage) as conn:
                applications = list_applications(conn)
                raw_counts = [len(list_raw_intake(conn, app["id"])) for app in applications]

        self.assertEqual(summary, {"created": 4, "updated": 0, "total": 4})
        self.assertEqual(len(applications), 4)
        self.assertTrue(all(count == 1 for count in raw_counts))
        self.assertEqual(projection["view_state"]["current_view"], "smart")
        self.assertIsNotNone(projection["smart"]["selected_candidature_detail"])
        self.assertTrue(projection["smart"]["source_text"]["has_raw"])
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))

    def test_demo_seed_is_idempotent_and_reset_is_repeatable(self):
        with tempfile.TemporaryDirectory() as tmp:
            first = seed(tmp, count=3, reset=True)
            second = seed(tmp, count=3)
            reset = seed(tmp, count=2, reset=True)
            with connect(tmp) as conn:
                applications = list_applications(conn)
                raw_counts = [len(list_raw_intake(conn, app["id"])) for app in applications]

        self.assertEqual(first, {"created": 3, "updated": 0, "total": 3})
        self.assertEqual(second, {"created": 0, "updated": 3, "total": 3})
        self.assertEqual(reset, {"created": 2, "updated": 0, "total": 2})
        self.assertEqual(len(applications), 2)
        self.assertTrue(all(count == 1 for count in raw_counts))
        self.assertTrue(all(app["status"] in {"active", "closed"} for app in applications))
        self.assertTrue(any(app["pitch"] for app in applications))
        self.assertTrue(any(app["keywords"] for app in applications))

    def test_empty_clean_storage_projects_welcome_view(self):
        from aaaat.ui_desktop.app import build_desktop_projection

        with tempfile.TemporaryDirectory() as parent:
            storage = Path(parent) / "fresh-private"
            projection = build_desktop_projection(storage)

        self.assertEqual(projection["view_state"]["current_view"], "welcome")
        self.assertFalse(projection["smart"]["candidatures"])

    def test_desktop_launcher_reports_missing_optional_dependency_clearly(self):
        from aaaat.ui_desktop.app import launch_desktop_dashboard

        real_import = builtins.__import__

        def import_without_wx(name, *args, **kwargs):
            if name == "wx":
                raise ModuleNotFoundError("No module named 'wx'")
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=import_without_wx):
            with self.assertRaisesRegex(RuntimeError, r"wxPython.*desktop extra"):
                launch_desktop_dashboard("unused")


class DesktopProjectionBehaviorTests(unittest.TestCase):
    def test_seeded_projection_preserves_selected_candidature_and_keyword(self):
        with tempfile.TemporaryDirectory() as tmp:
            seed(tmp, count=4, reset=True)
            with connect(tmp) as conn:
                applications = list_applications(conn)
            selected = applications[1]
            keyword = selected["keywords"][0]

            projection = build_dashboard_projection(
                build_desktop_payload(tmp),
                view="smart",
                selected_application_id=selected["id"],
                selected_keyword=keyword,
            )

        self.assertEqual(projection["view_state"]["selected_candidature_ref"], selected["id"])
        self.assertEqual(projection["view_state"]["selected_keyword"], keyword)
        self.assertEqual(projection["smart"]["selected_candidature_detail"]["company"], selected["company"])

    def test_detailed_projection_exposes_current_comparison_columns(self):
        with tempfile.TemporaryDirectory() as tmp:
            seed(tmp, count=3, reset=True)
            payload = build_desktop_payload(tmp)
            projection = build_dashboard_projection(payload, view="detailed")

        available = {column["id"] for column in projection["detailed"]["available_columns"]}
        self.assertTrue({"company", "role", "status", "priority", "source_url"}.issubset(available))
        self.assertTrue(set(projection["detailed"]["visible_columns"]).issubset(available))


class DesktopOfferFirstBehaviorTests(unittest.TestCase):
    def test_raw_offer_creation_retains_optional_source_and_form(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            created = service.create_raw_offer_candidature(
                "Original offer body",
                company="Example Co",
                role="Backend Engineer",
                source_url="https://example.invalid/job",
                raw_application_form="Why this role?",
            )
            self.assertIsNotNone(created)
            with connect(tmp) as conn:
                applications = list_applications(conn)
                raw = list_raw_intake(conn, applications[0]["id"])

        self.assertEqual(applications[0]["company"], "Example Co")
        self.assertEqual(applications[0]["role"], "Backend Engineer")
        self.assertEqual(applications[0]["source_url"], "https://example.invalid/job")
        self.assertEqual(created["raw_application_form"], "Why this role?")
        self.assertEqual(raw[0]["content"], "Original offer body")

    def test_requested_documents_are_blocked_until_evaluation_and_strategy_exist(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            created = service.create_raw_offer_candidature(
                "Original offer body",
                request_cv=True,
                request_cover_letter=True,
            )
            with connect(tmp) as conn:
                tasks = list_tasks(conn, application_id=created["id"])

        document_tasks = [task for task in tasks if task["task_type"] in {"draft_cv", "draft_cover_letter"}]
        self.assertEqual({task["state"] for task in document_tasks}, {"blocked"})
        self.assertTrue(all("evaluation" in task["notes"] and "strategy" in task["notes"] for task in document_tasks))

    def test_document_action_queues_after_current_inputs_exist(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            created = service.create_raw_offer_candidature("Original offer body")
            service.update_candidature_fields(
                created["id"],
                {"candidature_evaluation": "Strong fit", "role_strategy": "Emphasize backend ownership"},
            )
            task = service.queue_candidature_action(created["id"], "generate_cv")

        self.assertEqual(task["state"], "queued")


class DesktopUserWorkspaceBehaviorTests(unittest.TestCase):
    def test_user_workspace_exposes_professional_and_career_fields(self):
        projection = {"user": {"profile_variables": []}}
        groups = grouped_user_fields(projection)
        keys = {field["storage_key"] for group in groups for field in group["fields"]}

        self.assertEqual(keys, WRITABLE_USER_STORAGE_KEYS)
        self.assertTrue(
            {
                "profile.experience",
                "profile.education",
                "profile.skills",
                "profile.career.objectives",
                "profile.career.constraints",
                "profile.writing.preferences",
            }.issubset(keys)
        )

    def test_user_workspace_changes_persist_through_command_service(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            saved = service.update_profile_variables(
                {
                    "profile.experience": "Built local-first developer tools.",
                    "profile.career.objectives": "Senior backend roles.",
                    "unsupported": "ignored",
                }
            )
            with connect(tmp) as conn:
                values = profile_variables(conn)

        self.assertEqual(set(saved), {"profile.experience", "profile.career.objectives"})
        self.assertEqual(values["profile.experience"], "Built local-first developer tools.")
        self.assertEqual(values["profile.career.objectives"], "Senior backend roles.")


class DesktopLayoutBehaviorTests(unittest.TestCase):
    def test_layout_state_round_trips_without_private_values(self):
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
            path = Path(tmp) / "ui_state.json"
            state = DashboardLayoutState.default()
            state.selected_view = "user"
            state.save(path)
            loaded = DashboardLayoutState.load(path)

        self.assertEqual(loaded.selected_view, "user")


def build_desktop_payload(storage):
    from aaaat.payload import dashboard_payload

    with connect(storage) as conn:
        return dashboard_payload(conn, include_raw=True)


if __name__ == "__main__":
    unittest.main()
