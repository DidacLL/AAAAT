# Current mission — PLAN[5] coherent product UX

Current explicit Product Owner instruction remains highest authority.

Base main: `36f73f377db17f579868a8f32fbbc2adc291a0b2` (PR #378 northstar recovery).

The September 28 audits are no longer execution authority. PR #378 repaired the canonical Product Definition, technical SPEC, Master Plan framing and repository entry point from the recovered AAAAT northstar.

## Recovered PLAN state

- **PLAN[0] — COMPLETE / RETAINED.** PR #319 merged the accepted integrated candidature/domain baseline. Later UX refinements and current Product Definition improvements do not retroactively invalidate that accepted foundation.
- **PLAN[1] — COMPLETE / RETAINED.** The real-behavior test-basis cleanup remains valid; tests that contradict current product meaning still change with the product.
- **PLAN[2] — COMPLETE.** Real local-computer and no-local external-AI journeys remain valid evidence. Issue #333 plus PRs #335/#336/#341/#342 established the accepted `Send to my AI` interaction. An internal selected-object mechanism used by a carrier is implementation detail, not a reason to reopen the PLAN by itself.
- **PLAN[3] — COMPLETE / RETAINED.** Main-process composition, sandboxed renderer and dependency-health work remain sound.
- **PLAN[4] — COMPLETE.** PRs #348/#353/#358 satisfy the Product Owner-corrected document model and PR #359 recorded completion. PR #350 explicitly replaced the earlier persistence/ownership interpretation with the settled model: one shared package/library, application-level user Blueprints under Electron `userData`, render-time Blueprint choice, no Blueprint ownership on editable CV records, and exact rendered source projects. The later audit incorrectly resurrected persistent reusable modified-package selection as a PLAN[4] gate.
- **PLAN[5] — ACTIVE.** Coherent user interaction/visual acceptance is the current product work.

## PLAN[4] clarification

ADR 0015 says editable Blueprints and modified package sources remain user-owned. The Product Owner correction in PR #350 superseded the earlier derived claim that persistent reusable modified package-source selection remained a required PLAN[4] completion boundary.

The accepted PLAN[4] source model therefore remains:

- one shared `aaaat.sty` package/library;
- application-level compatible user Blueprint discovery under Electron `userData`;
- render-time Blueprint selection;
- exact Blueprint/package/data source retained with rendered/exported artifacts;
- editable CV/template/letter data does not own presentation selection.

The current direct-`pdflatex` implementation from PR #377 is retained because it is tested and sound. Direct invocation is an implementation choice; the Product Owner requirement is pdfTeX through pdfLaTeX.

A future application-level editable shared-`aaaat.sty` configuration may still be useful product work. It is **not a blocker to PLAN[4] acceptance or PLAN[5]** and must not be smuggled back into the sequence as recovered acceptance debt.

## PLAN[5] authority

PLAN[5] is the integrated low-friction product experience, not isolated component polish.

Current Product Definition is authoritative. Issue #314 remains useful as the owner-visible UX acceptance umbrella where its owner correction agrees with current authority, but its older two-state `Focus` / peer `All data` wording is superseded.

Applications is one configurable corpus/selected-information experience. The coherent visible candidate must cover:

- first-run Create/Open with recovery secondary;
- loaded Home as a branded useful landing console rather than another workspace launcher;
- retrieval/capture-first Applications composition;
- fast recognisable corpus information and progressive selected-application detail;
- two direct New candidature approaches: structured entry and raw Source capture;
- raw Source retention as successful work, followed by clear peer AI-assisted and manual continuations;
- low-friction direct information editing with field-definition machinery progressively disclosed;
- read-first My information and document composition;
- contextual understandable AI/disclosure controls;
- Tags as a bounded shared glossary/retrieval aid;
- practical Settings language;
- intentional sparse/empty states;
- productive constrained and expanded desktop layouts;
- the mandatory AAAAT visual direction rather than generic SaaS/dashboard styling.

Useful renderer work from #360/#362/#365/#369 remains implementation material and should not be rewritten without a concrete mismatch.

## Active execution

1. Correct live Issue #314 so it expresses the current single Applications model and coherent PLAN[5] acceptance boundary rather than obsolete two-state Focus wording.
2. Reclassify Issue #373 as non-blocking future document-source enhancement rather than PLAN[4] completion work.
3. Inspect the current renderer against the coherent PLAN[5] boundary and identify the smallest **integrated** residual UX slice. Do not infer that every historical PLAN[5] heading needs more code.
4. Dispatch one bounded implementation specialist only after that residual is concrete.
5. Independently review the complete diff and real rendered/package evidence before final PLAN[5] acceptance.

The Product Owner is not routine QA or recovery analyst. Do not ask them to repeat repository-preserved decisions.