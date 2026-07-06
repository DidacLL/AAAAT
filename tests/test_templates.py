import tempfile
import unittest

from aaaat.db import connect, create_application, init_db, set_profile_variable
from aaaat.templates import TemplateVariableError, render_named_template


class TemplateTests(unittest.TestCase):
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

    def test_missing_required_template_variables_fail_clearly(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Demo Co", role="Engineer")
                with self.assertRaisesRegex(TemplateVariableError, "Missing required template variables"):
                    render_named_template(conn, "cover-letter", app["id"])


if __name__ == "__main__":
    unittest.main()
