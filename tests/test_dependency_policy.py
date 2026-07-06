import tomllib
import unittest
from pathlib import Path


class DependencyPolicyTests(unittest.TestCase):
    def test_pyproject_metadata_is_valid_when_dependencies_are_declared(self):
        root = Path(__file__).resolve().parent.parent
        project = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
        self.assertEqual(project["project"]["name"], "aaaat")
        self.assertIsInstance(project["project"].get("dependencies", []), list)

    def test_cli_has_no_runtime_git_dependency(self):
        root = Path(__file__).resolve().parent.parent
        cli_source = (root / "aaaat" / "cli.py").read_text(encoding="utf-8").lower()
        self.assertNotIn("git ", cli_source)
        self.assertNotIn("subprocess", cli_source)
        self.assertNotIn("gitpython", cli_source)


if __name__ == "__main__":
    unittest.main()
