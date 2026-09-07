# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#207](https://github.com/DidacLL/AAAAT/issues/207) — design the candidature workspace and navigation interaction model before production renderer changes.

Mission #204 replaces the additive-development presentation with one coherent product UX while preserving accepted functionality, privacy/security, local ownership, human/no-AI operation, document authority, and portability gates.

## Canonical UX authority

- `docs/UX_DEFINITION.md` — the **single durable UX/interaction contract** for this Mission.
- `docs/UX_VISUAL_DIRECTION.md` — direct Product Owner visual-character reference only. It is subordinate to the UX contract for hierarchy/interaction and does not define navigation, layout mechanics, components, tokens, or implementation structure.
- `docs/UX_HISTORY_RECONCILIATION.md` — historical/research evidence only; it cannot define current navigation or interaction mechanics.

Stage-specific design contracts refine one bounded journey without replacing `UX_DEFINITION.md`. Stage 1 is recorded in `docs/UX_CANDIDATURE_INTERACTION.md`.

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

### Stage 0 — Issue #205: pre-development UX authority/reconciliation — completed

Established `docs/UX_DEFINITION.md`, reconciled UX authority/history, and recorded the staged sequence. PR #206 merged as documentation only at `bb6825f292bf2cafe3fdd630ff7a2ecef0fc409f`.

### Stage 1 — Issue #207: candidature interaction/navigation design — current

The Stage-1 contract in `docs/UX_CANDIDATURE_INTERACTION.md` derives the interaction model for:

**candidature collection/search → candidature selection → selected candidature context → Focus → full information/editing → Sources → application material**

It covers sparse capture, fast recall, long/short Sources, contextual Concepts/reminders, privacy/presentation and Activity depth, candidature-linked VCVGenerator handoff, dirty editing, default desktop composition, and the declared minimum `720×600`.

The key interaction decision is that Focus, complete information, Sources, and application material are selected-candidature intentions, not newly invented peer global destinations. At smaller supported sizes, collection and selected context transition rather than compressing all regions into clipped panes.

This stage is **design/interaction architecture only**. No production UI, CSS, React redesign, or broad packaged visual audit belongs in #207.

### Stage 2 — VCVGenerator UX

After Stage 1 is accepted and merged, create exactly one bounded design Issue for standalone CV/letter work, candidature-linked document work, transition between candidature X and VCVGenerator, normal editing, advanced source/auditability, render/export, and retained artifact UX.

Do not start it from #207.

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

Stage 1 changes documentation/design only. Do not repeat broad packaged audits merely because the interaction contract changed. Future packaged visual verification belongs to the implementation stage whose actual UI surface it tests.

## North star

The Mission succeeds when users can retain almost any job-related material without organizing it first, find a candidature from meaningful retained text, recover useful call context immediately, inspect/edit all important information, see application CVs/letters from that candidature, use VCVGenerator independently, work completely without AI, and inspect deeper ownership/privacy/provenance when desired.
