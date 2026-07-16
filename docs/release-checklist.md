# AAAAT v1 release checklist

Status: blocked. PR #45 must remain draft.

Implementation authority:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`

This checklist intentionally does not repeat detailed requirements. Repetition previously allowed obsolete concepts to survive in release review material.

## Automated eligibility

All items must pass:

- supported Python installation and packaging;
- complete behavioral suite;
- Windows and Unix backup/restore;
- upgrade idempotency and data preservation;
- wx clean-workspace onboarding behavior;
- distinct Smart View and Detailed View contracts;
- one candidature note and structured keyword editing;
- standard assisted onboarding without internal jargon;
- complete-work acquisition through independent wrappers;
- progress/result/action canonical equivalence;
- MCP subprocess round trip using a supplied client or fixture;
- browser companion or portable result round trip;
- guided profile completion and artifact rendering;
- expected errors produce concise messages without tracebacks;
- structural privacy, cross-task isolation, capability lifecycle, and path confinement.

A green Linux/Python matrix alone is not release eligibility.

## Human-review eligibility

Do not ask for human review until the gap ledger is closed and the repository contains concrete executable instructions or fixtures for every requested demonstration.

Human review must use actual wx workflows. It must not require the reviewer to:

- fabricate or discover internal IDs;
- manually create internal tasks;
- infer undocumented MCP JSON-RPC messages;
- launch a stdio server without a client;
- design a browser native-host installation;
- invent a portable result format;
- write an Advanced integration fixture from scratch;
- interpret raw tracebacks as expected behavior;
- validate privacy with word searches.

## Build gates

The release candidate must still pass:

```bash
python -m pip wheel . --no-deps --wheel-dir dist
python -m pip install dist/aaaat-*.whl
aaaat --version
aaaat-desktop --help
aaaat-upgrade --help
aaaat-mcp --help
aaaat-browser-host --self-test
aaaat mcp-validate
python -m compileall -q aaaat tests
python -B -m unittest discover -s tests
```

The complete suite must pass on Python 3.11, 3.12, and 3.13. Windows-specific backup/restore behavior must run on Windows CI or equivalent maintained validation.

## Final decision

`RELEASE_READY` requires:

1. all automated eligibility items green;
2. all human demonstrations completed on supported platforms;
3. no unresolved release blocker in the gap ledger;
4. PR body updated with the exact validated head and remaining non-blocking notes;
5. direct maintainer approval.
