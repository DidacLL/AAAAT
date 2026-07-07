import tempfile
import unittest
import re
from pathlib import Path

from aaaat.static_export import export_static_demo


class StaticExportTests(unittest.TestCase):
    def test_static_demo_uses_fake_payload_without_write_controls(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "demo.html"
            export_static_demo(output)
            html = output.read_text(encoding="utf-8")

        self.assertIn("Northstar Systems", html)
        self.assertIn("Demo company with fake data", html)
        self.assertNotIn("Raw intake", html)
        self.assertNotIn("data-write-control", html)
        self.assertNotIn("Render local template", html)
        self.assertNotIn("Queue agent draft", html)
        self.assertNotIn(".private", html)
        self.assertNotIn("{{", html)
        self.assertNotRegex(html, re.compile(r"[\w.+-]+@[\w.-]+"))
        self.assertNotRegex(html, re.compile(r"\+?\d[\d\s().-]{7,}\d"))


if __name__ == "__main__":
    unittest.main()
