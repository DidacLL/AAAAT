import unittest

from aaaat.task_registry import automatic_task_types, sidebar_task_definitions, task_definition


class TaskRegistryTests(unittest.TestCase):
    def test_default_policy_is_comprehensive_and_documents_are_supplementary(self):
        self.assertEqual(automatic_task_types(), ("field_inference", "company_research", "career_plan_review"))
        self.assertFalse(task_definition("draft_cv").automatic)
        self.assertFalse(task_definition("draft_cover_letter").automatic)

    def test_sidebar_actions_are_registry_driven(self):
        action_types = {definition.task_type for definition in sidebar_task_definitions()}
        self.assertIn("field_inference", action_types)
        self.assertIn("career_plan_review", action_types)
        self.assertIn("draft_cv", action_types)
        self.assertIn("draft_cover_letter", action_types)
        self.assertNotIn("keyword_definition", action_types)


if __name__ == "__main__":
    unittest.main()
