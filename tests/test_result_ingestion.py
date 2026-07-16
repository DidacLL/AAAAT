from __future__ import annotations

import unittest
from unittest.mock import patch

from aaaat.result_ingestion import ingest_task_result


_CAPABILITY = "taskcap_" + "a" * 48


class ResultIngestionTests(unittest.TestCase):
    def test_normalizes_json_and_provenance_before_submission(self) -> None:
        with patch("aaaat.result_ingestion.submit_agent_task_result", return_value={"state": "completed"}) as submit:
            result = ingest_task_result(
                object(),
                _CAPABILITY,
                '{"result":"ok"}',
                provenance={"agent_name": "Agent", "agent_runtime": "http-wrapper", "model_provider": "provider:model"},
            )
        self.assertEqual(result, {"status": "accepted", "state": "completed", "next": ["review_in_aaaat"]})
        self.assertEqual(submit.call_args.args[1], _CAPABILITY)
        self.assertEqual(submit.call_args.kwargs["agent_runtime"], "http-wrapper")
        self.assertIn('"result": "ok"', submit.call_args.args[2])

    def test_rejects_invalid_capabilities_and_non_object_results(self) -> None:
        with self.assertRaisesRegex(ValueError, "task capability"):
            ingest_task_result(object(), "application-123", {"result": "ok"})
        with self.assertRaisesRegex(ValueError, "one JSON object"):
            ingest_task_result(object(), _CAPABILITY, "[1, 2]")

    def test_rejects_forbidden_authority_fields_recursively(self) -> None:
        with self.assertRaisesRegex(ValueError, "application_id"):
            ingest_task_result(
                object(),
                _CAPABILITY,
                {"result": {"nested": {"application_id": "private-id"}}},
            )

    def test_default_provenance_is_used_when_transport_omits_it(self) -> None:
        with patch("aaaat.result_ingestion.submit_agent_task_result", return_value={}) as submit:
            ingest_task_result(
                object(),
                _CAPABILITY,
                {"result": "ok"},
                default_agent_name="portable-bundle",
                default_agent_runtime="browser-or-manual",
            )
        self.assertEqual(submit.call_args.kwargs["agent_name"], "portable-bundle")
        self.assertEqual(submit.call_args.kwargs["agent_runtime"], "browser-or-manual")


if __name__ == "__main__":
    unittest.main()
