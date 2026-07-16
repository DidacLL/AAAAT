# Local release validation

Status: automated evidence only; human review remains pending.

Do not use historical validation commands as a human-review script. Earlier versions required fabricated internal IDs, obsolete split task/context operations, interactive stdio servers without clients, and superficial privacy checks.

The active implementation and acceptance sources are:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`
- `docs/release-checklist.md`

`aaaat-release-validate` provides developer evidence and now follows the complete-work contract. Its passing result does not by itself establish human-review eligibility; real wx and external-host demonstrations remain required.

A replacement human-review procedure must be written only after the required wx workflows, wrapper fixtures, Windows backup/restore, guided rendering, and expected-error handling are implemented. That procedure must use actual user actions and supplied deterministic fixtures. It must not ask the reviewer to design missing product behavior.
