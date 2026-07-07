from __future__ import annotations

import importlib.util
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
GUARD_PATH = ROOT / "tools" / "repo_guard.py"

spec = importlib.util.spec_from_file_location("repo_guard", GUARD_PATH)
repo_guard = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(repo_guard)


def run_git(root: Path, *args: str) -> None:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)


class RepoGuardTests(unittest.TestCase):
    def test_current_repository_satisfies_guard(self):
        if not shutil.which("git"):
            self.skipTest("git is required for repository guard tests")
        self.assertEqual(repo_guard.collect_findings(ROOT), [])

    def test_clean_temporary_repository_passes_guard(self):
        if not shutil.which("git"):
            self.skipTest("git is required for repository guard tests")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            run_git(root, "init")
            (root / ".gitignore").write_text("\n".join(sorted(repo_guard.REQUIRED_GITIGNORE_LINES)) + "\n", encoding="utf-8")
            (root / "README.md").write_text("demo\n", encoding="utf-8")
            run_git(root, "add", ".")
            self.assertEqual(repo_guard.collect_findings(root), [])

    def test_temporary_repository_fails_when_local_or_generated_files_are_tracked(self):
        if not shutil.which("git"):
            self.skipTest("git is required for repository guard tests")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            run_git(root, "init")
            (root / ".gitignore").write_text("\n".join(sorted(repo_guard.REQUIRED_GITIGNORE_LINES)) + "\n", encoding="utf-8")
            tracked_payloads = {
                root / ".private" / "store.sqlite3": "schema only\n",
                root / "state" / "cache.db": "local db\n",
                root / "pkg" / "__pycache__" / "module.pyc": "bytecode\n",
            }
            for path, content in tracked_payloads.items():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
            run_git(root, "add", "-f", ".")
            findings = repo_guard.collect_findings(root)
            self.assertTrue(findings)
            joined = "\n".join(findings)
            self.assertIn("private local storage", joined)
            self.assertIn("sqlite database", joined)
            self.assertIn("python cache directory", joined)

    def test_temporary_repository_fails_when_gitignore_rules_are_missing(self):
        if not shutil.which("git"):
            self.skipTest("git is required for repository guard tests")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            run_git(root, "init")
            (root / ".gitignore").write_text("*.tmp\n", encoding="utf-8")
            run_git(root, "add", ".gitignore")
            findings = repo_guard.collect_findings(root)
            self.assertTrue(any("Missing required .gitignore rules" in item for item in findings))


if __name__ == "__main__":
    unittest.main()
