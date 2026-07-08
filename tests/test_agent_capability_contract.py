import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from aaaat.agent_intake import agent_intake_raw_offer, agent_submit_structured_extraction, validate_structured_extraction
from aaaat.candidatures import get_candidature
from aaaat.db import connect, init_db
from aaaat.mcp_server import mcp_descriptor
from aaaat.tasks import apply_task_result, list_tasks
from aaaat.text_blobs import list_text_blobs


FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


class AgentCapabilityContractTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "-B", "-m", "aaaat.cli", *args],
            text=True,
            capture_output=True,
            check=True,
        )

    def test_raw_offer_intake_response_is_narrow(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                response = agent_intake_raw_offer(conn, "Secret Python offer", source_url="https://example.invalid/job")

        self.assertEqual(set(response), {"ok", "capability", "correlation_id", "created_tasks", "next_allowed_actions"})
        self.assertTrue(response["correlation_id"].startswith("intake_"))
        self.assertTrue(response["created_tasks"])
        allowed_task_keys = {"id", "task_type", "title", "state", "priority", "context_hint", "created_at", "updated_at", "allowed_actions"}
        for task in response["created_tasks"]:
            self.assertLessEqual(set(task), allowed_task_keys)
        serialized = json.dumps(response)
        self.assertNotIn("Secret Python offer", serialized)
        self.assertNotIn("raw_intake", serialized)
        self.assertNotIn("applications", serialized)
        self.assertNotIn("profile_facts", serialized)
        self.assertNotIn("variables", serialized)
        self.assertNotIn("dashboard", serialized.lower())

    def test_structured_extraction_stores_reviewable_result_without_direct_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                intake = agent_intake_raw_offer(conn, "Offer in Barcelona")
                extraction = agent_submit_structured_extraction(
                    conn,
                    intake["correlation_id"],
                    {"fields": {"company": "Agent Co", "location": "Barcelona", "keywords": ["Python"]}, "notes": "proposal"},
                    agent_name="Extractor",
                    agent_runtime="cli",
                    model_provider="local",
                )
                task = next(item for item in list_tasks(conn) if item["task_type"] == "field_inference")
                loaded_before = get_candidature(conn, task["application_id"])
                apply_task_result(conn, task["id"])
                loaded_after = get_candidature(conn, task["application_id"])
                blobs = list_text_blobs(conn, task["application_id"])
                applied_task = next(item for item in list_tasks(conn, application_id=task["application_id"]) if item["id"] == task["id"])

        self.assertEqual(extraction["capability"], "structured_extraction")
        self.assertEqual(extraction["stored_as"]["kind"], "task_result")
        self.assertEqual(loaded_before["company"], "Pending extraction")
        self.assertEqual(loaded_before["location"], "")
        self.assertEqual(loaded_after["company"], "Pending extraction")
        self.assertEqual(loaded_after["location"], "Barcelona")
        self.assertTrue(any(blob["agent_name"] == "Extractor" and "Agent Co" in blob["body"] for blob in blobs))
        self.assertIn("Skipped non-empty fields: company", applied_task["notes"])

    def test_structured_extraction_schema_is_finite(self):
        invalid_payloads = [
            {},
            {"fields": {}},
            {"fields": {"unknown": "value"}},
            {"fields": {"company": {"nested": "no"}}},
            {"fields": {"keywords": "Python"}},
            {"fields": {"valuation": True}},
            {"fields": {"company": "Agent Co"}, "replace_existing": True},
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    validate_structured_extraction(payload)

    def test_agent_intake_cli_commands_are_narrow(self):
        with tempfile.TemporaryDirectory() as tmp:
            offer_path = Path(tmp) / "offer.txt"
            offer_path.write_text("Private copied offer", encoding="utf-8")
            fields_path = Path(tmp) / "fields.json"
            fields_path.write_text(json.dumps({"fields": {"location": "Remote"}, "notes": "ok"}), encoding="utf-8")

            raw = json.loads(self.run_cli("--storage", tmp, "agent", "intake", "raw-offer", "--file", str(offer_path)).stdout)
            submitted = json.loads(
                self.run_cli(
                    "--storage",
                    tmp,
                    "agent",
                    "intake",
                    "submit-extraction",
                    raw["correlation_id"],
                    "--result-file",
                    str(fields_path),
                    "--agent-name",
                    "CLI Agent",
                ).stdout
            )

        self.assertEqual(set(raw), {"ok", "capability", "correlation_id", "created_tasks", "next_allowed_actions"})
        self.assertNotIn("Private copied offer", json.dumps(raw))
        self.assertEqual(submitted["stored_as"]["kind"], "task_result")
        self.assertEqual(submitted["accepted_fields"], ["location"])

    @unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
    def test_agent_intake_http_routes_are_agent_surface_only(self):
        from fastapi.testclient import TestClient

        from aaaat.server_fastapi import create_app

        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            dashboard = TestClient(create_app(tmp, surface="dashboard"))
            agent = TestClient(create_app(tmp, surface="agent"))

            self.assertEqual(dashboard.post("/api/agent/intake/raw-offer", json={"content": "No dashboard agent API"}).status_code, 404)
            created = agent.post("/api/agent/intake/raw-offer", json={"content": "HTTP copied offer", "agent_name": "HTTP Agent"})
            self.assertEqual(created.status_code, 200)
            raw = created.json()
            self.assertEqual(set(raw), {"ok", "capability", "correlation_id", "created_tasks", "next_allowed_actions"})
            self.assertNotIn("HTTP copied offer", json.dumps(raw))

            submitted = agent.post(
                f"/api/agent/intake/{raw['correlation_id']}/extraction",
                json={"fields": {"location": "Madrid"}, "agent_name": "HTTP Agent", "model_provider": "local"},
            )
            self.assertEqual(submitted.status_code, 200)
            self.assertEqual(submitted.json()["accepted_fields"], ["location"])

            paths = set(agent.get("/openapi.json").json()["paths"])
            self.assertIn("/api/agent/intake/raw-offer", paths)
            self.assertIn("/api/agent/intake/{correlation_id}/extraction", paths)
            self.assertTrue(all(path == "/api/health" or path.startswith("/api/agent/") for path in paths))

    def test_docs_and_descriptor_present_capability_contract(self):
        root = Path(__file__).resolve().parent.parent
        docs = "\n".join(
            (root / path).read_text(encoding="utf-8").lower()
            for path in ("AGENTS.md", "docs/agent-guide.md", "docs/openapi.md", "docs/cli.md", "docs/security-model.md")
        )
        descriptor = mcp_descriptor()
        tools = {tool["name"] for tool in descriptor["tools"]}
        resources = {resource["uri"] for resource in descriptor["resources"]}

        self.assertIn("capability-scoped", docs)
        self.assertIn("agent intake raw-offer", docs)
        self.assertIn("schema-bound", docs)
        self.assertIn("create_agent_raw_offer_intake", tools)
        self.assertIn("submit_agent_structured_extraction", tools)
        self.assertIn("aaaat://agent/capabilities", resources)
        forbidden = ("dashboard-payload", "list_applications", "search_applications", "profile_dump", "variable_dump")
        combined = docs + "\n" + json.dumps(descriptor, sort_keys=True).lower()
        for term in forbidden:
            self.assertNotIn(term, combined)


if __name__ == "__main__":
    unittest.main()
