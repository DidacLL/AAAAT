import ast
import tomllib
import unittest
from pathlib import Path


class DependencyPolicyTests(unittest.TestCase):
    def test_no_runtime_dependencies_or_provider_sdks(self):
        root = Path(__file__).resolve().parent.parent
        project = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
        self.assertEqual(project["project"].get("dependencies"), [])

        banned_imports = {
            "openai",
            "anthropic",
            "google.generativeai",
            "google.genai",
            "boto3",
            "fastapi",
            "flask",
            "django",
            "react",
        }
        imported = set()
        for path in (root / "aaaat").glob("*.py"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    imported.update(alias.name for alias in node.names)
                elif isinstance(node, ast.ImportFrom) and node.module:
                    imported.add(node.module)
        self.assertTrue(banned_imports.isdisjoint(imported), imported & banned_imports)

    def test_cli_has_no_runtime_git_dependency(self):
        root = Path(__file__).resolve().parent.parent
        cli_source = (root / "aaaat" / "cli.py").read_text(encoding="utf-8").lower()
        self.assertNotIn("git ", cli_source)
        self.assertNotIn("subprocess", cli_source)
        self.assertNotIn("gitpython", cli_source)


if __name__ == "__main__":
    unittest.main()
