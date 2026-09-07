# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

Mission #204 replaces the additive-development presentation with one coherent product UX while preserving accepted functionality, privacy/security, local ownership, human/no-AI operation, document authority, and portability gates.

## Canonical UX authority

- `docs/UX_DEFINITION.md` — the single durable UX contract for this Mission.
- `docs/UX_HISTORY_RECONCILIATION.md` — historical/research evidence only; it cannot define current navigation or interaction mechanics.

Do not recreate competing current UX-contract documents. Direct Product Owner instruction remains above repository documents; `docs/OWNER_INTENT.md` and `docs/SPEC.md` remain product/architecture authority.

The current UI and screenshots are evidence that additive development produced weak hierarchy. They are not the source from which the new information architecture is inferred.

## Product experience to preserve

UX is derived from user intentions, not entities or implemented features.

- A **Candidature** is the central context for job/application work.
- **Sources** are first-class retained material belonging to a candidature.
- **Focus** is the configurable fast-recall projection for a selected candidature.
- Complete candidature information, Sources, application material, Concepts, notes/checkable reminders, privacy/presentation controls, and secondary Activity remain reachable from candidature context without automatically becoming peer top-level destinations.
- **VCVGenerator** is the major parallel journey and works both from candidature-specific application material and standalone without a candidature.
- Reusable professional information supports many candidatures/documents and is presented as ordinary professional information; variants/differences are progressively disclosed.
- AI is contextual assistance, never a navigation destination; connection/provider administration is secondary Settings work.
- ToDos remain lightweight optional checkable notes/reminders, not a task-management pillar.
- Sparse candidature capture is normal and must require no company/role/status/priority/completeness ceremony.
- Setup, backup/recovery, TeX/environment, AI connections, portability, and host trust are important but secondary/infrequent administration.

## Development sequence

Advance one bounded stage at a time. Do not pre-create later Issues.

### Stage 0 — Issue #205: pre-development UX authority/reconciliation

Establish `docs/UX_DEFINITION.md`, reconcile historical/current UX documents, and align Mission/Issue/PR metadata. No production UI, CSS, React redesign, or broad packaged visual audit.

Documentation-only, impact-appropriate verification is sufficient. After #205 merges, close #205 and create exactly one next bounded Stage-1 design Issue.

### Stage 1 — candidature interaction/navigation design

First future UX design slice. Derive and challenge the interaction model for:

**candidature collection/search → candidature selection → selected candidature context → Focus → full information/editing → Sources → application material**

Also cover sparse candidature, long/short Sources, contextual Concepts/reminders, dirty editing, default desktop size, and the declared minimum `720×600`.

This stage is **design/interaction architecture only**. It must produce an interaction contract/wireframe-level design before any production renderer change. It must not begin by styling the current component tree.

### Stage 2 — VCVGenerator UX

Design standalone CV/letter work, candidature-linked document work, transition between candidature X and VCVGenerator, normal editing, advanced source/auditability, render/export, and retained artifact UX.

### Stage 3 — reusable professional/profile UX

Design ordinary professional-information editing and reuse in documents, with variants/differences and disclosure/privacy progressively disclosed.

### Stage 4 — Settings / setup / recovery UX

Design secondary administration for workspace, backup/restore, TeX/environment, AI connections/capabilities, configuration portability, and external-host trust implications. Avoid one giant additive Settings page.

### Stage 5 — global shell/navigation synthesis

Only after Stages 1–4 have interaction contracts, derive global navigation from the validated journeys. Do not invent peer destinations from entities.

### Stage 6 — implementation

Only after navigation/screen interaction contracts exist. Broad renderer reorganization is Class C and proceeds in the smallest coherent implementation slices with independent Reviewer, Skeptical Simplifier, packaged UX verification at default + `720×600`, and all functional/privacy/security/local-ownership gates preserved.

## Evidence to reuse

Integrated alpha acceptance PR #203 is merged at `90b578064030ce863c9eb912f854f08559fd4777`; Issue #202 is closed. Existing package/runtime, security, backup/recovery, VS Code, Source retrieval, dirty-draft, TeX, and prior visual evidence remains reusable unless a later stage changes the surface or premise it proved.

Do not repeat broad packaged audits merely because documentation or authority changed. Future packaged visual verification belongs to the interaction/implementation stage whose actual UI surface it tests.

## North star

The Mission succeeds when users can retain almost any job-related material without organizing it first, find a candidature from meaningful retained text, recover useful call context immediately, inspect/edit all important information, see application CVs/letters from that candidature, use VCVGenerator independently, work completely without AI, and inspect deeper ownership/privacy/provenance when desired.
