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

            packet = json.loads(self.run_cli("--storage", tmp, "agent", "packet", task["id"]).stdout)
            self.assertEqual(packet["task"]["id"], task["id"])
            self.assertEqual(packet["task"]["task_type"], "draft_cover_letter")
            self.assertEqual(packet["task"]["title"], "Draft Target Cover Letter")
            self.assertIn("instructions", packet)
            self.assertIn("context", packet)
            self.assertIn("expected_output", packet)
            self.assertIn("allowed_actions", packet)
            self.assertIn("callback_instructions", packet)
            self.assertFalse(packet["expected_output"]["auto_apply"])
            self.assertFalse(packet["callback_instructions"]["auto_apply"])

            packet_text = json.dumps(packet, sort_keys=True)
            self.assertIn("Target Co", packet_text)
            self.assertNotIn("Other Corp", packet_text)
            self.assertNotIn("UNRELATED CANDIDATURE SECRET", packet_text)
            self.assertNotIn("DENIED PROFILE SECRET", packet_text)
            self.assertNotIn("VARIABLE DUMP SECRET", packet_text)
            self.assertNotIn(str(tmp), packet_text)
            self.assertNotIn("aaaat.sqlite3", packet_text)
            for forbidden in (
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
                self.run_cli("--storage", tmp, "agent", "dispatch", task["id"], "--backend", "manual").stdout
            )
            outbox_path = Path(dispatch["packet_path"])
            self.assertEqual(dispatch["backend"], "manual")
            self.assertEqual(outbox_path, Path(tmp) / "agent_outbox" / f"{task['id']}.packet.json")
            self.assertTrue(outbox_path.exists())
            self.assertEqual(json.loads(outbox_path.read_text(encoding="utf-8")), dispatch["packet"])
            self.assertEqual(dispatch["packet"], packet)


if __name__ == "__main__":
    unittest.main()
