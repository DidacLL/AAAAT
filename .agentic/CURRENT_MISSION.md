# Current mission — bounded AI interaction recovery before v2

Current explicit Product Owner instruction remains highest authority.

Live integration state is tracked in Issue #418; do not freeze a moving main SHA here.

## Active recovery

The active implementation effort is Issue #418:

- https://github.com/DidacLL/AAAAT/issues/418 — **Recover bounded AI interactions before v2**

Issue #418 is the single detailed recovery record. Read it after the authority sequence in `AGENTS.md`; do not reconstruct the effort from stale tests, old AI operation names, evaluator scenarios, or historical implementation.

The Product Definition, SPEC and UX authority are not being rewritten for this recovery. The defect is implementation drift against existing product priorities plus current explicit Product Owner corrections.

## Objective

Correct the bounded AI interactions identified in #418, then return to v2 release readiness.

The recovery is deliberately limited to:
- application-information inference plus conservative Tag work;
- separating application creation from CV/letter creation;
- replacing the current fake CV "tailoring" behavior with bounded CV semantic-block writing, including private-value placeholders based on field titles;
- separating the principal external fill-information journey from secondary interview preparation;
- restoring small external-AI capabilities that mirror normal AAAAT document/application journeys;
- aligning cover-letter AI and deleting stale AI surfaces only where the corrected paths make them obsolete.

Do not turn this into a new agent/task architecture, general AI cleanup programme, document-domain redesign, Blueprint/rendering redesign, or generic UX rewrite.

## Constraints

- User-editable AI instructions remain a core ownership boundary.
- AI-use permission and task-specific context are distinct; send only what the bounded invocation needs.
- Private-but-relevant values may be represented as `[USERPRIVATE:<field title>]`; do not leak the value or replace the title with developer-authored semantic explanations.
- CV AI fills AAAAT-provided user semantic blocks. It does not own document structure, layout, Blueprint, presentation roles or rendering.
- Field inference and Tag inference may launch from one user action but must not be one overloaded model prompt. Tag proposals must prefer existing Tags and must not duplicate configured application fields.
- External AI should mirror meaningful AAAAT actions, not receive generic corpus/CRUD/filesystem/shell authority.
- Tests/CI do not define AAAAT. Static typecheck/lint are hygiene only. Local llama/model evaluation is evidence after the product boundary is corrected, not a release gate or architecture authority.
- Preserve working manual/no-AI paths and the current CV Template → Working CV → Rendered CV architecture unless a concrete blocker proves otherwise.
- Do not edit Product Definition/SPEC merely to justify implementation choices.

PR #417 remains a separate evaluator/Windows-spawn recovery and must not be used as the implementation branch for #418.

## Completion

The orchestrator owns sequencing and acceptance against #418. Specialists implement one bounded slice at a time and do not declare the overall recovery complete.

When #418 is coherently implemented and reviewed, restore the release-readiness mission rather than broadening this recovery.
