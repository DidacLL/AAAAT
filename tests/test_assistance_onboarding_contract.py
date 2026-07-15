from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class AssistanceOnboardingContractTests(unittest.TestCase):
    def test_standard_surface_uses_user_intent_labels(self) -> None:
        source = (ROOT / "aaaat" / "ui_desktop" / "assistance_panel.py").read_text(encoding="utf-8")
        self.assertIn("Choose how you want AAAAT to work with your AI", source)
        self.assertIn("Advanced integration", source)
        self.assertNotIn("Use recommended local AI", source)
        self.assertNotIn("Use portable/manual mode", source)

    def test_technical_fields_are_built_only_in_advanced_section(self) -> None:
        source = (ROOT / "aaaat" / "ui_desktop" / "assistance_panel.py").read_text(encoding="utf-8")
        self.assertIn("if self.show_advanced:", source)
        self.assertIn("self._build_advanced_section(current)", source)
        self.assertIn("Test and save advanced integration", source)

    def test_user_intent_routes_to_existing_bounded_workflows(self) -> None:
        source = (ROOT / "aaaat" / "ui_desktop" / "user_view.py").read_text(encoding="utf-8")
        self.assertIn('mode_id == "manual"', source)
        self.assertIn('mode_id == "guided_connector"', source)
        self.assertIn('mode_id == "browser_or_chat"', source)
        self.assertIn('mode_id == "advanced_integration"', source)
        self.assertIn("use_manual_integration", source)
        self.assertIn("self.connector_panel", source)
        self.assertIn("self.portable_bundle_panel", source)


if __name__ == "__main__":
    unittest.main()
