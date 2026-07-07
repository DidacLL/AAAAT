# AAAAT Agent Instructions

AAAAT is not an LLM wrapper. Agents may inspect scoped context, propose fields, save drafts, and ask AAAAT to render artifacts.

Use:
- `python -m aaaat.cli app list`
- `python -m aaaat.cli app show <id>`
- `python -m aaaat.cli app update <id> --next-action "..."`
- `python -m aaaat.cli intake add <id> --content "..."`
- `python -m aaaat.cli intake raw-offer --content "..."`
- `python -m aaaat.cli glossary set <term> --definition "..."`
- `python -m aaaat.cli profile missing`
- `python -m aaaat.cli review-queue`
- `python -m aaaat.cli artifact update-state <artifact_id> --state reviewed`
- `python -m aaaat.cli render cover-letter <id>`
- `python -m aaaat.cli export static-demo outputs/static-demo.html`

The browser dashboard is a compact local working surface: select an application, inspect queue/keyword/company/notes/artifacts/raw context, and make small contextual updates in full mode. Add new opportunities through raw-offer intake instead of treating the main dashboard as a creation form.

Do not place private values in public demos, source templates, docs, or examples.
