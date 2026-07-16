from __future__ import annotations

import unittest
from unittest.mock import patch

from aaaat.ui_desktop.app import main


class DesktopReleaseStartupTests(unittest.TestCase):
    def test_hidden_startup_check_uses_the_packaged_desktop_validation_path(self) -> None:
        with patch("aaaat.ui_desktop.app.desktop_startup_check", return_value=0) as startup_check:
            result = main(["--startup-check"])

        self.assertEqual(result, 0)
        startup_check.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
