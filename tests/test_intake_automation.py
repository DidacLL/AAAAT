import json
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.candidatures import get_candidature
from aaaat.db import connect, init_db, set_profile_variable
from aaaat.generation_policy import (
    DEFAULT_GENERATION_TASKS,
    default_generation_tasks,
    save_default_generation_tasks,
)
from aaaat.tasks import list_tasks
from aaaat.ui_desktop.intake_automation import IntakeAutomationService


class IntakeAutomationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        init_db(self.tmp.name)
        self.service = IntakeAutomationService(self.tmp.name)

    def write_runner(self, source: str) -> str:
        path = Path(self.tmp.name) / "runner.py"
        path.write_text(source, encoding="utf-8")
        return f'"{sys.executable}" "{path}"'

    def test_default_policy_prepares_one_bundle_for_new_offer(self):
        result = self.service.create_from_offer("Backend Engineer at Example Co using Python")

        with connect(self.tmp.name) as conn:
            tasks = list_tasks(conn, application_id=result["candidature"]["id"])

        self.assertEqual(result["configured"], list(DEFAULT_GENERATION_TASKS))
        self.assertFalse(result["connection_configured"])
        self.assertEqual(set(result["pending"]), set(DEFAULT_GENERATION_TASKS))
        self.assertEqual({task["task_type"] for task in tasks}, set(DEFAULT_GENERATION_TASKS))

    def test_policy_controls_which_tasks_are_created_for_future_offers(self):
        with connect(self.tmp.name) as conn:
            save_default_generation_tasks(conn, ["field_inference", "company_research"])
            self.assertEqual(
                default_generation_tasks(conn),
                ["field_inference", "company_research"],
            )

        result = self.service.create_from_offer("Data role at Policy Co")
        with connect(self.tmp.name) as conn:
            tasks = list_tasks(conn, application_id=result["candidature"]["id"])

        self.assertEqual(
            [task["task_type"] for task in tasks],
            ["field_inference", "company_research"],
        )

    def test_configured_ai_runs_and_applies_intake_bundle_automatically(self):
        command = self.write_runner(
            "import json, sys\n"
            "packet = json.load(sys.stdin)\n"
            "task_type = packet['task_type']\n"
            "if task_type == 'field_inference':\n"
            "    result = {'fields': {'company': 'Automatic Co', 'role': 'Platform Engineer'}}\n"
            "elif task_type == 'company_research':\n"
            "    result = {'company_research': 'Automatically researched company.'}\n"
            "else:\n"
            "    raise SystemExit(4)\n"
            "json.dump(result, sys.stdout)\n"
        )
        with connect(self.tmp.name) as conn:
            save_default_generation_tasks(conn, ["field_inference", "company_research"])
            set_profile_variable(conn, "agent.command", command)

        result = self.service.create_from_offer("Platform role at Automatic Co")
        with connect(self.tmp.name) as conn:
            candidature = get_candidature(conn, result["candidature"]["id"])

        self.assertEqual(
            result["completed"],
            ["field_inference", "company_research"],
        )
        self.assertEqual(candidature["company"], "Automatic Co")
        self.assertEqual(candidature["role"], "Platform Engineer")
        self.assertEqual(
            candidature["company_research"],
            "Automatically researched company.",
        )

    def test_one_failed_generation_does_not_rollback_candidature_or_other_tasks(self):
        command = self.write_runner(
            "import json, sys\n"
            "packet = json.load(sys.stdin)\n"
            "if packet['task_type'] == 'field_inference':\n"
            "    json.dump({'fields': {'role': 'Recovered role'}}, sys.stdout)\n"
            "else:\n"
            "    sys.stderr.write('research unavailable')\n"
            "    raise SystemExit(5)\n"
        )
        with connect(self.tmp.name) as conn:
            save_default_generation_tasks(conn, ["field_inference", "company_research"])
            set_profile_variable(conn, "agent.command", command)

        result = self.service.create_from_offer("A role that must remain saved")
        with connect(self.tmp.name) as conn:
            candidature = get_candidature(conn, result["candidature"]["id"])
            tasks = list_tasks(conn, application_id=result["candidature"]["id"])

        self.assertEqual(candidature["role"], "Recovered role")
        self.assertIn("company_research", result["failed"])
        self.assertEqual(len(tasks), 2)
        failed = next(task for task in tasks if task["task_type"] == "company_research")
        self.assertIn("Automatic generation failed", failed["notes"])


if __name__ == "__main__":
    unittest.main()
