from __future__ import annotations

import importlib.util
import os
import sys
import tomllib
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "build_release.py"
SPEC = importlib.util.spec_from_file_location("aaaat_build_release", MODULE_PATH)
assert SPEC and SPEC.loader
build_release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(build_release)


class ReleaseBuilderTests(unittest.TestCase):
    def test_normal_package_exposes_only_desktop_and_paired_bridge_commands(self) -> None:
        pyproject = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        scripts = pyproject["project"]["scripts"]
        self.assertEqual(
            scripts,
            {
                "aaaat-desktop": "aaaat.ui_desktop.app:main",
                "aaaat-host-bridge": "aaaat.host_bridge:main",
            },
        )
        serialized = " ".join(scripts)
        for forbidden in ("aaaat-mcp", "aaaat-upgrade", "aaaat-seed", "aaaat-cli"):
            self.assertNotIn(forbidden, serialized)

    def test_bridge_build_keeps_required_runtime_and_package_data(self) -> None:
        with patch.object(build_release.subprocess, "run") as run:
            build_release._run_pyinstaller(
                entry=build_release.BRIDGE_ENTRY,
                name="aaaat-host-bridge",
                dist_path=Path("dist"),
                work_path=Path("work"),
                windowed=False,
                collect_wx=False,
            )

        command = run.call_args.args[0]
        serialized = " ".join(str(item) for item in command)
        self.assertEqual(command[:3], [sys.executable, "-m", "PyInstaller"])
        self.assertIn("--console", command)
        self.assertNotIn("--exclude-module", command)
        self.assertNotIn("--collect-all", command)
        self.assertIn(str(build_release.PACKAGE / "schema.sql"), serialized)
        self.assertIn(str(build_release.PACKAGE / "host_runtime_skill.md"), serialized)
        self.assertIn(str(build_release.BRIDGE_ENTRY), command)
        run.assert_called_once()

    def test_desktop_build_collects_wx_and_uses_the_same_data_contract(self) -> None:
        with patch.object(build_release.subprocess, "run") as run:
            build_release._run_pyinstaller(
                entry=build_release.DESKTOP_ENTRY,
                name="AAAAT",
                dist_path=Path("dist"),
                work_path=Path("work"),
                windowed=True,
                collect_wx=True,
            )

        command = run.call_args.args[0]
        self.assertIn("--windowed", command)
        self.assertIn("--collect-all", command)
        self.assertIn("wx", command)
        self.assertIn(str(build_release.DESKTOP_ENTRY), command)

    def test_add_data_uses_the_current_platform_separator(self) -> None:
        with patch.object(build_release.subprocess, "run") as run:
            build_release._run_pyinstaller(
                entry=build_release.BRIDGE_ENTRY,
                name="bridge",
                dist_path=Path("dist"),
                work_path=Path("work"),
                windowed=False,
                collect_wx=False,
            )

        command = run.call_args.args[0]
        values = [command[index + 1] for index, value in enumerate(command[:-1]) if value == "--add-data"]
        self.assertEqual(len(values), 2)
        self.assertTrue(all(f"{os.pathsep}aaaat" in value for value in values))

    def test_user_readme_requires_no_console_setup(self) -> None:
        text = build_release._user_readme()
        self.assertIn("Open AAAAT", text)
        self.assertIn("Connect my AI", text)
        self.assertNotIn("python", text.lower())
        self.assertNotIn("terminal", text.lower())
        self.assertNotIn("database", text.lower())


if __name__ == "__main__":
    unittest.main()
