import tomllib
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class ReleasePolishTests(unittest.TestCase):
    def test_local_launchers_exist_and_use_python_module(self):
        launchers = {
            "launchers/open-aaaat.sh": {"read_only": False},
            "launchers/open-aaaat-read-only.sh": {"read_only": True},
            "launchers/Open AAAAT.cmd": {"read_only": False},
            "launchers/Open AAAAT Read Only.cmd": {"read_only": True},
        }
        for relative_path, expected in launchers.items():
            with self.subTest(relative_path=relative_path):
                content = (ROOT / relative_path).read_text(encoding="utf-8").lower()
                self.assertIn("-m aaaat.cli", content)
                self.assertIn("launch", content)
                self.assertNotIn("git ", content)
                self.assertNotIn("git.exe", content)
                if expected["read_only"]:
                    self.assertIn("--read-only", content)
                else:
                    self.assertNotIn("--read-only", content)

    def test_unix_launchers_pass_extra_arguments(self):
        for relative_path in ("launchers/open-aaaat.sh", "launchers/open-aaaat-read-only.sh"):
            with self.subTest(relative_path=relative_path):
                content = (ROOT / relative_path).read_text(encoding="utf-8")
                self.assertIn('"$@"', content)
                self.assertIn("python3", content)

    def test_windows_launchers_pass_extra_arguments(self):
        for relative_path in ("launchers/Open AAAAT.cmd", "launchers/Open AAAAT Read Only.cmd"):
            with self.subTest(relative_path=relative_path):
                content = (ROOT / relative_path).read_text(encoding="utf-8")
                self.assertIn("%*", content)
                self.assertIn("python", content.lower())

    def test_package_data_includes_runtime_assets(self):
        pyproject = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        package_data = set(pyproject["tool"]["setuptools"]["package-data"]["aaaat"])
        self.assertIn("schema.sql", package_data)
        self.assertIn("static/*", package_data)
        self.assertIn("templates_ui/*.html", package_data)
        self.assertIn("templates_ui/partials/*.html", package_data)
        self.assertIn("templates_ui/assets/*", package_data)

    def test_docs_reference_local_launchers(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        install_doc = (ROOT / "docs" / "install.md").read_text(encoding="utf-8")
        release_doc = (ROOT / "docs" / "release-checklist.md").read_text(encoding="utf-8")
        combined = "\n".join([readme, install_doc, release_doc])
        self.assertIn("launchers/open-aaaat.sh", combined)
        self.assertIn("launchers/open-aaaat-read-only.sh", combined)
        self.assertIn("Open AAAAT.cmd", combined)
        self.assertIn("Open AAAAT Read Only.cmd", combined)
        self.assertIn("do not require Git", combined)


if __name__ == "__main__":
    unittest.main()
