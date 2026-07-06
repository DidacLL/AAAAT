# Contrarian Review

PASS.

Acceptance audit date: 2026-07-06.

Findings:
- Original contract items 1-12 are explicitly covered by tests and smoke commands.
- Item 13 is covered because AAAAT includes MCP descriptor validation.
- Local-first/provider-agnostic posture is preserved: standard library only, SQLite local storage, no provider SDK, no cloud dependency.
- No frontend framework or unnecessary package dependency is present; `pyproject.toml` has an empty dependency list.
- Static demo is generated from fake payload data and has no raw intake controls, write controls, `.private` path leakage, unresolved template placeholders, email, or phone-like profile values.
- Templates use variables and do not hardcode private identity values.
- Generated artifact records include application ID, type, path, label, timestamp, source context, agent/runtime/model fields, review state, and notes.
- CLI source has no runtime Git dependency and no command requires Git.
- MCP remains a descriptor/validator surface only; it does not call an LLM internally and does not claim to be a full JSON-RPC MCP server.
- Audit found and fixed one dashboard hardening issue: an application without keywords could crash the dashboard when glossary terms existed. The renderer now falls back to the first glossary term.

Commands run:

```powershell
python -B -m unittest discover -s tests
python -B -m aaaat.cli mcp-validate
```

Manual smoke commands run against temporary storage:

```powershell
python -B -m aaaat.cli --storage <tmp>\private init
python -B -m aaaat.cli --storage <tmp>\private app create --company "Audit Demo Co" --role "Audit Engineer"
python -B -m aaaat.cli --storage <tmp>\private app list
python -B -m aaaat.cli --storage <tmp>\private app show <created_id>
python -B -m aaaat.cli --storage <tmp>\private intake add <created_id> --content "Audit intake"
python -B -m aaaat.cli --storage <tmp>\private artifact list <created_id>
python -B -m aaaat.cli --storage <tmp>\private profile set display_name "Audit Candidate"
python -B -m aaaat.cli --storage <tmp>\private profile set email "audit@example.invalid"
python -B -m aaaat.cli --storage <tmp>\private profile set summary.default "Audit summary"
python -B -m aaaat.cli --storage <tmp>\private render cv --output <tmp>\cv.tex
python -B -m aaaat.cli --storage <tmp>\private render cover-letter <created_id> --body "Audit body" --output <tmp>\cover-letter.tex
python -B -m aaaat.cli export static-demo <tmp>\static-demo.html
python -B -m aaaat.cli agent-guide
```

Result:

```text
15 tests OK
mcp-validate: ok
manual CLI smoke: ok
```

Must-fix items: none.
