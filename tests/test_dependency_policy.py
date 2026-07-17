import json
import subprocess
import sys
import tomllib
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class DependencyPolicyTests(unittest.TestCase):
    def run_probe(self, code: str) -> dict:
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_project_metadata_keeps_core_dependency_free_and_wx_optional(self):
        project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]
        self.assertEqual(project["name"], "aaaat")
        self.assertEqual(project.get("dependencies", []), [])
        desktop = project.get("optional-dependencies", {}).get("desktop", [])
        self.assertTrue(any(item.startswith("wxPython") for item in desktop))
        metadata = "\n".join([*project.get("dependencies", []), *desktop]).lower()
        self.assertNotIn("openai", metadata)
        self.assertNotIn("anthropic", metadata)

    def test_core_and_desktop_projection_import_without_optional_wx(self):
        observed = self.run_probe(
            "import importlib, json, sys; "
            "importlib.import_module('aaaat.cli'); "
            "app = importlib.import_module('aaaat.ui_desktop.app'); "
            "print(json.dumps({'callable': callable(app.build_desktop_projection), "
            "'wx_loaded': any(n == 'wx' or n.startswith('wx.') for n in sys.modules)}))"
        )
        self.assertTrue(observed["callable"])
        self.assertFalse(observed["wx_loaded"])

    def test_agent_descriptor_import_does_not_pull_desktop_adapter(self):
        observed = self.run_probe(
            "import importlib, json, sys; "
            "importlib.import_module('aaaat.mcp_server'); "
            "print(json.dumps({'desktop_loaded': any(n.startswith('aaaat.ui_desktop') for n in sys.modules)}))"
        )
        self.assertFalse(observed["desktop_loaded"])


if __name__ == "__main__":
    unittest.main()
