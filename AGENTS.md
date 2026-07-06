# AAAAT Agent Instructions

AAAAT is not an LLM wrapper. Agents may inspect scoped context, propose fields, save drafts, and ask AAAAT to render artifacts.

Use:
- `python -m aaaat.cli app list`
- `python -m aaaat.cli app show <id>`
- `python -m aaaat.cli app update <id> --next-action "..."`
- `python -m aaaat.cli intake add <id> --content "..."`
- `python -m aaaat.cli glossary set <term> --definition "..."`
- `python -m aaaat.cli profile missing`
- `python -m aaaat.cli artifact update-state <artifact_id> --state reviewed`
- `python -m aaaat.cli render cover-letter <id>`
- `python -m aaaat.cli export static-demo outputs/static-demo.html`

Do not place private values in public demos, source templates, docs, or examples.
