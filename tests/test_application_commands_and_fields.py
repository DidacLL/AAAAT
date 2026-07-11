import tempfile
import unittest

from aaaat.application_commands import (
    ApplicationCommandService,
    CommandNotFoundError,
    CommandValidationError,
)
from aaaat.candidature_fields import (
    CANDIDATURE_FIELD_SPECS,
    WRITABLE_CANDIDATURE_STORAGE_KEYS,
    validate_candidature_field_policy,
)
from aaaat.db import connect, create_application, get_application, init_db


class CandidatureFieldPolicyTests(unittest.TestCase):
    def test_policy_is_internally_consistent(self):
        validate_candidature_field_policy()

    def test_editable_fields_have_storage_keys_and_read_only_fields_have_reasons(self):
        for spec in CANDIDATURE_FIELD_SPECS:
            if spec.editable:
                self.assertTrue(spec.storage_key, spec.key)
                self.assertIn(spec.storage_key, WRITABLE_CANDIDATURE_STORAGE_KEYS)
            else:
                self.assertTrue(spec.read_only_reason, spec.key)

    def test_raw_generated_and_provenance_fields_are_not_writable(self):
        forbidden = {
            "ref",
            "source_text",
            "source_excerpt",
            "source_length",
            "source_has_raw",
            "created_at",
            "updated_at",
            "artifacts_state",
            "artifacts_count",
            "artifacts_items",
            "task_queue",
        }
        writable_field_keys = {spec.key for spec in CANDIDATURE_FIELD_SPECS if spec.editable}
        self.assertTrue(forbidden.isdisjoint(writable_field_keys))


class ApplicationCommandServiceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        init_db(self.tmp.name)
        with connect(self.tmp.name) as conn:
            self.app = create_application(conn, company="Before", role="Engineer", keywords=["Python"])
        self.service = ApplicationCommandService(self.tmp.name)

    def test_updates_supported_fields_and_normalizes_keywords(self):
        updated = self.service.update_candidature_fields(
            self.app["id"],
            {"company": "After", "keywords": " Python, SQLite\nPython,  HTMX "},
        )
        self.assertEqual(updated["company"], "After")
        self.assertEqual(updated["keywords"], ["HTMX", "Python", "SQLite"])

    def test_rejects_read_only_or_unknown_fields(self):
        with self.assertRaises(CommandValidationError):
            self.service.update_candidature_fields(self.app["id"], {"created_at": "tomorrow"})

    def test_missing_candidature_uses_application_error(self):
        with self.assertRaises(CommandNotFoundError):
            self.service.update_candidature_fields("app_missing", {"company": "Nope"})

    def test_empty_changes_do_not_write(self):
        self.assertIsNone(self.service.update_candidature_fields(self.app["id"], {}))
        with connect(self.tmp.name) as conn:
            stored = get_application(conn, self.app["id"])
        self.assertEqual(stored["company"], "Before")

    def test_profile_updates_are_allowlisted(self):
        updated = self.service.update_profile_variables({"profile.display_name": "Ada"})
        self.assertEqual(updated, {"profile.display_name": "Ada"})
        with self.assertRaises(CommandValidationError):
            self.service.update_profile_variables({"profile.internal.secret": "x"})


if __name__ == "__main__":
    unittest.main()
