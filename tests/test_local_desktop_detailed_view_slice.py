import sys
import tempfile
import unittest

from aaaat.dashboard_layout import DashboardLayoutState
from aaaat.dashboard_projection import build_dashboard_projection
from aaaat.db import add_raw_intake, connect, create_application, get_application, init_db, list_applications, list_raw_intake
from aaaat.payload import dashboard_payload
from aaaat.security import Mode


class DetailedViewFixture(unittest.TestCase):
    def make_data(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            first = create_application(
                conn,
                company="Batch Co",
                role="Platform Engineer",
                status="applied",
                priority="high",
                next_action="Review artifacts",
                notes="Needs structured review",
                source="LinkedIn",
                source_url="https://example.test/job",
                location="Madrid",
                remote_mode="hybrid",
                call_signals="Recruiter asked for systems depth",
                pitch="Original pitch",
                smart_question="What does success look like?",
                risks_to_avoid="Do not oversell frontend depth",
                prepare_first="Review distributed systems work",
                prepare_later="Read engineering blog",
                offer_snapshot="Original offer snapshot",
                company_research="Original company research",
                form_answers="Original form answers",
                keywords=["Python", "Kubernetes"],
            )
            add_raw_intake(conn, first["id"], "Raw source evidence for Batch Co role.", created_by="test")
            second = create_application(
                conn,
                company="Review Labs",
                role="Backend Engineer",
                status="draft",
                priority="normal",
                notes="Candidate row two",
                keywords=["FastAPI"],
            )
            payload = dashboard_payload(conn, include_raw=True)
        return payload, first, second, tmp.name


class DetailedProjectionBehaviorTests(DetailedViewFixture):
    def test_projection_exposes_rows_selected_record_and_valid_columns(self):
        payload, first, _second, _storage = self.make_data()
        projection = build_dashboard_projection(payload, Mode.FULL, view="detailed", selected_application_id=first["id"])
        detailed = projection["detailed"]

        self.assertEqual(len(detailed["rows"]), 2)
        self.assertEqual(detailed["selected_row"]["ref"], first["id"])
        available = {column["id"] for column in detailed["available_columns"]}
        self.assertTrue({"company", "role", "status", "priority"}.issubset(available))
        self.assertTrue(set(detailed["visible_columns"]).issubset(available))

    def test_desktop_projection_builder_opens_detailed_without_loading_wx(self):
        from aaaat.ui_desktop.app import build_desktop_projection

        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            state = DashboardLayoutState.default()
            state.selected_view = "detailed"
            projection = build_desktop_projection(tmp, Mode.FULL, state)

        self.assertEqual(projection["view_state"]["current_view"], "detailed")
        self.assertIn("detailed", projection)
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))

    def test_grouped_fields_cover_projected_record_and_identify_writable_fields(self):
        from aaaat.ui_desktop.detail_fields import (
            WRITABLE_DETAIL_STORAGE_KEYS,
            grouped_detail_fields,
            unrepresented_meaningful_fields,
        )

        payload, first, _second, _storage = self.make_data()
        projection = build_dashboard_projection(payload, Mode.FULL, view="detailed", selected_application_id=first["id"])
        groups = grouped_detail_fields(projection)
        fields = {field["key"]: field for group in groups for field in group["fields"]}

        self.assertEqual(unrepresented_meaningful_fields(projection), set())
        self.assertTrue({"company", "role", "status", "notes", "source_text", "created_at"}.issubset(fields))
        self.assertTrue(fields["company"]["editable"])
        self.assertTrue(fields["notes"]["editable"])
        self.assertFalse(fields["source_text"]["editable"])
        self.assertFalse(fields["created_at"]["editable"])
        self.assertIn("company", WRITABLE_DETAIL_STORAGE_KEYS)
        self.assertNotIn("created_at", WRITABLE_DETAIL_STORAGE_KEYS)

    def test_change_collection_omits_unchanged_and_read_only_values(self):
        from aaaat.ui_desktop.detail_fields import collect_writable_changes

        changes = collect_writable_changes(
            {"company": "Old", "role": "Same", "ref": "app_1"},
            {"company": "New", "role": "Same", "ref": "app_2"},
            {"company": "company", "role": "role", "ref": None},
        )
        self.assertEqual(changes, {"company": "New"})

    def test_column_normalization_drops_unknown_values_and_keeps_useful_defaults(self):
        from aaaat.ui_desktop.detail_columns import normalize_visible_columns

        available = [
            {"id": "company", "title": "Company"},
            {"id": "role", "title": "Role"},
            {"id": "status", "title": "Status"},
            {"id": "priority", "title": "Priority"},
        ]
        self.assertEqual(normalize_visible_columns(available, ["role", "missing", "company"]), ["role", "company"])
        self.assertTrue(normalize_visible_columns(available, []))


class DetailedCommandBehaviorTests(DetailedViewFixture):
    def test_supported_edits_persist_and_unknown_fields_are_ignored_by_desktop_adapter(self):
        from aaaat.ui_desktop.services import DesktopCommandService

        _payload, first, _second, storage = self.make_data()
        service = DesktopCommandService(storage)
        service.update_candidature_fields(
            first["id"],
            {
                "company": "Batch Co Edited",
                "notes": "Updated detail note",
                "keywords": "Python, Kubernetes, Linux",
                "created_at": "must not be written",
            },
        )

        with connect(storage) as conn:
            updated = get_application(conn, first["id"])
        self.assertEqual(updated["company"], "Batch Co Edited")
        self.assertEqual(updated["notes"], "Updated detail note")
        self.assertIn("Linux", updated["keywords"])
        self.assertNotEqual(updated["created_at"], "must not be written")

    def test_delete_removes_candidature_and_owned_raw_intake(self):
        from aaaat.ui_desktop.services import DesktopCommandService

        _payload, first, second, storage = self.make_data()
        service = DesktopCommandService(storage)
        self.assertTrue(service.delete_candidature(first["id"]))

        with connect(storage) as conn:
            remaining = {app["id"] for app in list_applications(conn)}
            raw = list_raw_intake(conn, first["id"])
        self.assertNotIn(first["id"], remaining)
        self.assertIn(second["id"], remaining)
        self.assertEqual(raw, [])

    def test_profile_and_candidature_commands_do_not_require_wx(self):
        from aaaat.ui_desktop.services import DesktopCommandService

        _payload, _first, _second, storage = self.make_data()
        DesktopCommandService(storage)
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))


if __name__ == "__main__":
    unittest.main()
