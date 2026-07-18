from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from aaaat.db import connect, create_application, ensure_workspace_database
from aaaat.file_exchange import (
    RESULT_MEDIA_TYPE,
    RESULT_PROTOCOL,
    TEXT_RESULT_BEGIN,
    TEXT_RESULT_END,
    exchange_status,
    export_candidature_task_file,
    import_result_text,
    scan_exchange_results,
    write_result_file,
)
from aaaat.host_connection import connection_handoff_message
from aaaat.tasks import create_task, get_task


class FileExchangeTests(unittest.TestCase):
    def _workspace_with_tasks(self, root: Path, count: int = 1):
        storage = root / "private"
        ensure_workspace_database(storage)
        with connect(storage) as conn:
            candidature = create_application(conn, company="Example", role="Engineer")
            tasks = [
                create_task(
                    conn,
                    "company_research",
                    f"Research company {index}",
                    application_id=candidature["id"],
                    context_hint=f"candidature:company_research:{index}",
                    idempotent=False,
                )
                for index in range(count)
            ]
        return storage, candidature, tasks

    def test_connection_handoff_selects_reachable_mcp_or_file_exchange(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = Path(tmp) / "private"
            registry = Path(tmp) / "registry.json"
            ensure_workspace_database(storage)
            previous = os.environ.get("AAAAT_CONNECTION_REGISTRY")
            os.environ["AAAAT_CONNECTION_REGISTRY"] = str(registry)
            try:
                handoff = connection_handoff_message(storage)
            finally:
                if previous is None:
                    os.environ.pop("AAAAT_CONNECTION_REGISTRY", None)
                else:
                    os.environ["AAAAT_CONNECTION_REGISTRY"] = previous
            self.assertIn('"preferred": "file"', handoff)
            self.assertIn("only when this host can launch", handoff.lower())
            self.assertIn(TEXT_RESULT_BEGIN, handoff)
            self.assertNotIn(str(storage), handoff)

    def test_task_file_is_uploadable_bounded_and_names_its_result(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage, candidature, tasks = self._workspace_with_tasks(Path(tmp))
            outcome = export_candidature_task_file(storage, candidature["id"])
            self.assertEqual(outcome["status"], "exported")
            source = Path(outcome["path"])
            self.assertTrue(source.is_file())
            payload = json.loads(source.read_text(encoding="utf-8"))
            self.assertEqual(payload["result_filename"], outcome["result_filename"])
            self.assertEqual(len(payload["work_items"]), 1)
            self.assertIn("task_capability", json.dumps(payload))
            self.assertIn(TEXT_RESULT_BEGIN, json.dumps(payload))
            self.assertNotIn(str(storage), json.dumps(payload))
            self.assertNotIn(candidature["id"], json.dumps(payload))
            self.assertEqual(exchange_status(storage)["pending_tasks"], 1)
            with connect(storage) as conn:
                self.assertEqual(get_task(conn, tasks[0]["id"])["state"], "claimed")

    def test_watched_results_are_ingested_and_archived(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage, candidature, tasks = self._workspace_with_tasks(Path(tmp))
            exported = export_candidature_task_file(storage, candidature["id"])
            task_payload = json.loads(Path(exported["path"]).read_text(encoding="utf-8"))
            capability = task_payload["work_items"][0]["task"]["task_capability"]
            result_path = Path(exported["exchange_path"]) / "results" / exported["result_filename"]
            write_result_file(
                result_path,
                exchange_id=task_payload["exchange_id"],
                results=[
                    {
                        "task_capability": capability,
                        "result": {"company_research": "Bounded research"},
                        "provenance": {"agent_runtime": "browser-file"},
                    }
                ],
            )
            outcome = scan_exchange_results(storage, minimum_age_seconds=0)
            self.assertEqual(outcome["accepted_count"], 1)
            self.assertEqual(outcome["rejected_count"], 0)
            self.assertFalse(result_path.exists())
            self.assertEqual(exchange_status(storage)["pending_tasks"], 0)
            with connect(storage) as conn:
                self.assertEqual(get_task(conn, tasks[0]["id"])["state"], "completed")

    def test_partial_result_keeps_the_original_task_file_for_correction(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage, candidature, tasks = self._workspace_with_tasks(Path(tmp), count=2)
            exported = export_candidature_task_file(storage, candidature["id"])
            task_payload = json.loads(Path(exported["path"]).read_text(encoding="utf-8"))
            capability = task_payload["work_items"][0]["task"]["task_capability"]
            result_path = Path(exported["exchange_path"]) / "results" / exported["result_filename"]
            write_result_file(
                result_path,
                exchange_id=task_payload["exchange_id"],
                results=[
                    {
                        "task_capability": capability,
                        "result": {"company_research": "One result"},
                    }
                ],
            )
            outcome = scan_exchange_results(storage, minimum_age_seconds=0)
            self.assertEqual(outcome["accepted_count"], 1)
            self.assertEqual(outcome["rejected_count"], 1)
            self.assertEqual(exchange_status(storage)["pending_tasks"], 1)
            with connect(storage) as conn:
                states = [get_task(conn, task["id"])["state"] for task in tasks]
            self.assertEqual(states.count("completed"), 1)
            self.assertEqual(states.count("claimed"), 1)

    def test_tagged_text_fallback_ignores_chat_noise(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage, candidature, tasks = self._workspace_with_tasks(Path(tmp))
            exported = export_candidature_task_file(storage, candidature["id"])
            task_payload = json.loads(Path(exported["path"]).read_text(encoding="utf-8"))
            capability = task_payload["work_items"][0]["task"]["task_capability"]
            payload = {
                "protocol": RESULT_PROTOCOL,
                "protocol_version": 1,
                "media_type": RESULT_MEDIA_TYPE,
                "exchange_id": task_payload["exchange_id"],
                "results": [
                    {
                        "task_capability": capability,
                        "result": {"company_research": "Text fallback research"},
                    }
                ],
            }
            response = (
                f"Done.\n{TEXT_RESULT_BEGIN}\n{json.dumps(payload)}\n"
                f"{TEXT_RESULT_END}\nLet me know."
            )
            outcome = import_result_text(storage, response)
            self.assertEqual(outcome["status"], "accepted")
            with connect(storage) as conn:
                self.assertEqual(get_task(conn, tasks[0]["id"])["state"], "completed")

    def test_scanner_waits_for_a_file_to_be_stable(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage, candidature, _tasks = self._workspace_with_tasks(Path(tmp))
            exported = export_candidature_task_file(storage, candidature["id"])
            task_payload = json.loads(Path(exported["path"]).read_text(encoding="utf-8"))
            result_path = Path(exported["exchange_path"]) / "results" / exported["result_filename"]
            write_result_file(result_path, exchange_id=task_payload["exchange_id"], results=[])
            outcome = scan_exchange_results(storage, minimum_age_seconds=60)
            self.assertEqual(outcome["processed_files"], 0)
            self.assertEqual(outcome["skipped_files"], 1)
            self.assertTrue(result_path.exists())

    def test_invalid_result_is_quarantined_with_an_error_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage, candidature, _tasks = self._workspace_with_tasks(Path(tmp))
            exported = export_candidature_task_file(storage, candidature["id"])
            result_path = Path(exported["exchange_path"]) / "results" / exported["result_filename"]
            result_path.write_text("not-json", encoding="utf-8")
            outcome = scan_exchange_results(storage, minimum_age_seconds=0)
            self.assertEqual(outcome["accepted_count"], 0)
            self.assertEqual(outcome["rejected_count"], 1)
            rejected = Path(exported["exchange_path"]) / "rejected"
            self.assertTrue(any(path.name.endswith(".errors.json") for path in rejected.iterdir()))


if __name__ == "__main__":
    unittest.main()
