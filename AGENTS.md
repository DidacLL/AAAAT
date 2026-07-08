# AAAAT Agent Instructions

AAAAT is not an LLM wrapper and not a CRUD API for agents. Agents use capability-scoped commands with explicit input/output shapes. Do not browse, list, search, or patch the user's candidature database.

Implemented agent capability:
- `python -m aaaat.cli agent tasks --state queued`
- `python -m aaaat.cli agent context <task_id>`
- `python -m aaaat.cli agent submit <task_id> --result-body "..."`
- `python -m aaaat.cli agent submit <task_id> --result-file result.json`
- `python -m aaaat.cli agent claim <task_id>`
- `python -m aaaat.cli agent release <task_id>`

Next valid agent capability: action session.

An external LLM app may first ask AAAAT for purpose-scoped context such as `cv_generation`, `cover_letter`, `candidature_fit`, `recruiter_call`, or `form_answers`. The LLM then submits one bounded action: create a candidature from already-inferred fields, store research/form-answer data, store cover-letter body text as render input, request local rendering, or submit an existing task result.

The LLM is not the user and does not create final artifacts. AAAAT renders CVs and cover letters locally from templates, profile/application data, and explicit render inputs.

The browser dashboard is a compact local human working surface. Its routes are not an agent contract. Add new opportunities through dashboard raw-offer intake, user-directed local CLI use, or future capability-scoped agent actions; never by agents enumerating private data.

Do not place private values in public demos, source templates, docs, or examples.
