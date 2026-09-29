# Current mission — PLAN[5] loaded Home landing console

Current explicit Product Owner instruction remains highest authority.

Base main: `c04f1696c4d05a4cf9ec698cebb3e296755079c9` (PR #382 accepted Issue #380).
Active implementation Issue: #383.
Integrated PLAN[5] acceptance umbrella: #314.

The September 28 audits are no longer execution authority. PR #378 recovered the AAAAT northstar; PR #379 restored PLAN[0]–PLAN[4] as complete/retained and PLAN[5] as active.

## Recovered PLAN state

- **PLAN[0] — COMPLETE / RETAINED.**
- **PLAN[1] — COMPLETE / RETAINED.**
- **PLAN[2] — COMPLETE.** Real local/no-local external-AI journeys and the accepted `Send to my AI` interaction remain valid.
- **PLAN[3] — COMPLETE / RETAINED.**
- **PLAN[4] — COMPLETE.** The Product Owner-corrected document model is settled; Issue #373 is a non-blocking future source enhancement.
- **PLAN[5] — ACTIVE.** Current work is coherent user-facing desktop acceptance.

## Accepted PLAN[5] slice — Issue #380 / PR #382

Issue #380 is complete. PR #382 merged as `c04f1696c4d05a4cf9ec698cebb3e296755079c9`.

Accepted behavior:

- `New application` presents peer **Enter information directly** and **Retain raw material** intentions;
- direct entry uses current dynamic candidature fields without requiring Source material or AI;
- raw capture first retains the candidature + exact Source, then exposes peer AI/manual continuations;
- manual continuation reuses the existing selected-candidature Source/information surface;
- AI continuation reuses existing inference/proposal review;
- `application-document-preparation.ts` and its background durable AI writes are removed;
- external AI handoff import remains a secondary AI → AAAAT entrance.

Exact candidate evidence on specialist SHA `51b3499868cea61a579591b93a52e24067ffeee6`:

- ordinary Verify run `36602562548` passed;
- Windows candidate run `36604242314` passed exact checkout, Windows Verify, package build and all packaged runtime journeys;
- packaged Playwright: 5/5 passed, including raw Source → manual continuation → leave/reopen persistence;
- Windows candidate ZIP SHA-256: `9cc083669b700ed6ffc32dd5800291aa341062948c599fc5ac0fdb3bc9152dcd`;
- uploaded artifact ID `11050612908`.

Do not reopen #380 unless a later change directly regresses that boundary.

## AAAAT product boundary

AAAAT is an open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them.

Human → AAAAT, AAAAT → configured AI and external AI/tool → bounded AAAAT capability are peer directions. Manual/no-AI use remains complete. VCVGenerator/document work is independently core. Provider/model/host/protocol/carrier choices remain mechanisms rather than product identity.

## Current concrete residual — Issue #383

Loaded Home still violates the recovered PLAN[5] interaction model.

Current `App.tsx` loaded Home presents:

- `Open applications`;
- `Open CVs`;
- `New workspace`;
- `Open existing workspace`;
- `Open demo`;
- workspace recovery.

That makes Home a second workspace-entry launcher after a workspace is already active.

Current `SettingsWorkspace` already owns the correct administration:

- current workspace identity;
- create/open another workspace;
- reset/delete;
- Backup/recovery.

Current `docs/UX_DEFINITION.md` requires loaded Home to be a **branded useful landing console**, not a bare launcher or generic metrics dashboard. Workspace entry belongs to first-run Welcome; loaded workspace administration belongs in Settings/shell.

## Required outcome

Implement Issue #383 exactly.

Loaded Home should provide:

1. **compact workspace orientation** — current workspace name and Local/Demo character;
2. **recent applications** — a small bounded set using existing dynamic candidature recognition data, with exact-candidature continuation through the existing selected-application path;
3. **recent editable document work** — a small bounded set of existing Working CV / editable cover-letter work using current document collections and handoffs;
4. **intentional empty states** with ordinary continuations into Applications/CVs when no recent work exists.

Remove loaded-Home workspace creation/open/demo/recovery controls. Keep those capabilities in Settings.

Do not duplicate rail AI/PDF/task/Tag status as dashboard cards. Do not turn Home into analytics, an activity feed or a navigation grid.

First-run Welcome remains unchanged in product meaning: create/open workspace are primary and recovery remains secondary/discoverable.

## Existing implementation to reuse

- `window.aaaat.candidatures.list()` and `listFields()`;
- existing candidature recognition projections;
- the selected-candidature handoff introduced/reused by #380;
- `window.aaaat.documentDomain.collections()`;
- existing document handoff/open behavior;
- persistent left-rail navigation;
- Settings workspace/backup administration.

A small loaded-Home component or small explicit prop/state extension is acceptable if it keeps `App.tsx` readable.

Do not add a router, global state library, generic recent-items framework, Home persistence table, event bus or new runtime dependency.

## Visual direction

Visible work follows `docs/UX_VISUAL_DIRECTION.md`.

Use AAAAT's existing friendly worn retrofuturist vocabulary incrementally:

- compact machine/panel framing for workspace orientation;
- paper/dossier treatment for readable recent work where useful;
- mascot/identity present without consuming the operational viewport;
- professional information clarity.

Do not start a design-system/theme project and do not produce generic SaaS KPI cards.

## Acceptance evidence

Issue #383 is the implementation contract. At minimum prove:

- loaded Home has no redundant workspace create/open/demo/recovery controls;
- Settings retains workspace create/open and backup/recovery authority;
- recent applications use dynamic recognition and can open the exact candidature;
- sparse/raw-only applications remain coherent;
- recent editable documents open through existing document handoffs;
- Home empty states are intentional and useful;
- dirty navigation protection remains intact;
- first-run Welcome retains workspace entry/recovery semantics.

Historical tests that enter work through loaded-Home launch buttons must move to persistent rail navigation unless specifically testing Home. This includes the packaged manual-candidature journey, packaged documents journey and renderer mutation-safety test.

Run focused tests + full ordinary Verify. Final candidate evidence must include affected Windows packaged manual-candidature and document journeys because this changes the loaded shell and package-entry navigation. No real-LaTeX rerun is needed unless rendering code changes.

## Execution

One bounded implementation specialist works Issue #383 from current `main` on one feature branch.

The specialist:

- does not edit Product Definition, SPEC, Master Plan, Current Mission or Issue authority;
- does not open a PR;
- does not declare PLAN[5] complete;
- returns branch/head, changed files, focused/full verification, packaged evidence if available without violating its boundary, and any concrete blocker.

The orchestrator independently reviews the complete diff, triggers the explicit Windows candidate lane when needed, opens/merges the PR if accepted, and then inspects the complete #314 boundary for the next genuine residual rather than executing historical headings mechanically.
