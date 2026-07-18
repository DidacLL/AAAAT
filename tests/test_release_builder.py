from __future__ import annotations

import hashlib
import importlib.util
import os
import sys
import tempfile
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
VERIFY_MODULE_PATH = ROOT / "tools" / "verify_release.py"
VERIFY_SPEC = importlib.util.spec_from_file_location("aaaat_verify_release", VERIFY_MODULE_PATH)
assert VERIFY_SPEC and VERIFY_SPEC.loader
verify_release = importlib.util.module_from_spec(VERIFY_SPEC)
VERIFY_SPEC.loader.exec_module(verify_release)


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
        self.assertIn(str(build_release.PACKAGE / "SKILL.md"), serialized)
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

    def test_release_archive_gets_a_sha256_sidecar(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            archive = Path(temporary) / "AAAAT-test.zip"
            archive.write_bytes(b"verified release")

            checksum = build_release._write_checksum(archive)

            digest, filename = checksum.read_text(encoding="utf-8").split()
            self.assertEqual(digest, hashlib.sha256(b"verified release").hexdigest())
            self.assertEqual(filename, archive.name)


    def test_release_architecture_names_are_stable(self) -> None:
        aliases = {
            "amd64": "x64",
            "x86_64": "x64",
            "x86-64": "x64",
            "arm64": "arm64",
            "aarch64": "arm64",
            "riscv64": "riscv64",
            "": "unknown",
        }
        for machine, expected in aliases.items():
            with self.subTest(machine=machine):
                self.assertEqual(build_release._architecture_label(machine), expected)

    def test_release_platform_label_uses_public_asset_names(self) -> None:
        cases = (
            ("Windows", "AMD64", "windows-x64"),
            ("Linux", "x86_64", "linux-x64"),
            ("Darwin", "arm64", "macos-arm64"),
        )
        for system, machine, expected in cases:
            with self.subTest(system=system, machine=machine):
                with patch.object(build_release.platform, "system", return_value=system), patch.object(
                    build_release.platform, "machine", return_value=machine
                ):
                    self.assertEqual(build_release._platform_label(), expected)

    def test_release_verification_requires_the_named_aaaat_skill(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            packaged = root / "_internal" / "aaaat" / "SKILL.md"
            packaged.parent.mkdir(parents=True)
            packaged.write_text("---\nname: AAAAT\n---\n", encoding="utf-8")
            verify_release._verify_packaged_skill(root)

            packaged.write_text("---\nname: other\n---\n", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "not named AAAAT"):
                verify_release._verify_packaged_skill(root)

    def test_user_readme_requires_no_console_setup(self) -> None:
        text = build_release._user_readme()
        self.assertIn("Open AAAAT", text)
        self.assertIn("Connect my AI", text)
        self.assertNotIn("python", text.lower())
        self.assertNotIn("terminal", text.lower())
        self.assertNotIn("database", text.lower())


if __name__ == "__main__":
    unittest.main()
