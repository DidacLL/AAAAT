import tempfile
import unittest
from pathlib import Path

from aaaat.db import connect, create_application, init_db, required_profile_variables, set_profile_variable
from aaaat.templates import TemplateVariableError, render_named_template


class TemplateTests(unittest.TestCase):
    def test_source_templates_use_variables_not_private_identity(self):
        root = Path(__file__).resolve().parent.parent
        for name in ("cv.tex", "cover-letter.tex", "recruiter-message.md"):
            body = (root / "templates" / name).read_text(encoding="utf-8")
            self.assertIn("{{", body)
            self.assertNotIn("SCVRI", body)
            self.assertNotRegex(body, r"[\w.+-]+@[\w.-]+")

    def test_profile_variables_render_into_latex(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Demo Candidate")
                set_profile_variable(conn, "email", "demo@example.invalid")
                set_profile_variable(conn, "summary.default", "Builds useful local tools.")
                rendered = render_named_template(conn, "cv")

        self.assertIn("Demo Candidate", rendered)
        self.assertIn("demo@example.invalid", rendered)
        self.assertIn("\\documentclass", rendered)

    def test_application_variables_render_into_cover_letter(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Demo Candidate")
                app = create_application(conn, company="Demo Co", role="Engineer")
                rendered = render_named_template(
                    conn,
                    "cover-letter",
                    app["id"],
                    {"artifact.cover_letter.body": "Audit body."},
                )

        self.assertIn("Demo Co", rendered)
        self.assertIn("Engineer", rendered)
        self.assertIn("Audit body.", rendered)

    def test_profile_missing_reports_and_clears_required_variables(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                missing = required_profile_variables(conn)
                self.assertIn("profile.display_name", missing)
                self.assertIn("profile.email", missing)
                self.assertIn("profile.summary.default", missing)

                set_profile_variable(conn, "display_name", "Demo Candidate")
                set_profile_variable(conn, "email", "demo@example.invalid")
                set_profile_variable(conn, "summary.default", "Builds local tools.")
                self.assertEqual(required_profile_variables(conn), [])

    def test_missing_required_template_variables_fail_clearly(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Demo Co", role="Engineer")
                with self.assertRaisesRegex(TemplateVariableError, "Missing required template variables"):
                    render_named_template(conn, "cover-letter", app["id"])


if __name__ == "__main__":
    unittest.main()
