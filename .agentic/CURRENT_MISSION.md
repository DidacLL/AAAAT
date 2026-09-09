# Active Mission — Prepare first real-use v2 baseline decision

**Mission:** [Issue #235](https://github.com/DidacLL/AAAAT/issues/235).

**Current engineering Issue:** none. Stage 0 / [#236](https://github.com/DidacLL/AAAAT/issues/236) is complete through PR #237. Mission #235 is now at the explicit Product Owner baseline-decision gate.

Mission #204 — cohesive product UX and information architecture — is complete. Its final production merge is `9e238b90be351ae55ac5732a5b136bc6dd8aebc8` (PR #234).

## Decision boundary

`docs/OWNER_INTENT.md` and `docs/SPEC.md` state that AAAAT currently has **no real-user v2 compatibility baseline**. Only an explicit Product Owner decision may establish the first real-use/release data baseline.

The Stage-0 audit found no concrete engineering blocker to nominating runtime/data commit:

`9e238b90be351ae55ac5732a5b136bc6dd8aebc8`

as the first real-use v2 compatibility baseline candidate.

The complete audit is `docs/REAL_USE_BASELINE_CANDIDATE.md`.

## Candidate

Application version: `2.0.0-alpha.0`.

Candidate ordered workspace migration history:

1. `001_workspace.sql`
2. `002_profile.sql`
3. `003_documents.sql`
4. `004_candidatures.sql`
5. `005_concepts.sql`
6. `006_activity.sql`
7. `007_career_context.sql`
8. `008_candidature_information.sql`
9. `009_todos.sql`

`src/main/workspace.ts` derives and validates migration SHA-256 history, fails closed on version/name/hash mismatch, and applies missing migrations transactionally.

## Completed audit evidence

- Stage 0 / #236 — baseline-candidate audit; PR #237 merged as `7ceedc7d2356d0fc0d6a2da90b8f6ae8fbe584e2`; Verify #552 passed the selected documentation-only Verification gate.
- Integrated alpha real-use acceptance — #202 / PR #203, merge `90b578064030ce863c9eb912f854f08559fd4777`.
- Cohesive UX Mission #204 — Stages 0–13, ending at runtime/data merge `9e238b90be351ae55ac5732a5b136bc6dd8aebc8`.
- Verify #548 — Fast + Windows/macOS/Linux release packaging/runtime + aggregate gate.
- Verify #550 — Fast + real Linux packaged runtime + aggregate gate for final Stage-13 production behavior.
- Verify #551 — final test-only Stage-13 head verification after removal of an implementation-identity assertion.

No current repository document claims that migrations `001`–`009` are already released/immutable compatibility history.

## If the Product Owner approves

Approval must explicitly name the intended baseline commit. If `9e238b90be351ae55ac5732a5b136bc6dd8aebc8` is approved:

- workspaces created from that baseline become real compatibility obligations;
- these exact migrations `001`–`009` become immutable baseline history;
- later schema evolution uses new numbered migrations and preserves migration-hash validation;
- backup/restore and future upgrade verification must preserve data from that baseline forward;
- the approval does **not** itself announce a release or require changing the `2.0.0-alpha.0` version label;
- v1 migration remains out of scope unless separately authorized.

Until explicit approval, the repository remains pre-baseline and development-era direct schema correction remains allowed under SPEC.

## Non-blocking deferrals

Detailed CV section/style/typography/font collaboration remains explicitly deferred to later Product Owner LaTeX work. No AI connection, alternate TeX engine, dashboard, template marketplace, updater, telemetry, cloud sync, plugin system, or generic workflow/agent framework is required for this baseline decision.

## Stop condition

Do not create another engineering Issue merely to avoid the decision gate. The next action is one explicit Product Owner decision on the named baseline candidate. If the Product Owner declines because of a concrete concern, derive the smallest justified correction from that concern and resume autonomous engineering.
