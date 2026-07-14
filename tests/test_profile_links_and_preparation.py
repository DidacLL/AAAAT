import tempfile
import unittest

from aaaat.db import connect, profile_variables, set_profile_variable
from aaaat.tasks import list_tasks
from aaaat.ui_desktop.profile_links import parse_profile_links, profile_links_from_variables, serialize_profile_links
from aaaat.ui_desktop.services import DesktopCommandService
from aaaat.ui_desktop.user_fields import grouped_user_fields


class ProfileLinksBehaviorTests(unittest.TestCase):
    def test_links_are_provider_neutral_structured_values(self):
        encoded = serialize_profile_links([
            {"name": "Professional association", "description": "Member profile", "url": "https://example.invalid/member"},
            {"name": "Published work", "description": "Selected writing", "url": "https://example.invalid/work"},
        ])
        self.assertEqual(parse_profile_links(encoded)[0]["name"], "Professional association")
        self.assertNotIn("github", encoded.lower())
        self.assertNotIn("linkedin", encoded.lower())

    def test_legacy_links_are_preserved_as_initial_generic_rows(self):
        rows = profile_links_from_variables({
            "profile.linkedin_url": "https://example.invalid/network",
            "profile.github_url": "https://example.invalid/code",
        })
        self.assertEqual([row["url"] for row in rows], ["https://example.invalid/network", "https://example.invalid/code"])

    def test_user_workspace_exposes_main_page_and_structured_links(self):
        groups = grouped_user_fields({"user": {"profile_variables": []}})
        fields = {field["storage_key"]: field for group in groups for field in group["fields"]}
        self.assertIn("profile.main_page_url", fields)
        self.assertEqual(fields["profile.links"]["kind"], "links")
        self.assertNotIn("profile.github_url", fields)
        self.assertNotIn("profile.linkedin_url", fields)

    def test_structured_links_persist_through_profile_storage(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            encoded = serialize_profile_links([{"name": "Main publication", "description": "Author page", "url": "https://example.invalid/author"}])
            service.update_profile_variables({"profile.links": encoded})
            with connect(tmp) as conn:
                values = profile_variables(conn)
        self.assertEqual(parse_profile_links(values["profile.links"])[0]["description"], "Author page")


class DeferredPreparationBehaviorTests(unittest.TestCase):
    def test_requested_documents_start_automatically_when_inputs_are_ready(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            created = service.create_offer_first_candidature("Offer", request_cv=True, request_cover_letter=True)
            with connect(tmp) as conn:
                initial = [item for item in list_tasks(conn, application_id=created["id"]) if item["task_type"] in {"draft_cv", "draft_cover_letter"}]
            self.assertEqual({item["state"] for item in initial}, {"blocked"})
            service.update_candidature_fields(created["id"], {"candidature_evaluation": "Good fit", "role_strategy": "Lead with transferable experience"})
            with connect(tmp) as conn:
                ready = [item for item in list_tasks(conn, application_id=created["id"]) if item["task_type"] in {"draft_cv", "draft_cover_letter"}]
        self.assertEqual({item["state"] for item in ready}, {"queued"})
        self.assertTrue(all("Ready to begin" in item["notes"] for item in ready))


if __name__ == "__main__":
    unittest.main()
