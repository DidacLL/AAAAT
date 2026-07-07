from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
GUARD_PATH = ROOT / "tools" / "repo_guard.py"

spec = importlib.util.spec_from_file_location("repo_guard", GUARD_PATH)
repo_guard = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(repo_guard)


class RepoGuardTests(unittest.TestCase):
    def test_forbidden_tracked_patterns_are_detected(self):
        findings = repo_guard.forbidden_tracked(
            [
                ".private/aaaat.sqlite3",
                "data/local.db",
                "aaaat/__pycache__/cli.cpython-313.pyc",
                "aaaat/server.py",
            ]
        )
        self.assertEqual(len(findings), 3)
        self.assertTrue(any("private local storage" in item for item in findings))
        self.assertTrue(any("sqlite database" in item for item in findings))
        self.assertTrue(any("python cache directory" in item for item in findings))

    def test_required_gitignore_rules_are_declared(self):
        required = repo_guard.REQUIRED_GITIGNORE_LINES
        self.assertIn(".private/", required)
        self.assertIn(".private/**", required)
        self.assertIn("*.sqlite3", required)
        self.assertIn("*.db", required)
        self.assertIn("__pycache__/", required)
        self.assertIn("*.py[cod]", required)


if __name__ == "__main__":
    unittest.main()
