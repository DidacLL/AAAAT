# Current mission — PLAN[5] sparse/raw corpus recognition

Current explicit Product Owner instruction remains highest authority.

Base main: `7d900411cfbe734723d843100b92c50f4f720ba3` (PR #385 accepted Issue #383).
Active implementation Issue: #386.
Integrated PLAN[5] acceptance umbrella: #314.

The September 28 audits are no longer execution authority. PR #378 recovered the AAAAT northstar; PR #379 restored PLAN[0]–PLAN[4] as complete/retained and PLAN[5] as active.

## Recovered PLAN state

- **PLAN[0] — COMPLETE / RETAINED.**
- **PLAN[1] — COMPLETE / RETAINED.**
- **PLAN[2] — COMPLETE.**
- **PLAN[3] — COMPLETE / RETAINED.**
- **PLAN[4] — COMPLETE.** Issue #373 remains a non-blocking future source enhancement.
- **PLAN[5] — ACTIVE.** Current work is coherent user-facing desktop acceptance under #314.

## Accepted PLAN[5] slices

### Issue #380 / PR #382 — New application recovery

Accepted behavior:

- peer direct-entry and raw-material intentions;
- direct entry uses dynamic candidature fields without requiring Source/AI;
- raw capture first retains candidature + exact Source, then exposes peer AI/manual continuations;
- manual continuation reuses selected-candidature Source/information work;
- AI continuation reuses current proposal/review semantics;
- obsolete background durable-AI-write preparation path removed;
- external AI handoff remains secondary.

Exact candidate SHA `51b3499868cea61a579591b93a52e24067ffeee6`; Windows candidate run `36604242314` passed package build and all 5 packaged runtime journeys.

### Issue #383 / PR #385 — loaded Home landing console

Issue #383 is complete. PR #385 merged as `7d900411cfbe734723d843100b92c50f4f720ba3`.

Accepted behavior:

- loaded Home no longer duplicates workspace create/open/demo/recovery administration;
- first-run Welcome keeps workspace-entry/recovery behavior;
- Home shows compact active-workspace orientation, bounded recent applications and editable document work;
- recent application recognition uses dynamic candidature data with raw/sparse fallback;
- exact application/document continuations reuse existing selected-work handoffs;
- Settings remains authoritative for workspace switching/creation and backup/recovery;
- ordinary packaged journeys enter Applications/CVs through the persistent rail.

Exact candidate SHA `a510893e91073668286099749077ff71ddabc154`:

- orchestrator Verify run `36708230950` + verification gate passed;
- Windows candidate run `36708230980` passed exact checkout, Windows Verify, package build and all 5 packaged runtime journeys;
- Windows package SHA-256 `e20a5ca29806c52bca720d6774e2fb312b7aa5482965c6d0baa202c081e36a80`;
- uploaded candidate artifact ID `11092419934`.

Do not reopen #380 or #383 unless later work directly regresses their accepted boundaries.

## AAAAT product boundary

AAAAT is an open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them.

Human → AAAAT, AAAAT → configured AI and external AI/tool → bounded AAAAT capability are peer directions. Manual/no-AI use remains complete. VCVGenerator/document work is independently core. Provider/model/host/protocol/carrier choices remain mechanisms rather than product identity.

## Current concrete residual — Issue #386

Applications corpus currently renders user-selected favourite/primary information correctly, but when no usable primary cue exists it falls back to `No displayable information yet` even if the candidature contains useful retained raw Source material.

This contradicts #314: sparse/raw-only candidatures are valid and must remain recognizable from useful retained material during ordinary corpus browsing.

Historical projection tests explicitly freeze the superseded rule that raw Source never appears as ordinary corpus recognition. Those tests must now follow current Product Owner authority rather than preserve the old behavior.

## Required outcome

Implement Issue #386 exactly.

Recognition precedence is:

1. usable **favourite/primary field cues**;
2. a compact bounded **Retained source** excerpt when there are no primary cues and Source text exists;
3. a neutral compact saved-application fallback only when there is genuinely no useful recognition content.

Important constraints:

- do not promote non-favourite retained field values;
- do not infer identity from Role/Organisation/labels/system keys or profession-specific semantics;
- Source fallback is local retained material, not AI context/disclosure policy;
- favourite cues replace the fallback once available;
- search still independently explains matching fields/Sources/Tags;
- archive filtering/order/click behavior remain unchanged.

Keep primary cues and fallback recognition as distinct projection concepts. A small helper in `candidature-projections.ts` is appropriate, and `LoadedHome` may reuse it so raw-only representation does not drift.

## Visual / architecture constraints

Preserve the current compact paper/dossier corpus treatment and `docs/UX_VISUAL_DIRECTION.md`.

Long Source material must be normalized and bounded so cards remain independently compact. Constrained widths continue to stack/reflow rather than clip.

Do not add schema/migrations, persistence, hard-coded identity fields, AI/provider/document-domain changes, search redesign, router/global state/event bus, generic card frameworks or runtime dependencies.

Do not redesign selected candidature, New application, Home, My information, Documents, Tags, Settings or the rail.

## Acceptance evidence

Issue #386 is the implementation contract. At minimum prove:

- primary/favourite field cues retain precedence;
- non-favourite fields are not promoted;
- raw-only Source receives a bounded recognizable fallback;
- long Source text is normalized/bounded;
- content-empty candidature has a coherent neutral fallback;
- primary cues displace Source fallback once present;
- search field/Source/Tag matches and archive filtering remain intact;
- raw-only corpus card opens the exact existing selected-candidature surface.

Run focused tests + full ordinary Verify.

Because this changes the primary Applications corpus, final candidate evidence must include a Windows packaged journey proving a retained raw-only candidature can be recognized and reopened from the corpus while preserving #380 raw-retention/manual-continuation behavior.

No real-model or real-LaTeX rerun is required.

## Execution

One bounded implementation specialist works Issue #386 from current `main` on one feature branch.

The specialist:

- does not edit Product Definition, SPEC, Master Plan, Current Mission or Issue authority;
- does not open a PR;
- does not declare PLAN[5] complete;
- returns branch/head, changed files, focused/full verification, packaged evidence if available within its boundary, and any concrete blocker.

The orchestrator independently reviews the complete diff/evidence, triggers the Windows candidate lane when needed, opens/merges the PR if accepted, then re-inspects the full #314 boundary rather than assuming PLAN[5] completion.