from __future__ import annotations

import importlib
import sys
import types
import unittest
from unittest.mock import patch


class DesktopConnectionHandoffTests(unittest.TestCase):
    def test_connect_ai_callback_returns_the_self_contained_handoff_once(self) -> None:
        stubs: dict[str, types.ModuleType] = {"wx": types.ModuleType("wx")}
        for module_name, class_name in (
            ("aaaat.ui_desktop.assistance_panel", "AssistancePanel"),
            ("aaaat.ui_desktop.connector_onboarding_panel", "ConnectorOnboardingPanel"),
            ("aaaat.ui_desktop.file_exchange_panel", "FileExchangePanel"),
            ("aaaat.ui_desktop.profile_facts_panel", "ProfileFactsPanel"),
            ("aaaat.ui_desktop.user_panel", "UserPanel"),
        ):
            stub = types.ModuleType(module_name)
            setattr(stub, class_name, type(class_name, (), {}))
            stubs[module_name] = stub

        module_name = "aaaat.ui_desktop.user_view"
        previous = sys.modules.pop(module_name, None)
        try:
            with patch.dict(sys.modules, stubs):
                module = importlib.import_module(module_name)
                view = object.__new__(module.UserViewMixin)
                view.storage_path = "private-workspace"
                with patch.object(
                    module,
                    "connection_handoff_message",
                    return_value="self-contained handoff",
                ) as handoff:
                    self.assertEqual(
                        view._prepare_connection_handoff(),
                        "self-contained handoff",
                    )
                    handoff.assert_called_once_with("private-workspace")
        finally:
            sys.modules.pop(module_name, None)
            if previous is not None:
                sys.modules[module_name] = previous


if __name__ == "__main__":
    unittest.main()
