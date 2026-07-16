from __future__ import annotations

import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "aaaat" / "ui_desktop" / "connector_onboarding_panel.py"


class ConnectorOnboardingLanguageTests(unittest.TestCase):
    def test_standard_connection_text_uses_plain_user_language(self) -> None:
        tree = ast.parse(PANEL.read_text(encoding="utf-8"))
        visible_text = "\n".join(
            node.value
            for node in ast.walk(tree)
            if isinstance(node, ast.Constant) and isinstance(node.value, str)
        ).lower()

        self.assertIn("connect my ai", visible_text)
        self.assertIn("save setup for my ai", visible_text)
        self.assertIn("copy setup message", visible_text)
        for forbidden in (
            "mcp",
            "executable",
            "database",
            "storage path",
            "task capability",
            "argv",
            "sdk",
            "provider architecture",
        ):
            self.assertNotIn(forbidden, visible_text)


if __name__ == "__main__":
    unittest.main()
