from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from aaaat.desktop_workspace import (
    APP_CONFIG_DIR_ENV,
    default_desktop_workspace,
    desktop_workspace_config_path,
    resolve_desktop_workspace,
    save_desktop_workspace,
    selected_desktop_workspace,
)


class DesktopWorkspaceTests(unittest.TestCase):
    def test_first_run_default_is_under_app_owned_local_data_and_not_cwd(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            app_data = Path(tmp) / "local-app-data"
            environment = {APP_CONFIG_DIR_ENV: str(app_data)}
            default = default_desktop_workspace(environment)
            resolved = resolve_desktop_workspace(environment)

            self.assertEqual(default, app_data / "Workspace")
            self.assertEqual(resolved, default.resolve())
            self.assertTrue(resolved.is_dir())
            self.assertNotEqual(resolved, Path.cwd() / ".private")
            self.assertEqual(selected_desktop_workspace(environment), resolved)

    def test_selected_folder_survives_restart_resolution(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            app_data = Path(tmp) / "app-data"
            chosen = Path(tmp) / "chosen-private-workspace"
            environment = {APP_CONFIG_DIR_ENV: str(app_data)}

            saved = save_desktop_workspace(chosen, environment)
            restarted = resolve_desktop_workspace(environment)
            persisted = json.loads(desktop_workspace_config_path(environment).read_text(encoding="utf-8"))

            self.assertEqual(saved, chosen.resolve())
            self.assertEqual(restarted, chosen.resolve())
            self.assertEqual(persisted, {"workspace": str(chosen.resolve())})

    def test_invalid_registry_is_replaced_by_the_safe_first_run_default(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            app_data = Path(tmp) / "app-data"
            environment = {APP_CONFIG_DIR_ENV: str(app_data)}
            config = desktop_workspace_config_path(environment)
            config.parent.mkdir(parents=True)
            config.write_text("not json", encoding="utf-8")

            resolved = resolve_desktop_workspace(environment)

            self.assertEqual(resolved, default_desktop_workspace(environment).resolve())
            self.assertTrue(resolved.is_dir())

    def test_workspace_cannot_be_created_in_the_launch_folder(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            environment = {APP_CONFIG_DIR_ENV: str(Path(tmp) / "app-data")}
            with self.assertRaisesRegex(ValueError, "outside the application"):
                save_desktop_workspace(Path.cwd() / "AAaat-workspace", environment)


if __name__ == "__main__":
    unittest.main()
