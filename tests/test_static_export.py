import tempfile
import unittest
from pathlib import Path

from aaaat.static_export import export_static_demo


class StaticExportTests(unittest.TestCase):
    def test_static_demo_uses_fake_payload_without_write_controls(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "demo.html"
            export_static_demo(output)
            html = output.read_text(encoding="utf-8")

        self.assertIn("Northstar Systems", html)
        self.assertIn("Fake demo application", html)
        self.assertNotIn("Raw intake", html)
        self.assertNotIn("data-write-control", html)
        self.assertNotIn(".private", html)


if __name__ == "__main__":
    unittest.main()
