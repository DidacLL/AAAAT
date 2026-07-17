from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from aaaat.release_validation import (
    VERDICT_PASSED,
    VERDICT_READY,
    ReleaseValidator,
    ValidationConfig,
)


class ReleaseValidationHarnessTests(unittest.TestCase):
    def test_deterministic_profile_generates_evidence_and_release_ready_verdict(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            storage = root / "private"
            evidence = root / "evidence"
            report = ReleaseValidator(
                ValidationConfig(
                    storage=storage,
                    evidence_dir=evidence,
                    runtime="deterministic",
                    timeout_seconds=30,
                )
            ).run()

            self.assertEqual(report["automated_verdict"], VERDICT_PASSED)
            self.assertEqual(report["release_verdict"], VERDICT_READY)
            self.assertNotIn("manual_gates", report)
            self.assertTrue((evidence / "release-report.json").is_file())
            self.assertTrue((evidence / "release-report.md").is_file())
            self.assertTrue((evidence / "runtime-conformance.json").is_file())
            self.assertTrue((evidence / "candidature.aaaat-task.zip").is_file())
            self.assertTrue((evidence / "bounded-task-packet.json").is_file())
            self.assertTrue(all(stage["status"] == "passed" for stage in report["stages"]))

            stored = json.loads((evidence / "release-report.json").read_text(encoding="utf-8"))
            self.assertEqual(stored["release_verdict"], VERDICT_READY)
            packet = (evidence / "bounded-task-packet.json").read_text(encoding="utf-8")
            self.assertNotIn(str(storage), packet)


if __name__ == "__main__":
    unittest.main()
