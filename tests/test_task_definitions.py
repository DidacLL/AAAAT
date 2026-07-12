import json
import tempfile
import unittest
from pathlib import Path

from aaaat.candidatures import create_candidature
from aaaat.db import connect, init_db, set_profile_variable
from aaaat.dispatch.packet import build_task_packet
from aaaat.task_definitions import (
    TaskDefinitionError,
    get_task_definition,
    reset_task_definition,
    save_editable_template,
    save_task_definition,
)
from aaaat.ui_desktop.agent_workflow import DesktopAgentWorkflowError, DesktopAgentWorkflowService


class VersionedTaskDefinitionWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        init_db(self.tmp.name)
        with connect(self.tmp.name) as conn:
            set_profile_variable(conn, "profile.display_name", "Ada Example")
            self.candidature = create_candidature(
                conn,
                company="Definition Co",
                role="Platform Engineer",
                raw_offer="Platform role",
            )
            self.other_candidature = create_candidature(
                conn,
                company="Second Definition Co",
                role="Backend Engineer",
                raw_offer="Backend role",
            )
        self.service = DesktopAgentWorkflowService(self.tmp.name)

    def result_file(self, name, payload):
        path = Path(self.tmp.name) / name
        path.write_text(json.dumps(payload), encoding="utf-8")
        return path

    @staticmethod
    def definition_version(packet):
        return packet["output_contract"]["task_definition_version"]

    def test_existing_task_keeps_snapshot_when_global_definition_changes(self):
        first = self.service.create_task(self.candidature["id"], "company_research")
        first_packet_before = self.service.export_packet(first["id"])
        before = json.loads(first_packet_before.read_text(encoding="utf-8"))

        with connect(self.tmp.name) as conn:
            saved = save_task_definition(
                conn,
                "company_research",
                {
                    "title": "Investigate employer",
                    "instructions": "Return company research plus a compact engineering-culture briefing.",
                    "response_format": {
                        "type": "json_object",
                        "required": ["company_research", "employer_brief"],
                        "schema": {
                            "company_research": "string",
                            "employer_brief": "string",
                        },
                    },
                    "artifact_template": "",
                    "artifact_mapping": {},
                },
            )

        second = self.service.create_task(self.other_candidature["id"], "company_research")
        with connect(self.tmp.name) as conn:
            first_packet_after = build_task_packet(conn, first["task_handle"])
            second_packet = build_task_packet(conn, second["task_handle"])

        self.assertEqual(saved["version"], 2)
        self.assertEqual(self.definition_version(before), 1)
        self.assertEqual(self.definition_version(first_packet_after), 1)
        self.assertIn("company_research", first_packet_after["response_format"]["required"])
        self.assertEqual(self.definition_version(second_packet), 2)
        self.assertEqual(second_packet["title"], "Investigate employer")
        self.assertIn("employer_brief", second_packet["response_format"]["required"])
        self.assertEqual(second_packet["allowed_actions"], ["context", "submit"])
        self.assertFalse(second_packet["callback_instructions"]["auto_apply"])

        self.service.submit_result_file(
            first["id"],
            self.result_file("first.json", {"company_research": "Original contract result"}),
        )
        with self.assertRaises(DesktopAgentWorkflowError):
            self.service.submit_result_file(
                second["id"],
                self.result_file("second-wrong.json", {"company_research": "Missing custom field"}),
            )
        accepted = self.service.submit_result_file(
            second["id"],
            self.result_file(
                "second.json",
                {
                    "company_research": "Customized contract result",
                    "employer_brief": "Engineering culture summary",
                },
            ),
        )
        self.assertEqual(accepted["definition_version"], 2)

    def test_custom_cover_letter_contract_mapping_and_template_render_together(self):
        with connect(self.tmp.name) as conn:
            save_editable_template(
                conn,
                "cover-letter",
                "LETTER FOR {{ application.company }}\n{{ artifact.cover_letter.opening }}\nEND",
                ["application.company", "artifact.cover_letter.opening"],
            )
            definition = save_task_definition(
                conn,
                "draft_cover_letter",
                {
                    "title": "Draft concise introduction",
                    "instructions": "Return only a short customized opening paragraph.",
                    "response_format": {
                        "type": "json_object",
                        "required": ["opening_paragraph"],
                        "schema": {"opening_paragraph": "string"},
                    },
                    "artifact_template": "cover-letter",
                    "artifact_mapping": {"opening_paragraph": "artifact.cover_letter.opening"},
                },
            )

        task = self.service.create_task(self.candidature["id"], "draft_cover_letter")
        packet_path = self.service.export_packet(task["id"])
        packet = json.loads(packet_path.read_text(encoding="utf-8"))
        self.assertEqual(self.definition_version(packet), definition["version"])
        self.assertEqual(
            packet["output_contract"]["artifact"]["variable_mapping"],
            {"opening_paragraph": "artifact.cover_letter.opening"},
        )

        self.service.submit_result_file(
            task["id"],
            self.result_file("custom-cover.json", {"opening_paragraph": "A focused custom opening."}),
        )
        rendered = self.service.render_cover_letter(task["id"])
        rendered_text = Path(rendered["artifact"]["tex_path"]).read_text(encoding="utf-8")
        self.assertIn("LETTER FOR Definition Co", rendered_text)
        self.assertIn("A focused custom opening.", rendered_text)

    def test_reset_restores_default_for_future_tasks_without_changing_old_snapshot(self):
        with connect(self.tmp.name) as conn:
            save_task_definition(
                conn,
                "company_research",
                {
                    "title": "Custom research",
                    "instructions": "Return the normal research plus custom_research.",
                    "response_format": {
                        "type": "json_object",
                        "required": ["company_research", "custom_research"],
                        "schema": {
                            "company_research": "string",
                            "custom_research": "string",
                        },
                    },
                    "artifact_template": "",
                    "artifact_mapping": {},
                },
            )
        customized = self.service.create_task(self.candidature["id"], "company_research")

        with connect(self.tmp.name) as conn:
            reset = reset_task_definition(conn, "company_research")
        default_task = self.service.create_task(self.other_candidature["id"], "company_research")

        with connect(self.tmp.name) as conn:
            customized_packet = build_task_packet(conn, customized["task_handle"])
            default_packet = build_task_packet(conn, default_task["task_handle"])
            effective = get_task_definition(conn, "company_research")

        self.assertFalse(reset["is_custom"])
        self.assertFalse(effective["is_custom"])
        self.assertIn("custom_research", customized_packet["response_format"]["required"])
        self.assertNotIn("custom_research", default_packet["response_format"]["required"])
        self.assertIn("company_research", default_packet["response_format"]["required"])

    def test_definition_rejects_mapping_to_unknown_result_field(self):
        with connect(self.tmp.name) as conn:
            with self.assertRaises(TaskDefinitionError):
                save_task_definition(
                    conn,
                    "draft_cover_letter",
                    {
                        "title": "Invalid mapping",
                        "instructions": "Return body.",
                        "response_format": {
                            "type": "json_object",
                            "required": ["body"],
                            "schema": {"body": "string"},
                        },
                        "artifact_template": "cover-letter",
                        "artifact_mapping": {"missing": "artifact.cover_letter.body"},
                    },
                )

    def test_definition_cannot_remove_field_required_by_deterministic_apply(self):
        with connect(self.tmp.name) as conn:
            with self.assertRaises(TaskDefinitionError):
                save_task_definition(
                    conn,
                    "company_research",
                    {
                        "title": "Unsafe rename",
                        "instructions": "Return employer_brief.",
                        "response_format": {
                            "type": "json_object",
                            "required": ["employer_brief"],
                            "schema": {"employer_brief": "string"},
                        },
                        "artifact_template": "",
                        "artifact_mapping": {},
                    },
                )


if __name__ == "__main__":
    unittest.main()
