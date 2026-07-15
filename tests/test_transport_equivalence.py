from __future__ import annotations

import unittest
from unittest.mock import patch

from aaaat.result_ingestion import ingest_task_result
from aaaat.task_transports import execute_configured_transport


class TransportEquivalenceTests(unittest.TestCase):
    def test_http_and_stdio_fixtures_produce_the_same_bounded_result_shape(self) -> None:
        context = {
            "task_handle": "taskh_fixture",
            "response_format": {"required": ["result"], "schema": {"result": "string"}},
        }
        expected = '{"result":"complete"}'

        with patch(
            "aaaat.task_transports.chat_completion",
            return_value=(expected, {"agent_runtime": "fake-http"}),
        ):
            http = execute_configured_transport(
                "llama_cpp_server",
                {"endpoint": "http://127.0.0.1:8080", "model": "fixture", "timeout_seconds": 30},
                context,
                run_stdio=lambda *_args, **_kwargs: expected,
            )

        stdio = execute_configured_transport(
            "argv_custom_command",
            {"argv": ["fixture-command"], "timeout_seconds": 30},
            context,
            run_stdio=lambda *_args, **_kwargs: expected,
        )

        self.assertEqual(http.body, stdio.body)
        self.assertEqual(http.provenance["agent_runtime"], "fake-http")
        self.assertEqual(stdio.provenance["agent_runtime"], "user-owned-command")

        acknowledgements = []
        with patch("aaaat.result_ingestion.submit_agent_task_result", side_effect=lambda *_args, **kwargs: acknowledgements.append(kwargs) or {"state": "completed"}):
            ingest_task_result(object(), "taskh_fixture", http.body, provenance=http.provenance)
            ingest_task_result(object(), "taskh_fixture", stdio.body, provenance=stdio.provenance)
        self.assertEqual([item["agent_runtime"] for item in acknowledgements], ["fake-http", "user-owned-command"])

    def test_transport_shape_never_changes_authority_rejection(self) -> None:
        forbidden = {"result": {"application_id": "private"}}
        for runtime in ("fake-http", "fake-stdio"):
            with self.subTest(runtime=runtime):
                with self.assertRaisesRegex(ValueError, "application_id"):
                    ingest_task_result(
                        object(),
                        "taskh_fixture",
                        forbidden,
                        provenance={"agent_runtime": runtime},
                    )


if __name__ == "__main__":
    unittest.main()
