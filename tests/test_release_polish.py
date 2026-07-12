import importlib.resources
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

    def test_cli_can_initialize_clean_local_storage_without_git(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                [sys.executable, "-m", "aaaat.cli", "init", "--storage", tmp],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                env={"PATH": ""},
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((Path(tmp) / "aaaat.sqlite3").exists())

    def test_runtime_package_resources_are_available(self):
        package_root = importlib.resources.files("aaaat")
        required = [
            package_root / "schema.sql",
            package_root / "templates_ui",
            package_root / "static",
        ]
        for resource in required:
            with self.subTest(resource=str(resource)):
                self.assertTrue(resource.is_file() or resource.is_dir())

    def test_desktop_entry_module_imports_without_optional_dependency(self):
        from aaaat.ui_desktop import app

        self.assertTrue(callable(app.main))
        self.assertTrue(callable(app.build_desktop_projection))


if __name__ == "__main__":
    unittest.main()
