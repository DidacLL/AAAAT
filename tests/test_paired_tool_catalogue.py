from __future__ import annotations

import json
import unittest

from aaaat.mcp_server import host_bridge_descriptor, validate_descriptor


class PairedToolCatalogueTests(unittest.TestCase):
    def test_catalogue_contains_only_named_paired_operations(self) -> None:
        descriptor = host_bridge_descriptor()
        self.assertTrue(validate_descriptor(descriptor))
        names = {item["name"] for item in descriptor["tools"]}
        self.assertEqual(
            names,
            {
                "get_connection_status",
                "open_workspace",
                "start_profile",
                "create_candidature",
                "get_next_agent_work",
                "report_agent_task_progress",
                "submit_agent_task_result",
            },
        )
        self.assertNotIn("submit_agent_action", names)
        self.assertEqual(descriptor["resources"], [])

    def test_create_candidature_schema_is_bounded_and_self_describing(self) -> None:
        tools = {item["name"]: item for item in host_bridge_descriptor()["tools"]}
        schema = tools["create_candidature"]["inputSchema"]
        payload = schema["properties"]["payload"]
        self.assertFalse(schema["additionalProperties"])
        self.assertFalse(payload["additionalProperties"])
        self.assertEqual(
            set(payload["properties"]),
            {"source_material", "candidature", "outputs", "render", "requested_tasks"},
        )
        serialized = json.dumps(schema)
        for forbidden in ("application_id", "candidature_id", "storage_path", "database_path", "replace_existing"):
            self.assertNotIn(forbidden, serialized)
        self.assertIn("offer_text", serialized)
        self.assertIn("keyword_definition", serialized)

    def test_every_tool_explains_its_positive_operation(self) -> None:
        for item in host_bridge_descriptor()["tools"]:
            self.assertGreater(len(item["description"]), 24)
            self.assertNotIn("Operation:", item["description"])


if __name__ == "__main__":
    unittest.main()
