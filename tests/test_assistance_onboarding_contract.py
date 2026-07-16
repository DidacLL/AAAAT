from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from aaaat.integration_setup import connection_modes
from aaaat.ui_desktop.services import DesktopCommandService


class AssistanceOnboardingBehaviorTests(unittest.TestCase):
    def test_standard_choices_have_clear_user_intent_and_manual_use(self) -> None:
        modes = {str(mode["id"]): mode for mode in connection_modes()}

        self.assertEqual(
            [mode["title"] for mode in connection_modes()],
            ["Continue manually", "Connect my AI", "Use a browser or chat AI", "Advanced integration"],
        )
        self.assertFalse(modes["manual"]["automatic"])
        self.assertEqual(modes["guided_connector"]["setup_complexity"], "guided")
        self.assertEqual(modes["browser_or_chat"]["setup_complexity"], "guided")
        self.assertEqual(modes["advanced_integration"]["setup_complexity"], "advanced")

    def test_manual_first_use_creates_a_candidature_without_assistance_setup(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            created = DesktopCommandService(tmp).create_offer_first_candidature(
                "A local job offer for a Python engineer.", company="Example Co", role="Engineer"
            )

        self.assertIsNotNone(created)
        self.assertEqual(created["company"], "Example Co")


if __name__ == "__main__":
    unittest.main()
