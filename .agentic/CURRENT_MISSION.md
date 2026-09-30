# Current mission — PLAN[5] integrated Applications coherence

Current explicit Product Owner instruction remains highest authority.

Base main: `77d03db25731ba40ee63d25bf62e2ff6fe47bb57`.
Active implementation Issue: #386.
Integrated PLAN[5] acceptance umbrella: #314.

The September 28 audits are not execution authority. PR #378 recovered the AAAAT northstar; PR #379 restored PLAN[0]–PLAN[4] as complete/retained and PLAN[5] as active.

## Recovered PLAN state

- **PLAN[0] — COMPLETE / RETAINED.**
- **PLAN[1] — COMPLETE / RETAINED.**
- **PLAN[2] — COMPLETE.**
- **PLAN[3] — COMPLETE / RETAINED.**
- **PLAN[4] — COMPLETE.** Issue #373 remains non-blocking future document-source work.
- **PLAN[5] — ACTIVE.** Current work is coherent user-facing desktop acceptance under #314.

## Accepted PLAN[5] slices

### Issue #380 / PR #382 — New application recovery

Accepted:

- peer direct-entry and raw-material intentions;
- direct entry uses dynamic candidature fields without requiring Source/AI;
- raw capture first retains candidature + exact Source, then exposes peer AI/manual continuations;
- manual continuation reuses selected-candidature Source/information work;
- AI continuation reuses current proposal/review semantics;
- obsolete hidden background durable-AI-write preparation path removed;
- external AI handoff remains secondary.

### Issue #383 / PR #385 — loaded Home landing console

Accepted:

- loaded Home no longer duplicates workspace create/open/demo/recovery administration;
- first-run Welcome keeps workspace-entry/recovery behavior;
- Home shows compact workspace orientation, bounded recent applications and editable document work;
- exact application/document continuations reuse existing selected-work handoffs;
- Settings remains authoritative for workspace switching/creation and backup/recovery;
- packaged ordinary work enters Applications/CVs through the persistent rail.

Exact candidate SHA `a510893e91073668286099749077ff71ddabc154`; Windows candidate run `36708230980` passed exact checkout, Windows Verify, package build and all 5 packaged runtime journeys.

Do not reopen #380 or #383 unless later work directly regresses those boundaries.

## AAAAT product boundary

AAAAT is an open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them.

Human → AAAAT, AAAAT → configured AI and external AI/tool → bounded AAAAT capability are peer directions. Manual/no-AI use remains complete. VCVGenerator/document work is independently core. Provider/model/host/protocol/carrier choices are mechanisms, not product identity.

## Current integrated Applications residual — Issue #386

Issue #386 is **not** a one-line raw-card fix. It is the next coherent Applications acceptance pass.

Current implementation already has the correct one-corpus model, search, favourite/primary information, selected editing, Sources, Tags, Documents, direct/raw creation and bounded AI capabilities. Preserve those foundations.

Three verified residuals remain together:

1. **Raw/sparse corpus recognition.** A candidature with useful retained Source but no usable favourite cue is shown as `No displayable information yet`.
2. **Selected hierarchy.** Ordinary selected candidatures render the `Send to my AI` surface before Primary information; retained external-AI access can auto-open the full task editor before the candidature itself.
3. **Raw-only selected context.** Reopening a raw-only candidature from the corpus puts its useful retained Source under generic `More`, while the initial selected view can contain no useful Primary information.

These are one retrieval → selected-context coherence problem.

## Required outcome

Implement Issue #386 exactly.

### Corpus

Recognition precedence:

1. usable user-selected favourite/primary cues;
2. bounded normalized **Retained source** fallback when no primary cue exists and Source text is retained;
3. compact neutral fallback only for genuinely content-empty candidatures.

Do not promote non-favourite fields or infer identity from Role, Organisation, labels, system keys, profession or fixed schema meaning.

Preserve field/Source/Tag search semantics, archive filtering, ordering and exact-card opening.

