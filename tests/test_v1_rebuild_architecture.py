import json
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.db import connect, get_schema_version, init_db
from aaaat.intake import IntakeService
from aaaat.task_registry import TASK_DEFINITIONS
from aaaat.task_workflow import TaskWorkflowError, TaskWorkflowService
from aaaat.workspace_config import (
    effective_task_snapshot,
    load_settings,
    save_settings,
    task_definitions_path,
    template_path,
    validate_workspace_config,
)


class V1RebuildArchitectureTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.storage = Path(self.tmp.name)
        init_db(self.storage)

    def runner(self, source: str) -> str:
        path = self.storage / "runner.py"
        path.write_text(source, encoding="utf-8")
        return f'"{sys.executable}" "{path}"'

    def test_init_creates_schema_and_explicit_workspace_files(self):
        with connect(self.storage) as conn:
            self.assertEqual(get_schema_version(conn), "2")
            columns = {row["name"] for row in conn.execute("PRAGMA table_info(tasks)").fetchall()}
        self.assertTrue({"definition_version", "response_format", "artifact_template", "artifact_mapping"} <= columns)
        self.assertTrue(task_definitions_path(self.storage).is_file())
        self.assertTrue(template_path(self.storage, "cv").is_file())
        self.assertTrue(template_path(self.storage, "cover-letter").is_file())
        validate_workspace_config(self.storage)

    def test_single_registry_drives_default_intake_plan(self):
        expected = {
            task_type
            for task_type, definition in TASK_DEFINITIONS.items()
            if definition.automatic_by_default
        }
        result = IntakeService(self.storage).create_from_offer("Platform engineer role at Example Co")
        self.assertEqual({task["task_type"] for task in result["tasks"]}, expected)
        self.assertFalse(result["agent_configured"])
        self.assertEqual(result["candidature"]["company"], "")
        self.assertEqual(result["candidature"]["role"], "")

    def test_task_snapshot_is_immutable_after_config_change(self):
        intake = IntakeService(self.storage).create_from_offer("Python role")
        task = next(item for item in intake["tasks"] if item["task_type"] == "company_research")
        original = effective_task_snapshot(self.storage, "company_research")
        document = json.loads(task_definitions_path(self.storage).read_text(encoding="utf-8"))
        document["overrides"]["company_research"] = {
            "version": 2,
            "title": "Custom company briefing",
            "instructions": "Return company_research and hiring_context.",
            "response_format": {
                "type": "json_object",
                "required": ["company_research", "hiring_context"],
                "schema": {"company_research": "string", "hiring_context": "string"},
            },
            "artifact_template": "",
            "artifact_mapping": {},
        }
        task_definitions_path(self.storage).write_text(json.dumps(document), encoding="utf-8")
        validate_workspace_config(self.storage)

        stored = TaskWorkflowService(self.storage).get_task(task["id"])
        self.assertEqual(stored["definition_version"], original["version"])
        self.assertEqual(stored["response_format"], original["response_format"])
        new_task = TaskWorkflowService(self.storage).create_task(
            intake["candidature"]["id"],
            "company_research",
            force_new=True,
        )
        self.assertEqual(new_task["definition_version"], 2)
        self.assertIn("hiring_context", new_task["response_format"]["required"])

    def test_configured_command_failure_blocks_and_retry_restores_queue(self):
        intake = IntakeService(self.storage).create_from_offer("Python role")
        task = next(item for item in intake["tasks"] if item["task_type"] == "company_research")
        settings = load_settings(self.storage)
        settings["agent_command"] = self.runner("import sys\nsys.stderr.write('failed')\nraise SystemExit(4)\n")
        save_settings(self.storage, settings)
        service = TaskWorkflowService(self.storage)
        with self.assertRaises(TaskWorkflowError):
            service.run_configured(task["id"])
        blocked = service.get_task(task["id"])
        self.assertEqual(blocked["state"], "blocked")
        self.assertIn("failed", blocked["notes"])
        self.assertEqual(service.retry(task["id"])["state"], "queued")

    def test_configured_result_is_validated_applied_and_uses_task_binding(self):
        intake = IntakeService(self.storage).create_from_offer("Python role")
        task = next(item for item in intake["tasks"] if item["task_type"] == "company_research")
        settings = load_settings(self.storage)
        settings["agent_command"] = self.runner(
            "import json, sys\n"
            "packet = json.load(sys.stdin)\n"
            "assert packet['task_type'] == 'company_research'\n"
            "json.dump({'company_research': 'Bounded company research'}, sys.stdout)\n"
        )
        save_settings(self.storage, settings)
        service = TaskWorkflowService(self.storage)
        suggested = service.run_configured(task["id"])
        self.assertEqual(suggested["review_state"], "suggested")
        service.apply(task["id"])
        with connect(self.storage) as conn:
            row = conn.execute("SELECT company_research FROM applications WHERE id = ?", (intake["candidature"]["id"],)).fetchone()
        self.assertEqual(row["company_research"], "Bounded company research")

    def test_document_task_renders_from_workspace_template(self):
        intake = IntakeService(self.storage).create_from_offer(
            "Python role at Example Co",
            company="Example Co",
            role="Python Engineer",
        )
        task = TaskWorkflowService(self.storage).create_task(
            intake["candidature"]["id"],
            "draft_cover_letter",
            force_new=True,
        )
        template_path(self.storage, "cover-letter").write_text(
            "CUSTOM {{ application.company }} -- {{ artifact.cover_letter.body }}",
            encoding="utf-8",
        )
        service = TaskWorkflowService(self.storage)
        service.submit_result(task["id"], {"cover_letter_body": "Generated body"})
        rendered = service.render_artifact(task["id"])
        text = Path(rendered["artifact"]["tex_path"]).read_text(encoding="utf-8")
        self.assertIn("CUSTOM", text)
        self.assertIn("Generated body", text)


if __name__ == "__main__":
    unittest.main()
