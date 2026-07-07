import tempfile
import unittest
from unittest import mock
from pathlib import Path

from aaaat.db import connect, create_application, init_db, required_profile_variables, set_profile_variable
from aaaat.artifacts import list_artifacts
from aaaat.templates import TemplateVariableError, escape_latex, render_document_artifact, render_named_template


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

    def test_latex_escaping_for_normal_scalar_values(self):
        self.assertEqual(escape_latex("&%_#${}"), r"\&\%\_\#\$\{\}")
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "A&B_%#${}")
                set_profile_variable(conn, "email", "demo_a@example.invalid")
                set_profile_variable(conn, "summary.default", "50% Python_#1")
                app = create_application(conn, company="R&D_#1", role="Engineer")
                rendered = render_named_template(conn, "cv", app["id"])

        self.assertIn(r"A\&B\_\%\#\$\{\}", rendered)
        self.assertIn(r"50\% Python\_\#1", rendered)
        self.assertIn(r"R\&D\_\#1", rendered)

    def test_cover_letter_body_is_escaped_unless_body_tex_is_used(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Demo Candidate")
                set_profile_variable(conn, "email", "demo@example.invalid")
                app = create_application(conn, company="Demo Co", role="Engineer")
                plain = render_named_template(conn, "cover-letter", app["id"], {"artifact.cover_letter.body": "A&B_#1"})
                trusted = render_named_template(conn, "cover-letter", app["id"], {"artifact.cover_letter.body_tex": r"\textbf{A&B}"})

        self.assertIn(r"A\&B\_\#1", plain)
        self.assertIn(r"\textbf{A&B}", trusted)

    def test_render_document_artifact_writes_tex_and_reuses_draft_row(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            output = Path(tmp) / "cv.tex"
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Demo Candidate")
                set_profile_variable(conn, "email", "demo@example.invalid")
                set_profile_variable(conn, "summary.default", "Builds local tools.")
                app = create_application(conn, company="Render Co", role="Engineer")
                first = render_document_artifact(conn, "cv", output, app["id"])
                second = render_document_artifact(conn, "cv", output, app["id"])
                artifacts = list_artifacts(conn, app["id"])
                rendered = output.read_text(encoding="utf-8")

            self.assertEqual(first["pdf_status"], "not_requested")
            self.assertEqual(first["artifact_id"], second["artifact_id"])
            self.assertEqual(len(artifacts), 1)
            self.assertEqual(artifacts[0]["source_context"], "template:cv")
            self.assertTrue(output.exists())
            self.assertIn("\\documentclass", rendered)

    def test_pdflatex_unavailable_keeps_tex_artifact(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            output = Path(tmp) / "cover-letter.tex"
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Demo Candidate")
                set_profile_variable(conn, "email", "demo@example.invalid")
                app = create_application(conn, company="Render Co", role="Engineer")
                with mock.patch("aaaat.templates.shutil.which", return_value=None):
                    result = render_document_artifact(
                        conn,
                        "cover-letter",
                        output,
                        app["id"],
                        {"artifact.cover_letter.body": "Plain body"},
                        compile_pdf=True,
                    )

            self.assertEqual(result["pdf_status"], "unavailable")
            self.assertIsNone(result["pdf_path"])
            self.assertEqual(result["path"], str(output))
            self.assertTrue(output.exists())

    def test_pdflatex_success_when_executable_exists(self):
        import shutil

        if shutil.which("pdflatex") is None:
            self.skipTest("pdflatex is not installed")
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            output = Path(tmp) / "cv.tex"
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Demo Candidate")
                set_profile_variable(conn, "email", "demo@example.invalid")
                set_profile_variable(conn, "summary.default", "Builds local tools.")
                app = create_application(conn, company="Render Co", role="Engineer")
                result = render_document_artifact(conn, "cv", output, app["id"], compile_pdf=True)

            self.assertEqual(result["pdf_status"], "success")
            self.assertTrue(Path(result["pdf_path"]).exists())


if __name__ == "__main__":
    unittest.main()