### Selected candidature

The candidature owns the principal view.

- Primary/favourite information is the first ordinary substantive content when present.
- Sparse/raw-only candidatures keep retained Sources immediately useful/reachable rather than hiding the only meaningful content behind generic secondary controls.
- Remaining fields, field-definition administration, documents, history and other supporting material stay progressively disclosed.
- Tags stay contextual; do not redesign their domain model.

### `Send to my AI`

Keep the accepted PLAN[2] task-scoped external-AI semantics and provider-agnostic carriers.

- Keep `Send to my AI` discoverable as a contextual application action.
- Do not let its expanded task editor preempt ordinary application content.
- Do not auto-expand the large editor merely because the retained task-access record is active.
- Preserve task templates, bounded context, copy/export, result return and dirty-state revocation/protection.
- Expanded task/context/result controls require deliberate user action in the selected view.

This is presentation/hierarchy recovery, not a PLAN[2] redesign.

## Implementation constraints

Prefer small explicit changes around:

- `CandidaturesWorkspace.tsx`;
- `candidature-projections.ts`;
- `CandidatureOpportunityResearchAccessPanel.tsx` only as needed for compact/expanded presentation;
- `CandidatureSourcesPanel.tsx` only if a small read-first/composition adjustment is required;
- existing candidature CSS/tests.

Preserve #380 New application behavior and #383 Home behavior.

Do not add schema/migrations, persistence, hard-coded identity fields, search/index redesign, duplicate candidature surfaces, router/global state/event bus, provider/plugin framework, generic dashboard/card framework, runtime dependency or document-domain redesign.

Do not redesign Home, My information, Documents, Settings, first-run or shell navigation in this run.

## Visual / responsive acceptance

Follow `docs/UX_VISUAL_DIRECTION.md` using the existing vocabulary.

- corpus remains compact and information-efficient;
- long values/Source excerpts remain bounded;
- constrained widths reflow to one reachable column rather than clipping;
- selected Primary/Source content remains reachable without AI/admin surfaces owning the initial viewport;
- expanded width uses available space productively without generic dashboard treatment.

## Acceptance evidence

Issue #386 is the full specialist contract.

Focused evidence must cover at minimum:

- favourite cues retain precedence;
- non-favourite fields are not promoted;
- raw-only Source gets bounded normalized corpus recognition;
- content-empty fallback remains coherent;
- primary cues displace Source fallback once present;
- existing field/Source/Tag search and archive filtering remain intact;
- raw-only corpus card opens the exact candidature;
- ordinary selected candidature presents application content before expanded external-AI tooling;
- retained external-AI access remains available without auto-expanding the editor;
- deliberate `Send to my AI` expansion still exposes existing task/context/transport/result behavior;
- dirty-state external-AI protection remains intact;
- raw-only selected candidature makes retained Source immediately useful/reachable;
- rich candidature Tags/Documents remain reachable;
- constrained and expanded layouts remain usable.

Run focused tests + full ordinary Verify.

Final candidate evidence must use the supported Windows package lane and include one coherent Applications journey:

raw capture → return to corpus → recognize raw-only candidature by retained Source → reopen exact candidature → Source remains readily visible → manual editing remains available.

Also exercise ordinary selected-candidature `Send to my AI` discoverability without its expanded editor dominating initial content.

No real-model or real-LaTeX rerun is required.

## Execution

One bounded implementation specialist works Issue #386 from current `main` on one feature branch.

The specialist:

- does not edit Product Definition, SPEC, Master Plan, Current Mission or Issue authority;
- does not open a PR;
- does not declare PLAN[5] complete;
- returns branch/head, changed files, focused/full verification, packaged evidence if available within its boundary, and any concrete blocker.

The orchestrator independently reviews the complete diff/evidence, triggers the Windows candidate lane when needed, opens/merges the PR if accepted, then re-inspects the full #314 boundary rather than assuming PLAN[5] completion.