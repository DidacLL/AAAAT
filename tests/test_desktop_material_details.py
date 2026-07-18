import tempfile
import unittest
from pathlib import Path

from aaaat.ui_desktop.services import DesktopCommandService


class DesktopMaterialDetailsTests(unittest.TestCase):
    def test_material_name_and_notes_can_be_updated_without_changing_state_or_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = DesktopCommandService(tmp)
            candidature = service.create_offer_first_candidature("Original offer")
            source = Path(tmp) / "cv.pdf"
            source.write_bytes(b"pdf")
            attached = service.attach_existing_material(candidature["id"], source, "cv", "Initial CV")

            updated = service.update_artifact_details(
                attached["id"],
                label="CV for final review",
                notes="Version received from the user on 14 July.",
            )

        self.assertEqual(updated["label"], "CV for final review")
        self.assertEqual(updated["notes"], "Version received from the user on 14 July.")
        self.assertEqual(updated["state"], "draft")
        self.assertEqual(updated["path"], str(source))
        self.assertEqual(updated["source_context"], "desktop:attached")


if __name__ == "__main__":
    unittest.main()
