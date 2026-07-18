import importlib.resources
import subprocess
import sys
import tempfile
import tomllib
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class ReleaseEngineeringTests(unittest.TestCase):
    def test_mcp_module_help_executes_successfully(self):
        result = subprocess.run(
            [sys.executable, "-m", "aaaat.mcp_runtime", "--help"],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(result.stdout.strip())


    def test_runtime_and_distribution_versions_match_v1(self):
        from aaaat import __version__

        project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        self.assertEqual(__version__, "1.0.0")
        self.assertEqual(project["project"]["version"], __version__)

    def test_distribution_metadata_identifies_license_repository_and_normal_commands(self):
        project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        classifiers = project["project"]["classifiers"]
        project_urls = project["project"]["urls"]
        console_scripts = project["project"]["scripts"]

        self.assertIn(
            "License :: OSI Approved :: GNU General Public License v3 or later (GPLv3+)",
            classifiers,
        )
        self.assertEqual(project_urls["Repository"], "https://github.com/DidacLL/AAAAT")
        self.assertEqual(set(console_scripts), {"aaaat-desktop", "aaaat-host-bridge"})


    def test_desktop_projection_initializes_clean_local_storage(self):
        from aaaat.ui_desktop.app import build_desktop_projection

        with tempfile.TemporaryDirectory() as tmp:
            projection = build_desktop_projection(tmp)
            self.assertIsInstance(projection, dict)
            self.assertTrue((Path(tmp) / "aaaat.sqlite3").exists())

    def test_runtime_schema_resource_is_available(self):
        package_root = importlib.resources.files("aaaat")
        schema = package_root / "schema.sql"
        self.assertTrue(schema.is_file())

    def test_desktop_entry_module_imports_without_optional_dependency(self):
        from aaaat.ui_desktop import app

        self.assertTrue(callable(app.main))
        self.assertTrue(callable(app.build_desktop_projection))


if __name__ == "__main__":
    unittest.main()
