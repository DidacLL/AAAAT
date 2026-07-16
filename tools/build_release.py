"""Build a self-contained AAAAT desktop release on the current platform.

This is a maintainer tool. End users receive the resulting packaged folder or
ZIP and open the desktop application directly; they do not run this script.
"""

from __future__ import annotations

import argparse
import os
import platform
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "aaaat"
DESKTOP_ENTRY = ROOT / "scripts" / "desktop_entry.py"
BRIDGE_ENTRY = ROOT / "scripts" / "host_bridge_entry.py"
USER_GUIDE = ROOT / "docs" / "user-guide.md"
DATA_FILES = (PACKAGE / "schema.sql", PACKAGE / "host_runtime_skill.md")


def build_release(output_directory: Path, *, keep_build: bool = False) -> tuple[Path, Path]:
    """Build and archive the desktop plus paired bridge for this operating system."""

    _require_sources()
    output_directory = output_directory.resolve()
    output_directory.mkdir(parents=True, exist_ok=True)
    label = _platform_label()
    release_name = f"AAAAT-{label}"
    release_root = output_directory / release_name
    archive_path = output_directory / f"{release_name}.zip"

    build_parent = output_directory / ".build" if keep_build else Path(tempfile.mkdtemp(prefix="aaaat-release-"))
    try:
        if build_parent.exists() and keep_build:
            shutil.rmtree(build_parent)
        build_parent.mkdir(parents=True, exist_ok=True)
        desktop_dist = build_parent / "desktop-dist"
        bridge_dist = build_parent / "bridge-dist"

        _run_pyinstaller(
            entry=DESKTOP_ENTRY,
            name="AAAAT",
            dist_path=desktop_dist,
            work_path=build_parent / "desktop-work",
            windowed=True,
            collect_wx=True,
        )
        _run_pyinstaller(
            entry=BRIDGE_ENTRY,
            name="aaaat-host-bridge",
            dist_path=bridge_dist,
            work_path=build_parent / "bridge-work",
            windowed=False,
            collect_wx=False,
        )

        if release_root.exists():
            shutil.rmtree(release_root)
        release_root.mkdir(parents=True)
        _copy_desktop_output(desktop_dist, release_root)
        _copy_bridge_output(bridge_dist, release_root / "bridge")
        if USER_GUIDE.exists():
            shutil.copy2(USER_GUIDE, release_root / "AAAAT User Guide.md")
        (release_root / "README.txt").write_text(_user_readme(), encoding="utf-8")

        archive_path.unlink(missing_ok=True)
        shutil.make_archive(
            str(archive_path.with_suffix("")),
            "zip",
            root_dir=release_root.parent,
            base_dir=release_root.name,
        )
        return release_root, archive_path
    finally:
        if not keep_build:
            shutil.rmtree(build_parent, ignore_errors=True)


def _run_pyinstaller(
    *,
    entry: Path,
    name: str,
    dist_path: Path,
    work_path: Path,
    windowed: bool,
    collect_wx: bool,
) -> None:
    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onedir",
        "--name",
        name,
        "--distpath",
        str(dist_path),
        "--workpath",
        str(work_path),
        "--specpath",
        str(work_path.parent),
        "--windowed" if windowed else "--console",
    ]
    if collect_wx:
        command.extend(("--collect-all", "wx"))
    for source in DATA_FILES:
        command.extend(("--add-data", f"{source}{os.pathsep}aaaat"))
    command.append(str(entry))
    subprocess.run(command, cwd=ROOT, check=True)


def _copy_desktop_output(dist_path: Path, release_root: Path) -> None:
    app_bundle = dist_path / "AAAAT.app"
    onedir = dist_path / "AAAAT"
    if app_bundle.is_dir():
        shutil.copytree(app_bundle, release_root / app_bundle.name)
        return
    if onedir.is_dir():
        _copy_directory_contents(onedir, release_root)
        return
    raise FileNotFoundError("PyInstaller did not create the AAAAT desktop output")


def _copy_bridge_output(dist_path: Path, target: Path) -> None:
    onedir = dist_path / "aaaat-host-bridge"
    if not onedir.is_dir():
        raise FileNotFoundError("PyInstaller did not create the paired bridge output")
    target.mkdir(parents=True, exist_ok=True)
    _copy_directory_contents(onedir, target)


def _copy_directory_contents(source: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        destination = target / item.name
        if item.is_dir():
            shutil.copytree(item, destination)
        else:
            shutil.copy2(item, destination)


def _require_sources() -> None:
    missing = [path for path in (*DATA_FILES, DESKTOP_ENTRY, BRIDGE_ENTRY) if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing release source: " + ", ".join(str(path) for path in missing))


def _platform_label() -> str:
    system = platform.system().lower() or sys.platform.lower()
    if system.startswith("darwin"):
        system = "macos"
    elif system.startswith("windows"):
        system = "windows"
    elif system.startswith("linux"):
        system = "linux"
    machine = (platform.machine() or "unknown").lower().replace(" ", "-")
    return f"{system}-{machine}"


def _user_readme() -> str:
    if sys.platform.startswith("win"):
        opening = "Open AAAAT.exe."
    elif sys.platform == "darwin":
        opening = "Open AAAAT.app."
    else:
        opening = "Open AAAAT."
    return (
        "AAAAT\n\n"
        f"{opening}\n"
        "On first use, choose the private folder for your workspace.\n"
        "Use the desktop app manually, or choose Connect my AI for guided setup.\n"
        "AAAAT keeps private workspace data outside this application folder and outside AI-host folders.\n"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build AAAAT for the current operating system.")
    parser.add_argument("--output-directory", type=Path, default=ROOT / "dist")
    parser.add_argument("--keep-build", action="store_true", help="Keep intermediate PyInstaller files under the output directory.")
    args = parser.parse_args(argv)
    try:
        release_root, archive_path = build_release(args.output_directory, keep_build=args.keep_build)
    except (FileNotFoundError, OSError, subprocess.CalledProcessError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(release_root)
    print(archive_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
