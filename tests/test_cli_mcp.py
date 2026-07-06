import subprocess
import sys
import tempfile
import unittest

from aaaat.mcp_server import mcp_descriptor, validate_descriptor


class CliMcpTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "-m", "aaaat.cli", *args],
            text=True,
            capture_output=True,
            check=True,
        )

    def test_cli_basic_commands_work(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.run_cli("--storage", tmp, "init")
            created = self.run_cli("--storage", tmp, "app", "create", "--company", "Demo Co", "--role", "Engineer")
            self.assertIn("Demo Co", created.stdout)
            listed = self.run_cli("--storage", tmp, "app", "list")
            self.assertIn("Engineer", listed.stdout)
            guide = self.run_cli("agent-guide")
            self.assertIn("AAAAT", guide.stdout)

    def test_mcp_descriptor_validates(self):
        descriptor = mcp_descriptor()
        self.assertTrue(validate_descriptor(descriptor))
        self.assertIn("tools", descriptor["capabilities"])


if __name__ == "__main__":
    unittest.main()
