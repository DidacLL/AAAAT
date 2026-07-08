# AAAAT Agent Instructions

AAAAT is not an LLM wrapper. Agents use capability-scoped commands with explicit input/output shapes. Do not browse, list, search, or patch the user's candidature database.

Implemented agent capability:
- `python -m aaaat.cli agent tasks --state queued`
- `python -m aaaat.cli agent context <task_id>`
- `python -m aaaat.cli agent submit <task_id> --result-body "..."`
- `python -m aaaat.cli agent submit <task_id> --result-file result.json`
- `python -m aaaat.cli agent claim <task_id>`
- `python -m aaaat.cli agent release <task_id>`

Implemented agent intake capability:
- `python -m aaaat.cli agent intake raw-offer --content "..."`
- `python -m aaaat.cli agent intake raw-offer --file offer.txt`
- `python -m aaaat.cli agent intake submit-extraction <intake_id_or_task_id> --result-file fields.json`

Agent intake is allowed only as schema-bound `aaaat agent ...` operations or `/api/agent/*` routes that return narrow acknowledgements/envelopes, opaque correlation ids, task envelopes, and next allowed actions, not as generic CRUD/list/search access.

The browser dashboard is a compact local human working surface. Its routes are not an agent contract. Add new opportunities through dashboard raw-offer intake, user-directed local CLI use, or capability-scoped agent intake; never by agents enumerating private data.

Do not place private values in public demos, source templates, docs, or examples.
