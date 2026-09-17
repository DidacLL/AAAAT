# Current mission — PLAN[0] integrated baseline acceptance

This file is derived coordination state. Current explicit Product Owner instruction remains higher authority. Durable sequence and deferred owner requirements live in `.agentic/MASTER_PLAN.md`.

## Outcome

Finish the existing integrated candidate in PR #319 on `product/dogfood-workspace-ai-context` and remove first-class contradictions exposed by Product Owner natural use without reopening later PLAN work.

PLAN[0] is the accepted integrated baseline: current domain behavior is coherent, foundation truth is sound, and known acceptance defects are resolved before merge.

## Current first-class corrections

1. **Truthful AI state.** Configuration/routing or a historical success must not produce current `AI: Ready`. Current successful validation/request evidence may establish readiness; a relevant failure must promptly invalidate stale readiness. Reuse existing validation/task/diagnostic state rather than adding polling or a generic health subsystem.

2. **One configurable candidature information surface, with no field-derived identity.** Remove the Focus/All split and separate “Choose Focus information” control. Favourite/starred fields appear first in user-controlled order and size; More/advanced reveals the remaining fields. AAAAT must not predeclare Role, Organisation or any other field as identity/favourite/primary. Remove `identityOrder` from the current schema/contracts and remove field/source-derived `record.label` semantics. Any compact local reference is a renderer-only presentation from user-chosen favourites, with a neutral fallback, and must not leak into search, AI context, privacy projection or external interfaces as hidden data. Raw Source may explain an active search match but is not an implicit normal field. Replace equal-row generic card layout so one long candidature does not size unrelated entries.

## Foundation corrections already completed and to preserve

- The accidental `720×600` BrowserWindow product/minimum assumption is removed without another arbitrary fixed minimum.
- `src/main/schema.sql` is the sole current workspace structural truth; validation derives structural expectations from it while retaining meaningful corruption/incompatibility and required workspace-state checks.
- Development verification stays lightweight and branch-general; stronger Windows packaged verification is an explicit run-boundary operation.

Do not pull PLAN[1] test redesign, PLAN[3] architecture cleanup, PLAN[4] document work, PLAN[5] broader UX refinement, or Linux/macOS finalization into this run. Those are preserved in `.agentic/MASTER_PLAN.md`.

## Verification model

Development changes use focused, proportional verification. Do not repeatedly spend compute on unrelated full gates.

At the final PLAN[0] runtime boundary, produce a Windows candidate only when runtime changes require a new candidate and tie the evidence to the exact product head. Linux/macOS cross-OS verification remains deferred.

CI/package success is engineering evidence, not Product Owner acceptance and not merge authority.

## Acceptance gate

PLAN[0] completes only when the integrated baseline is accepted by the Product Owner, is on `main`, and no known first-class integrity contradiction remains.
