import tempfile
import unittest

from aaaat.artifacts import save_artifact
from aaaat.candidatures import create_candidature, get_candidature
from aaaat.db import connect, init_db, set_profile_variable
from aaaat.keywords import add_keyword_alias, create_keyword_note, list_keywords
from aaaat.notes import create_note, list_notes
from aaaat.privacy import get_variable, resolve_variables, set_variable
from aaaat.search import SearchUnavailable, rebuild_index, safe_match_query, search
from aaaat.tasks import complete_task, create_task, ensure_initial_tasks, list_tasks
from aaaat.text_blobs import create_text_blob, list_text_blobs
from aaaat.todos import create_todo, list_todos, update_todo


class DomainServiceTests(unittest.TestCase):
    def test_profile_variables_use_canonical_privacy_storage(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_profile_variable(conn, "display_name", "Local Candidate")
                item = get_variable(conn, "profile.display_name")
                local = resolve_variables(conn, "local")
                agent = resolve_variables(conn, "agent")
                legacy_table = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profile_variables'"
                ).fetchone()
        self.assertIsNone(legacy_table)
        self.assertEqual(item["value"], "Local Candidate")
        self.assertEqual(local["profile.display_name"], "Local Candidate")
        self.assertEqual(agent["profile.display_name"], "{{ profile.display_name }}")

    def test_privacy_exposure_is_scope_specific(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                set_variable(conn, "raw_value", "secret", exposure="raw")
                set_variable(conn, "redacted_value", "secret", exposure="redacted")
                set_variable(conn, "summary_value", "secret", exposure="summarized", summary="safe summary")
                set_variable(conn, "placeholder_value", "secret", exposure="placeholder")
                set_variable(conn, "denied_value", "secret", exposure="denied")
                agent = resolve_variables(conn, "agent")
                local = resolve_variables(conn, "local")
        self.assertEqual(agent["profile.raw_value"], "secret")
        self.assertEqual(agent["profile.redacted_value"], "[redacted]")
        self.assertEqual(agent["profile.summary_value"], "safe summary")
        self.assertEqual(agent["profile.placeholder_value"], "{{ profile.placeholder_value }}")
        self.assertNotIn("profile.denied_value", agent)
        self.assertEqual(local["profile.denied_value"], "secret")

    def test_candidature_related_records_and_initial_preparation_are_durable(self):
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
                first = list_tasks(conn, application_id=candidature["id"])
                ensure_initial_tasks(conn, candidature["id"], include_cover_letter=True)
                second = list_tasks(conn, application_id=candidature["id"])
                create_todo(conn, "Call recruiter", application_id=candidature["id"], pinned=True)
                create_note(conn, "Human note", application_id=candidature["id"])
                create_text_blob(conn, "company_research", "Research draft", application_id=candidature["id"])
                loaded = get_candidature(conn, candidature["id"])
        self.assertEqual(len(first), len(second))
        self.assertTrue({"field_inference", "company_research", "keyword_definition", "draft_cover_letter"}.issubset({item["task_type"] for item in second}))
        self.assertEqual(loaded["domain_type"], "Candidature")
        self.assertEqual(len(loaded["todos"]), 1)
        self.assertEqual(len(loaded["notes_records"]), 1)
        self.assertEqual(len(loaded["text_blobs"]), 1)

    def test_field_inference_preserves_current_user_values(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(
                    conn,
                    company="Apply Co",
                    role="Engineer",
                    pitch="Human pitch",
                    include_field_inference_task=False,
                    include_company_research_task=False,
                    include_keyword_detection_task=False,
                )
                task = create_task(conn, "field_inference", "Review offer details", application_id=candidature["id"], context_hint="candidature:field_inference")
                completed = complete_task(conn, task["id"], result_body='{"fields": {"pitch": "Generated pitch", "location": "Remote"}}')
                loaded = get_candidature(conn, candidature["id"])
        self.assertEqual(loaded["pitch"], "Human pitch")
        self.assertEqual(loaded["location"], "Remote")
        self.assertIn("Stale against user/current edits", completed["notes"])

    def test_conflicting_text_result_remains_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(
                    conn,
                    company="Result Co",
                    role="Engineer",
                    company_research="Human research",
                    include_field_inference_task=False,
                    include_company_research_task=False,
                    include_keyword_detection_task=False,
                )
                task = create_task(conn, "company_research", "Update company context", application_id=candidature["id"], context_hint="candidature:company_research")
                completed = complete_task(conn, task["id"], result_body="Generated research")
                loaded = get_candidature(conn, candidature["id"])
                blobs = list_text_blobs(conn, candidature["id"])
        self.assertEqual(loaded["company_research"], "Human research")
        self.assertIn("Stale company_research", completed["notes"])
        self.assertTrue(any(item["blob_type"] == "company_research" and item["review_state"] == "history" for item in blobs))

    def test_keyword_result_updates_empty_definition(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(
                    conn,
                    company="Keyword Co",
                    role="Engineer",
                    keywords=["NewTerm"],
                    include_field_inference_task=False,
                    include_company_research_task=False,
                    include_keyword_detection_task=False,
                )
                task = create_task(conn, "keyword_definition", "Define term", application_id=candidature["id"], context_hint="keyword:NewTerm")
                complete_task(conn, task["id"], result_body='{"definition": "New definition"}')
                glossary = {item["term"]: item["definition"] for item in list_keywords(conn)}
        self.assertEqual(glossary["NewTerm"], "New definition")

    def test_artifact_backed_document_result_remains_current_draft(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(
                    conn,
                    company="Artifact Co",
                    role="Writer",
                    include_field_inference_task=False,
                    include_company_research_task=False,
                    include_keyword_detection_task=False,
                )
                artifact = save_artifact(conn, candidature["id"], "cv", "draft.tex", "CV draft", source_context="task:test")
                task = create_task(conn, "draft_cv", "Prepare tailored CV", application_id=candidature["id"], context_hint="artifact:cv")
                complete_task(conn, task["id"], artifact_id=artifact["id"])
                loaded = get_candidature(conn, candidature["id"])
        current = next(item for item in loaded["artifacts"] if item["id"] == artifact["id"])
        self.assertEqual(current["review_state"], "draft")

    def test_todo_note_and_text_blob_are_durable(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(
                    conn,
                    company="Durable Co",
                    role="Engineer",
                    include_field_inference_task=False,
                    include_company_research_task=False,
                    include_keyword_detection_task=False,
                )
                todo = create_todo(conn, "Prepare", application_id=candidature["id"])
                update_todo(conn, todo["id"], state="done")
                create_note(conn, "Appendable note", application_id=candidature["id"], note_type="call")
                create_text_blob(conn, "questions", "Question draft", application_id=candidature["id"])
                todos = list_todos(conn, candidature["id"])
                notes = list_notes(conn, candidature["id"])
                blobs = list_text_blobs(conn, candidature["id"])
        self.assertEqual(todos[0]["state"], "done")
        self.assertEqual(notes[0]["note_type"], "call")
        self.assertTrue(any(item["blob_type"] == "questions" and item["body"] == "Question draft" for item in blobs))

    def test_keyword_alias_and_note_are_durable(self):
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                add_keyword_alias(conn, "ATS", "Applicant tracker")
                create_keyword_note(conn, "ATS", "Important for screening.")
                ats = next(item for item in list_keywords(conn) if item["term"] == "ATS")
        self.assertIn("Applicant tracker", ats["aliases"])
        self.assertTrue(any(item["body"] == "Important for screening." for item in ats["notes"]))

    def test_search_uses_sanitized_fts_queries(self):
        self.assertEqual(safe_match_query(""), "")
        self.assertEqual(safe_match_query("C++ / Python!!!"), '"C" "Python"')
        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            with connect(tmp) as conn:
                candidature = create_candidature(conn, company="Search Co", role="Python Engineer", raw_offer="C++ and Python role.")
                create_note(conn, "Screening call note", application_id=candidature["id"])
                try:
                    rebuild_index(conn)
                    normal = search(conn, "Python")
                    malformed = search(conn, 'C++ / Python!!! "unterminated')
                except SearchUnavailable as exc:
                    self.fail(str(exc))
        self.assertTrue(normal["available"])
        self.assertTrue(any(item["entity_type"] == "candidature" for item in normal["results"]))
        self.assertTrue(malformed["available"])


if __name__ == "__main__":
    unittest.main()
