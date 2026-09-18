# Current mission — PLAN[0] integrated baseline acceptance

This file is derived coordination state. Current explicit Product Owner instruction remains higher authority. Durable sequence and deferred owner requirements live in `.agentic/MASTER_PLAN.md`.

## Outcome

Finish the existing integrated candidate in PR #319 on `product/dogfood-workspace-ai-context` and remove first-class contradictions exposed by Product Owner natural use without reopening later PLAN work.

PLAN[0] is the accepted integrated baseline: current domain behavior is coherent, foundation truth is sound, and known acceptance defects are resolved before merge.

## Current first-class corrections

1. **Truthful AI reachability.** Configuration/routing or a historical success must not produce current `AI: Ready`. Current lightweight reachability or real-request evidence may establish readiness; a relevant failure must promptly invalidate stale readiness. Synthetic capability checks are optional diagnostics, not a prerequisite for ordinary AI use. Reuse existing probe/task/diagnostic state rather than adding polling or a generic health subsystem.

2. **One configurable candidature information surface, with no field-derived identity and no blank first-use corpus.** The Focus/All split and field-derived identity are gone; preserve that. Neutral first use must still be recognisable: enabled fields begin included equally in the primary presentation, with no semantic privilege for Role, Organisation or other system fields, and the user demotes/unfavourites/reorders/resizes from there. A candidature with retained values must not collapse to an unexplained “Saved application” placeholder merely because favourites were not configured. Presentation size is corpus/summary presentation metadata: it must visibly affect the configurable card/grid presentation, not resize the field editor. Values must dominate visually, with labels/updated metadata secondary, and one long value must not size unrelated cards. More/advanced reveals the remainder and deeper candidature material. Raw Source/Tag evidence remains bounded to active search explanation.

3. **Affordable light-model use is the primary AI target, without provider lock-in or hidden writes.** PLAN[0] AI extraction must be designed for resource-constrained models first, including local models on ordinary hardware, while keeping product semantics provider/runtime/model-family agnostic. The general configured connection is usable without passing synthetic capability checks; those checks remain explicit diagnostics/routing evidence. Remove provider-facing burden, keep deterministic validation local, and salvage valid partial proposals independently. AI proposals remain proposals: field values, new field definitions and document changes become ordinary AAAAT data only through an explicit user acceptance/save action.

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
