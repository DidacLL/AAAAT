import tempfile
import unittest

from aaaat.candidatures import create_candidature, get_candidature
from aaaat.db import connect, create_application, init_db, set_profile_variable
from aaaat.keywords import add_keyword_alias, create_keyword_note, list_keywords
from aaaat.notes import create_note, list_notes
from aaaat.privacy import get_variable, resolve_variables, set_variable
from aaaat.search import SearchUnavailable, rebuild_index, safe_match_query, search
from aaaat.tasks import apply_task_result, complete_task, create_task, ensure_initial_tasks, list_tasks
from aaaat.text_blobs import create_text_blob, list_text_blobs
from aaaat.todos import create_todo, list_todos, update_todo


class DomainServiceTests(unittest.TestCase):
    def test_profile_variables_migrate_to_canonical_privacy_variables(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                conn.execute(
                    "INSERT INTO profile_variables(key, value, updated_at) VALUES ('display_name', 'Demo User', '2026-01-01T00:00:00+00:00')"
                )
                conn.commit()
            init_db(tmp)
            with connect(tmp) as conn:
                item = get_variable(conn, "display_name")
                self.assertEqual(item["key"], "profile.display_name")
                self.assertEqual(item["placeholder"], "{{ profile.display_name }}")
                self.assertEqual(item["value"], "Demo User")
                self.assertEqual(resolve_variables(conn, "agent")["profile.display_name"], "{{ profile.display_name }}")
                self.assertEqual(resolve_variables(conn, "local_render")["profile.display_name"], "Demo User")

    def test_profile_set_uses_privacy_variables_and_legacy_render_still_works(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Local Candidate")
                item = get_variable(conn, "profile.display_name")
                self.assertEqual(item["value"], "Local Candidate")
                legacy = conn.execute("SELECT value FROM profile_variables WHERE key = 'display_name'").fetchone()
                self.assertEqual(legacy["value"], "Local Candidate")

    def test_privacy_exposure_modes_are_scope_specific(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_variable(conn, "raw_value", "secret", exposure="raw")
                set_variable(conn, "redacted_value", "secret", exposure="redacted")
                set_variable(conn, "summary_value", "secret", exposure="summarized", summary="safe summary")
                set_variable(conn, "placeholder_value", "secret", exposure="placeholder")
                set_variable(conn, "denied_value", "secret", exposure="denied")

                agent = resolve_variables(conn, "agent")
                local = resolve_variables(conn, "local_render")
                static = resolve_variables(conn, "static_demo")

        self.assertEqual(agent["profile.raw_value"], "secret")
        self.assertEqual(agent["profile.redacted_value"], "[redacted]")
        self.assertEqual(agent["profile.summary_value"], "safe summary")
        self.assertEqual(agent["profile.placeholder_value"], "{{ profile.placeholder_value }}")
        self.assertNotIn("profile.denied_value", agent)
        self.assertEqual(local["profile.denied_value"], "secret")
        self.assertEqual(static, {})

    def test_candidature_related_services_and_idempotent_initial_tasks(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(
                    conn,
                    company="Domain Co",
                    role="Platform Engineer",
                    keywords=["Python"],
                    raw_offer="Python platform role.",
                    include_cover_letter_task=True,
                )
                first_tasks = list_tasks(conn, application_id=candidature["id"])
                ensure_initial_tasks(conn, candidature["id"], include_cover_letter=True)
                second_tasks = list_tasks(conn, application_id=candidature["id"])

                create_todo(conn, "Call recruiter", application_id=candidature["id"], pinned=True)
                create_note(conn, "Human note", application_id=candidature["id"])
                create_text_blob(conn, "company_research", "Research draft", application_id=candidature["id"])
                loaded = get_candidature(conn, candidature["id"])

        self.assertEqual(len(first_tasks), len(second_tasks))
        self.assertIn("field_inference", {task["task_type"] for task in second_tasks})
        self.assertIn("company_research", {task["task_type"] for task in second_tasks})
        self.assertIn("keyword_definition", {task["task_type"] for task in second_tasks})
        self.assertIn("draft_cover_letter", {task["task_type"] for task in second_tasks})
        self.assertEqual(loaded["domain_type"], "Candidature")
        self.assertEqual(len(loaded["todos"]), 1)
        self.assertEqual(len(loaded["notes_records"]), 1)
        self.assertEqual(len(loaded["text_blobs"]), 1)

    def test_task_result_becomes_reviewable_blob_not_field_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Task Co", role="Engineer", pitch="Approved pitch")
                task = create_task(conn, "pitch_draft", "Draft pitch", application_id=app["id"], context_hint="field:pitch")
                completed = complete_task(conn, task["id"], result_body="Suggested pitch", agent_name="Agent")
                apply_task_result(conn, completed["id"])
                blobs = list_text_blobs(conn, app["id"])
                loaded = get_candidature(conn, app["id"])

        self.assertEqual(loaded["pitch"], "Approved pitch")
        self.assertEqual(blobs[0]["body"], "Suggested pitch")
        self.assertEqual(blobs[0]["review_state"], "applied")

    def test_todos_notes_text_blobs_and_keywords_are_durable(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                app = create_application(conn, company="Durable Co", role="Engineer")
                todo = create_todo(conn, "Prepare", application_id=app["id"])
                update_todo(conn, todo["id"], state="done")
                create_note(conn, "Appendable note", application_id=app["id"], note_type="call")
                create_text_blob(conn, "questions", "Question draft", application_id=app["id"])
                add_keyword_alias(conn, "ATS", "Applicant tracker")
                create_keyword_note(conn, "ATS", "Important for screening.")

                self.assertEqual(list_todos(conn, app["id"])[0]["state"], "done")
                self.assertEqual(list_notes(conn, app["id"])[0]["note_type"], "call")
                self.assertEqual(list_text_blobs(conn, app["id"])[0]["blob_type"], "questions")
                ats = next(item for item in list_keywords(conn) if item["term"] == "ATS")

        self.assertIn("Applicant tracker", ats["aliases"])
        self.assertTrue(ats["notes"])

    def test_search_initializes_fts_lazily_and_finds_domain_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(conn, company="Search Co", role="Python Engineer", raw_offer="FTS backend role.")
                create_note(conn, "Screening call note", application_id=candidature["id"])
                try:
                    rebuild_index(conn)
                    result = search(conn, "Python")
                except SearchUnavailable as exc:
                    self.fail(str(exc))

        self.assertTrue(result["available"])
        self.assertTrue(any(item["entity_type"] == "candidature" for item in result["results"]))

    def test_search_query_is_sanitized_before_fts_match(self):
        self.assertEqual(safe_match_query(""), "")
        self.assertEqual(safe_match_query("C++ / Python!!!"), '"C" "Python"')
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                create_candidature(conn, company="Syntax Co", role="Python Engineer", raw_offer="C++ and Python role.")
                try:
                    rebuild_index(conn)
                    result = search(conn, 'C++ / Python!!! "unterminated')
                except SearchUnavailable as exc:
                    self.fail(str(exc))

        self.assertTrue(result["available"])


if __name__ == "__main__":
    unittest.main()
