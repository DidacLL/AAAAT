import tempfile
import unittest

from aaaat.ui_desktop.services import DesktopCommandService


class DesktopProfileFactsTests(unittest.TestCase):
    def test_reusable_evidence_can_be_created_updated_and_archived(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            facts = service.create_profile_fact(
                {
                    "fact_type": "achievement",
                    "title": "Reduced processing time",
                    "body": "Redesigned a workflow and reduced processing time by 30%.",
                    "tags": ["operations", "improvement"],
                    "visibility": "private",
                    "exposure": "summarized",
                    "use_for_cv": True,
                    "use_for_cover_letter": False,
                    "use_for_agent_context": True,
                    "use_for_market_research": False,
                    "use_for_desktop": True,
                    "source": "user",
                }
            )
            self.assertEqual(len(facts), 1)
            fact_id = facts[0]["id"]

            facts = service.update_profile_fact(
                fact_id,
                {
                    "title": "Improved processing workflow",
                    "body": "Redesigned a workflow and reduced processing time by 30%.",
                    "use_for_cover_letter": True,
                },
            )
            self.assertEqual(facts[0]["title"], "Improved processing workflow")
            self.assertTrue(facts[0]["use_for_cv"])
            self.assertTrue(facts[0]["use_for_cover_letter"])

            active = service.archive_profile_fact(fact_id)
            self.assertEqual(active, [])


if __name__ == "__main__":
    unittest.main()
