import importlib
import sys
import tomllib
import unittest
from pathlib import Path


class DependencyPolicyTests(unittest.TestCase):
    def test_project_metadata_declares_a_small_core_dependency_set(self):
        root = Path(__file__).resolve().parent.parent
        project = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))["project"]

        self.assertEqual(project["name"], "aaaat")
        self.assertIsInstance(project.get("dependencies", []), list)
        self.assertNotIn("wxPython", "\n".join(project.get("dependencies", [])))
        self.assertIn("desktop", project.get("optional-dependencies", {}))

    def test_core_and_desktop_bootstrap_import_without_optional_wx(self):
        before = {name for name in sys.modules if name == "wx" or name.startswith("wx.")}
        self.assertEqual(before, set())

        importlib.import_module("aaaat.cli")
        desktop_app = importlib.import_module("aaaat.ui_desktop.app")

        self.assertTrue(callable(desktop_app.build_desktop_projection))
        self.assertFalse(any(name == "wx" or name.startswith("wx.") for name in sys.modules))

    def test_agent_runtime_import_does_not_pull_desktop_adapter(self):
        importlib.import_module("aaaat.server_fastapi")
        self.assertFalse(any(name.startswith("aaaat.ui_desktop") for name in sys.modules))


if __name__ == "__main__":
    unittest.main()
