# Local release validation

Status: superseded until the v1 release gap ledger is closed.

Do not use historical validation commands as a human-review script. Earlier versions required fabricated internal IDs, obsolete split task/context operations, interactive stdio servers without clients, and superficial privacy checks.

The active implementation and acceptance sources are:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`
- `docs/release-checklist.md`

`aaaat-release-validate` may continue to provide developer evidence, but its passing result does not establish human-review eligibility while any active gap remains. Its stages and fixtures must be rewritten to follow the complete-work contract and actual wx product workflows.

A replacement human-review procedure must be written only after the required wx workflows, wrapper fixtures, Windows backup/restore, guided rendering, and expected-error handling are implemented. That procedure must use actual user actions and supplied deterministic fixtures. It must not ask the reviewer to design missing product behavior.
