import json
import sys
import tempfile
import unittest

from aaaat.db import connect, get_application, init_db, list_glossary
from aaaat.intake import IntakeService
from aaaat.task_runner import TaskRunner
from aaaat.tasks import list_tasks
from aaaat.workspace_config import config_path


class IntakeAssistanceTests(unittest.TestCase):
    def make_storage(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        return tmp.name

    def write_config(self, storage, *, automatic, command=None):
        config_path(storage).write_text(
            json.dumps(
                {
                    "automatic_preparation": automatic,
                    "runner_command": command or [],
                    "task_overrides": {},
                }
            ),
            encoding="utf-8",
        )

    def test_offer_intake_plans_comprehensive_defaults_without_documents(self):
        storage = self.make_storage()
        service = IntakeService(storage)
        result = service.create_from_offer("Backend role at Example Corp in Madrid. Salary 60k.")

        self.assertEqual(result["candidature"]["status"], "intake")
        self.assertEqual(result["candidature"]["raw_intake"][0]["content"], "Backend role at Example Corp in Madrid. Salary 60k.")
        self.assertEqual(
            [task["task_type"] for task in result["tasks"]],
            ["field_inference", "company_research", "career_plan_review"],
        )
        self.assertFalse(any(task["task_type"] in {"draft_cv", "draft_cover_letter"} for task in result["tasks"]))

    def test_form_answers_are_conditional(self):
        storage = self.make_storage()
        result = IntakeService(storage).create_from_offer("Role offer", raw_application_form="Why do you want this role?")
        self.assertIn("draft_form_responses", [task["task_type"] for task in result["tasks"]])

    def test_configured_runner_applies_fields_and_plans_missing_keyword_definition(self):
        storage = self.make_storage()
        script = (
            "import json,sys; p=json.load(sys.stdin); t=p['task']['task_type']; "
            "out={'fields':{'company':'Example Corp','role':'Backend Engineer','location':'Madrid','salary_expectation':'60000','keywords':['Python','Event Sourcing'],'pitch':'Relevant backend experience','valuation':8}} "
            "if t=='field_inference' else {'result':'ok'}; print(json.dumps(out))"
        )
        self.write_config(storage, automatic=["field_inference"], command=[sys.executable, "-c", script])
        service = IntakeService(storage)
        result = service.create_from_offer("Backend role in Madrid")
        TaskRunner(storage).run(result["tasks"][0]["id"])
        keyword_tasks = service.create_missing_keyword_tasks(result["candidature"]["id"])

        with connect(storage) as conn:
            candidature = get_application(conn, result["candidature"]["id"])
            stored_tasks = list_tasks(conn, application_id=result["candidature"]["id"])
            glossary = {item["term"]: item["definition"] for item in list_glossary(conn)}

        self.assertEqual(candidature["company"], "Example Corp")
        self.assertEqual(candidature["role"], "Backend Engineer")
        self.assertIn("Event Sourcing", candidature["keywords"])
        self.assertEqual({task["context_hint"] for task in keyword_tasks}, {"keyword:Python", "keyword:Event Sourcing"})
        self.assertTrue(all(glossary[term] == "" for term in ("Python", "Event Sourcing")))
        self.assertIn("completed", {task["state"] for task in stored_tasks})


if __name__ == "__main__":
    unittest.main()
