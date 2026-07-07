# AAAAT Agent Instructions

AAAAT is not an LLM wrapper. Agents use capability-scoped commands with explicit input/output shapes. Do not browse, list, search, or patch the user's candidature database.

Implemented agent capability:
- `python -m aaaat.cli agent tasks --state queued`
- `python -m aaaat.cli agent context <task_id>`
- `python -m aaaat.cli agent submit <task_id> --result-body "..."`
- `python -m aaaat.cli agent submit <task_id> --result-file result.json`
- `python -m aaaat.cli agent claim <task_id>`
- `python -m aaaat.cli agent release <task_id>`

Planned agent capabilities may include narrow raw-offer intake and structured extraction/proposal submission. These are allowed only as schema-bound `aaaat agent ...` operations or `/api/agent/*` routes that return narrow acknowledgements/envelopes, not as generic CRUD/list/search access.

The browser dashboard is a compact local human working surface. Its routes are not an agent contract. Add new opportunities through dashboard raw-offer intake, user-directed local CLI use, or future capability-scoped agent intake; never by agents enumerating private data.

Do not place private values in public demos, source templates, docs, or examples.
