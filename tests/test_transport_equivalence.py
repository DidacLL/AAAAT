from __future__ import annotations

import unittest
from unittest.mock import patch

from aaaat.result_ingestion import ingest_task_result
from aaaat.task_transports import execute_configured_transport


class TransportEquivalenceTests(unittest.TestCase):
    def test_generic_command_result_uses_canonical_ingestion(self) -> None:
        context = {"task_handle": "taskh_fixture"}
        execution = execute_configured_transport(
            "argv_custom_command",
            {"argv": ["fixture-command"], "timeout_seconds": 30},
            context,
            run_stdio=lambda *_args, **_kwargs: '{"result":"complete"}',
        )
        acknowledgements = []
        with patch(
            "aaaat.result_ingestion.submit_agent_task_result",
            side_effect=lambda *_args, **kwargs: acknowledgements.append(kwargs) or {"state": "completed"},
        ):
            ingest_task_result(object(), "taskh_fixture", execution.body, provenance=execution.provenance)
        self.assertEqual(acknowledgements[0]["agent_runtime"], "user-owned-command")

    def test_transport_provenance_never_changes_authority_rejection(self) -> None:
        forbidden = {"result": {"application_id": "private"}}
        for runtime in ("external-wrapper", "user-owned-command"):
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
