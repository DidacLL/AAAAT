import importlib.metadata
import importlib.resources
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class ReleaseEngineeringTests(unittest.TestCase):
    def test_cli_module_help_executes_successfully(self):
        result = subprocess.run(
            [sys.executable, "-m", "aaaat.cli", "--help"],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(result.stdout.strip())

    def test_upgrade_module_help_executes_successfully(self):
        result = subprocess.run(
            [sys.executable, "-m", "aaaat.upgrade", "--help"],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Upgrade an existing local AAAAT SQLite store", result.stdout)

    def test_runtime_and_distribution_versions_match_v1(self):
        from aaaat import __version__

        self.assertEqual(__version__, "1.0.0")
        self.assertEqual(importlib.metadata.version("aaaat"), __version__)

    def test_distribution_metadata_identifies_license_repository_and_commands(self):
        metadata = importlib.metadata.metadata("aaaat")
        classifiers = metadata.get_all("Classifier") or []
        project_urls = metadata.get_all("Project-URL") or []
        console_scripts = {
            item.name
            for item in importlib.metadata.entry_points(group="console_scripts")
            if item.value.startswith("aaaat.")
        }

        self.assertIn(
            "License :: OSI Approved :: GNU General Public License v3 or later (GPLv3+)",
            classifiers,
        )
        self.assertIn("Repository, https://github.com/DidacLL/AAAAT", project_urls)
        self.assertTrue(
            {"aaaat", "aaaat-desktop", "aaaat-upgrade", "aaaat-seed-desktop-demo"}.issubset(console_scripts)
        )

    def test_cli_can_initialize_clean_local_storage_without_git(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = dict(os.environ)
            env["PATH"] = ""
            result = subprocess.run(
                [sys.executable, "-m", "aaaat.cli", "--storage", tmp, "init"],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                env=env,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
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
