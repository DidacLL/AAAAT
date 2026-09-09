# Active Mission — Prepare first real-use v2 baseline decision

**Mission:** [Issue #235](https://github.com/DidacLL/AAAAT/issues/235), starting from post-UX merged `main` `9e238b90be351ae55ac5732a5b136bc6dd8aebc8`.

**Current bounded Issue:** [#236](https://github.com/DidacLL/AAAAT/issues/236) — audit the first real-use baseline candidate and reconcile repository state.

Mission #204 — cohesive product UX and information architecture — is complete. Its final Stage 13 / #233 merged through PR #234 as `9e238b90be351ae55ac5732a5b136bc6dd8aebc8` after exact-head Reviewer `MERGE`, Skeptical Simplifier `PASS`, and selected Verification gates.

## Authority and decision boundary

`docs/OWNER_INTENT.md` and `docs/SPEC.md` explicitly state that AAAAT currently has **no real-user v2 compatibility baseline**. Development-era schema/migrations may still be corrected directly when product meaning requires it.

Only an explicit Product Owner decision may establish the first real-use/release data baseline. Once established, the approved baseline migration history becomes immutable and later schema evolution must use new numbered migrations with hash verification.

This Mission therefore prepares one evidence-backed baseline decision; it does not infer approval from green CI, the alpha package label, prior acceptance, or this Mission's own completion.

## Stage 0 — Issue #236: baseline-candidate audit — current

Audit the post-UX product without changing production behavior unless a concrete blocker is found:

- identify the exact candidate runtime/data commit, package version, and ordered migration/schema set;
- verify fresh/current workspace migration integrity and failure behavior from current code/tests;
- map reusable hard-gate evidence for local ownership, no-AI/manual use, renderer isolation, privacy/operation boundaries, backup/restore, portable user-owned documents, and packaged desktop behavior;
- confirm repository docs do not already claim a released/immutable v2 baseline;
- distinguish explicit authority-approved deferrals from actual baseline blockers;
- record the result in `docs/REAL_USE_BASELINE_CANDIDATE.md`.

If a concrete blocker is found, derive exactly one bounded correction Issue and continue autonomously. If no blocker is found, merge the audit/reconciliation as Class B, close #236, and leave Mission #235 at one explicit Product Owner baseline-decision gate.

## Candidate currently under audit

Runtime/data candidate: `9e238b90be351ae55ac5732a5b136bc6dd8aebc8`.

Application version: `2.0.0-alpha.0`.

Current ordered workspace migrations:

1. `001_workspace.sql`
2. `002_profile.sql`
3. `003_documents.sql`
4. `004_candidatures.sql`
5. `005_concepts.sql`
6. `006_activity.sql`
7. `007_career_context.sql`
8. `008_candidature_information.sql`
9. `009_todos.sql`

`src/main/workspace.ts` derives and validates migration SHA-256 history and applies missing migrations transactionally.

## Evidence to reuse

- Integrated alpha real-use acceptance: Issue #202 / PR #203, merged as `90b578064030ce863c9eb912f854f08559fd4777`.
- Cohesive UX Mission #204: Stages 0–13, completed by PR #234 / merge `9e238b90be351ae55ac5732a5b136bc6dd8aebc8`.
- Verify #548: Fast + Windows/macOS/Linux release packaging/runtime + aggregate gate.
- Verify #550: Fast + real Linux packaged runtime + aggregate gate for the final Stage-13 production behavior.
- Verify #551: final test-only head Fast verification after removal of an implementation-identity assertion.

Reuse older evidence only where later changes do not alter its premises; do not mechanically rerun every historical lane.

## Explicit non-goals

Do not create compatibility migrations, freeze migrations before owner approval, bump/announce a release, implement deferred LaTeX styling/template collaboration, add release/update/telemetry/cloud machinery, or invent a generic migration/release framework.

## North star

Reach one precise Product Owner decision: either a concrete engineering blocker remains, or a named commit is demonstrably ready to become AAAAT's first real-use v2 compatibility baseline with the future migration/data-preservation consequences understood.
