# AAAAT Agent Instructions

AAAAT is not an LLM wrapper. Agents use task envelopes, task-specific context, and task result submission. Do not browse, list, search, or patch the user's candidature database.

Use:
- `python -m aaaat.cli agent tasks --state queued`
- `python -m aaaat.cli agent context <task_id>`
- `python -m aaaat.cli agent submit <task_id> --result-body "..."`
- `python -m aaaat.cli agent submit <task_id> --result-file result.json`
- `python -m aaaat.cli agent claim <task_id>`
- `python -m aaaat.cli agent release <task_id>`

The browser dashboard is a compact local human working surface. Its routes are not an agent contract. Add new opportunities through dashboard raw-offer intake or user-directed local CLI use, not by agents enumerating private data.

Do not place private values in public demos, source templates, docs, or examples.
