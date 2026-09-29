# Current mission — PLAN[5] New application recovery

Current explicit Product Owner instruction remains highest authority.

Base main: `181c637b6e4fae5181621dcbc68e173baa768c9e` (PR #379 PLAN reclassification).
Active implementation Issue: #380.
Integrated PLAN[5] acceptance umbrella: #314.

The September 28 audits are no longer execution authority. PR #378 recovered the AAAAT northstar; PR #379 independently reclassified the accepted PLAN sequence from Product Owner evidence.

## Recovered PLAN state

- **PLAN[0] — COMPLETE / RETAINED.** PR #319 merged the accepted integrated candidature/domain baseline.
- **PLAN[1] — COMPLETE / RETAINED.** Real-behavior test-basis cleanup remains valid.
- **PLAN[2] — COMPLETE.** Real local/no-local external-AI journeys plus Issue #333's accepted `Send to my AI` interaction remain valid evidence.
- **PLAN[3] — COMPLETE / RETAINED.** Main-process composition, sandboxed renderer and dependency-health work remain sound.
- **PLAN[4] — COMPLETE.** PRs #348/#353/#358 satisfy the Product Owner-corrected document model; PR #359 recorded completion. PR #377's direct-`pdflatex` implementation remains current tested implementation, not new Product Owner semantics.
- **PLAN[5] — ACTIVE.** Coherent user interaction/visual acceptance is current product work.

Issue #373 is a non-blocking future application-level shared-`aaaat.sty` enhancement. It is not a PLAN[4] blocker and does not block this mission.

## AAAAT product boundary

AAAAT is an open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them.

Human → AAAAT, AAAAT → configured AI and external AI/tool → bounded AAAAT capability are peer operating directions. Manual/no-AI use remains complete. Provider/model/host/protocol/carrier choices are mechanisms rather than product identity. VCVGenerator/document work is independently core.

## Current concrete residual — Issue #380

The live New application interaction is still materially wrong against current Product Definition:

- `CandidatureManualEntryPanel` combines raw material and structured candidature fields into one creation screen;
- it exposes a pre-save `Parse with AI` checkbox rather than retaining raw Source material first and then offering explicit continuations;
- after save it may start `application-document-preparation.ts`;
- that helper directly persists AI-extracted candidature values, reorders/updates a Working CV, and overwrites cover-letter content without the deliberate proposal/save semantics used by the rest of the product.

This is a PLAN[5] interaction defect, not grounds to reopen PLAN[0], PLAN[2] or PLAN[4].

## Existing implementation to reuse

Do not build another candidature editor or AI proposal framework.

Current selected-candidature work already owns the correct reusable mechanisms:

- `CandidaturesWorkspace` owns corpus/selected state, field editing, Sources, Tags and candidature documents;
- `CandidatureSourcesPanel` owns retained Source interaction;
- `CandidatureInferencePanel` runs current-field job extraction using retained Source/context and the current AI-use permissions;
- `CandidatureFieldAiState` keeps existing-field proposals transient until explicit `Use this value` / corrected-value acceptance / dismissal;
- current new-field and Tag proposals also require deliberate acceptance;
- dirty-state protection and dynamic user-configured candidature fields already exist.

Issue #380 should compose those mechanisms rather than duplicate them.

## Required outcome

`New application` exposes two peer human intentions:

1. **Enter information directly** — create a sparse candidature from the current user-configured fields, without requiring raw Source material or AI.
2. **Retain raw material** — retain raw text as a candidature Source first, without requiring structured fields.

After raw retention, remain in a useful candidature task context and expose together:

- **Use AI to suggest information** — use the existing inference/proposal-review path;
- **Fill information manually** — use the existing selected-candidature information editor with the retained Source readily visible.

A raw-only candidature is complete valid work. AI failure must not weaken the manual path.

Remove the New-application background direct-write behavior. Creating a candidature or application document must not silently authorize AI to write candidature values, reorder CV content or overwrite a cover letter.

Preserve the external `applicationHandoff` import as a secondary AI → AAAAT entrance; do not redesign its protocol in this slice.

## Architecture constraints

Prefer the smallest renderer composition change around the existing surfaces.

- no router/wizard framework;
- no new state-management dependency;
- no duplicate candidature field editor;
- no schema/migration change;
- no provider/protocol redesign;
- no document-domain redesign;
- no Home/My information/Tags/Settings redesign;
- no authority-document edits from the implementation specialist.

Delete obsolete `application-document-preparation.ts` machinery if it becomes unused rather than retaining compatibility scaffolding.

## Acceptance evidence

Issue #380 is the implementation contract. At minimum prove:

- two peer New-application intentions;
- structured creation without Source/AI;
- raw-text-only retention as exactly one Source;
- post-retention AI/manual peer continuations;
- manual continuation keeps retained Source and editable candidature information in one task context and works without AI;
- AI continuation reuses the existing proposal-review semantics and does not persist an existing-field proposal until deliberate acceptance;
- AI failure preserves retained Source/manual work;
- no pre-save `Parse with AI` / background preparation direct-write path survives;
- external handoff remains reachable;
- dirty-state safety and dynamic custom fields remain intact.

Rewrite the packaged manual candidature journey around:

```text
Applications
→ New application
→ retain raw Source
→ Fill information manually
→ Source remains visible
→ enter/save candidature information
→ leave/reopen
→ Source + value remain
```

Run focused tests, full ordinary Verify, and the affected packaged manual-candidature journey. No real-LaTeX rerun is required unless the specialist unexpectedly changes rendering.

## Execution

One bounded implementation specialist works Issue #380 from current `main` on one feature branch.

The specialist:

- does not edit Product Definition, SPEC, Master Plan, Current Mission or Issue authority;
- does not open a PR;
- does not declare PLAN[5] complete;
- returns branch/head, changed files, focused/full verification, packaged journey evidence and any concrete blocker.

The orchestrator independently reviews the complete diff and evidence before opening a candidate PR. After #380 integration, inspect the complete #314 PLAN[5] boundary for the next genuine residual rather than executing historical headings mechanically.