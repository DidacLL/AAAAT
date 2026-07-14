import tempfile
import unittest
from pathlib import Path

from aaaat.artifacts import list_artifact_events
from aaaat.db import connect
from aaaat.ui_desktop.services import DesktopCommandService


class DesktopMaterialAttachmentTests(unittest.TestCase):
    def test_existing_file_is_attached_without_claiming_generation_or_submission(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            candidature = service.create_offer_first_candidature("Original offer")
            source = Path(tmp) / "existing-cv.pdf"
            source.write_bytes(b"existing local file")

            attached = service.attach_existing_material(candidature["id"], source, "cv", "General CV")

            self.assertIsNotNone(attached)
            self.assertEqual(attached["path"], str(source))
            self.assertEqual(attached["review_state"], "draft")
            self.assertEqual(attached["source_context"], "desktop:attached")
            with connect(tmp) as conn:
                events = list_artifact_events(conn, attached["id"])

        self.assertEqual([event["event_type"] for event in events], ["attach"])

    def test_missing_file_is_not_attached(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            candidature = service.create_offer_first_candidature("Original offer")
            attached = service.attach_existing_material(candidature["id"], Path(tmp) / "missing.pdf", "cv")

        self.assertIsNone(attached)


if __name__ == "__main__":
    unittest.main()
