from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from aaaat.ui_desktop.services import DesktopCommandService


class AssistanceOnboardingBehaviorTests(unittest.TestCase):
    def test_first_use_creates_a_candidature_without_any_connection_setup(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            created = DesktopCommandService(tmp).create_offer_first_candidature(
                "A local job offer for a Python engineer.", company="Example Co", role="Engineer"
            )

        self.assertIsNotNone(created)
        self.assertEqual(created["company"], "Example Co")

    def test_raw_offer_saves_with_unknown_company_and_role_without_ai(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            created = DesktopCommandService(tmp).create_offer_first_candidature(
                "A role description without a named employer or title."
            )

        self.assertIsNotNone(created)
        self.assertEqual(created["company"], "")
        self.assertEqual(created["role"], "")
        self.assertEqual(created["raw_intake"][0]["content"], "A role description without a named employer or title.")


if __name__ == "__main__":
    unittest.main()
