import re
import tempfile
import unittest
from pathlib import Path

from aaaat.static_export import export_static_demo


class StaticExportTests(unittest.TestCase):
    def test_static_demo_is_self_contained_fake_and_non_mutating(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "demo.html"
            result = export_static_demo(output)
            html = output.read_text(encoding="utf-8")

        self.assertTrue(output.exists())
        self.assertEqual(Path(result), output)
        self.assertGreater(len(html), 500)
        self.assertNotIn("data-write-control", html)
        self.assertNotIn(".private", html)
        self.assertNotIn("{{", html)
        self.assertNotRegex(html, re.compile(r"[\w.+-]+@[\w.-]+"))
        self.assertNotRegex(html, re.compile(r"\+?\d[\d\s().-]{7,}\d"))


if __name__ == "__main__":
    unittest.main()
