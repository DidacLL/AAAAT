import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class DispatchTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "-B", "-m", "aaaat.cli", *args],
            text=True,
            capture_output=True,
            check=True,
        )

    def test_agent_packet_stdout_and_manual_outbox_are_narrow(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            target = json.loads(
                self.run_cli("--storage", tmp, "app", "create", "--company", "Target Co", "--role", "Backend Engineer").stdout
            )
            other = json.loads(
                self.run_cli("--storage", tmp, "app", "create", "--company", "Other Corp", "--role", "Data Engineer").stdout
            )
            self.run_cli("--storage", tmp, "intake", "add", target["id"], "--content", "Target-only offer material")
            self.run_cli("--storage", tmp, "intake", "add", other["id"], "--content", "UNRELATED CANDIDATURE SECRET")
            self.run_cli(
                "--storage",
                tmp,
                "profile",
                "fact",
                "add",
                "--type",
                "experience",
                "--title",
                "Denied profile fact",
                "--body",
                "DENIED PROFILE SECRET",
                "--exposure",
                "denied",
                "--use-for-cover-letter",
            )
            self.run_cli(
                "--storage",
                tmp,
                "variable",
                "set",
                "profile.secret",
                "VARIABLE DUMP SECRET",
                "--exposure",
                "denied",
            )
            task = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "task",
                    "create",
                    "--application-id",
                    target["id"],
                    "--type",
                    "draft_cover_letter",
                    "--title",
                    "Draft Target Cover Letter",
                    "--instructions",
                    "Write a concise draft for review.",
                    "--context-hint",
                    "artifact:cover_letter",
                ).stdout
            )
            task_handle = json.loads(self.run_cli("--storage", tmp, "agent", "next").stdout)["task"]["task_handle"]
            self.assertTrue(task_handle.startswith("taskh_"))
            self.assertNotEqual(task_handle, task["id"])

            packet = json.loads(self.run_cli("--storage", tmp, "agent", "packet", task_handle).stdout)
            self.assertEqual(packet["task_handle"], task_handle)
            self.assertNotIn("task", packet)
            self.assertEqual(packet["task_type"], "draft_cover_letter")
            self.assertEqual(packet["title"], "Draft Target Cover Letter")
            self.assertIn("instructions", packet)
            self.assertIn("input_context", packet)
            self.assertIn("output_contract", packet)
            self.assertIn("response_format", packet)
            self.assertIn("allowed_actions", packet)
            self.assertIn("privacy_notes", packet)
            self.assertIn("callback_instructions", packet)
            self.assertFalse(packet["output_contract"]["auto_apply_by_agent"])
            self.assertFalse(packet["output_contract"]["entity_ids_allowed"])
            self.assertFalse(packet["callback_instructions"]["auto_apply"])

            packet_text = json.dumps(packet, sort_keys=True)
            self.assertIn("Target Co", packet_text)
            self.assertNotIn(task["id"], packet_text)
            self.assertNotIn("Other Corp", packet_text)
            self.assertNotIn("UNRELATED CANDIDATURE SECRET", packet_text)
            self.assertNotIn("DENIED PROFILE SECRET", packet_text)
            self.assertNotIn("VARIABLE DUMP SECRET", packet_text)
            self.assertNotIn(str(tmp), packet_text)
            self.assertNotIn("aaaat.sqlite3", packet_text)
            for forbidden in (
                "application_id",
                "candidature_id",
                "profile_fact_id",
                "artifact_id",
                "note_id",
                "todo_id",
                "blob_id",
                "file_path",
                "storage_path",
                "dashboard-payload",
                "dashboard_payload",
                "list_applications",
                "/api/applications",
                "/api/dashboard",
                "/api/search",
                "/api/variables",
                "/api/profile",
                "generic_crud",
                "dump_variables",
                "profile_dump",
            ):
                self.assertNotIn(forbidden, packet_text.lower())

            dispatch = json.loads(
                self.run_cli("--storage", tmp, "agent", "dispatch", task_handle, "--backend", "manual").stdout
            )
            outbox_path = Path(dispatch["packet_path"])
            self.assertEqual(dispatch["backend"], "manual")
            self.assertEqual(dispatch["task_handle"], task_handle)
            self.assertNotIn("task_id", dispatch)
            self.assertEqual(dispatch["packet_version"], packet["packet_version"])
            self.assertNotIn("packet", dispatch)
            dispatch_text = json.dumps(dispatch, sort_keys=True)
            self.assertNotIn("Target Co", dispatch_text)
            self.assertNotIn("Write a concise draft for review.", dispatch_text)
            self.assertEqual(outbox_path, Path(tmp) / "agent_outbox" / f"{task_handle}.packet.json")
            self.assertTrue(outbox_path.exists())
            self.assertEqual(json.loads(outbox_path.read_text(encoding="utf-8")), packet)


if __name__ == "__main__":
    unittest.main()
