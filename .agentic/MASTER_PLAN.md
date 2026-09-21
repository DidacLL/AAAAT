# AAAAT master plan

This is the durable sequencing and owner-requirements record for the path to alpha. Current explicit Product Owner instruction remains higher authority; repository authority is still resolved through `AGENTS.md`.

`CURRENT_MISSION.md` describes only the active run. This file preserves later PLANs and owner findings so they are not lost when missions, issues, PRs, or agents change.

## Recovery checkpoint — active and blocking further sequence

A Product Owner-directed re-audit after PLAN[4] found that several earlier completions confused **mechanism proof** with **product capability completion**. Later missions and derived documentation then normalized those mechanisms as if they were the original requirement.

This checkpoint is not a new PLAN number and is not permission for another broad redesign. It restores authority before any further implementation.

Current status:

- **PLAN[0] — integrated UI/domain baseline accepted, but some AI/setup/interoperability foundation claims require recovery.** Preserve the accepted candidature/domain/UI corrections, current-schema authority, local ownership and mutation boundaries. Do not reopen those merely because integration/setup capability was narrowed. Re-audit only the specific foundation claims whose acceptance depended on synthetic/model/host evidence or whose useful interoperability capability was removed.
- **PLAN[1] — test-basis cleanup retained.** The smaller test basis is useful engineering work. It does not prove real-model or real-third-party-host acceptance, and removal of packaged synthetic AI tests must not be cited as evidence that those product outcomes are complete.
- **PLAN[2] — REOPENED.** The MCP stdio server and portable application-handoff JSON are implemented carriers, not completion of external-AI-originated user journeys. Acceptance must begin in representative real third-party AI environments, with and without local-computer access, and must carry useful work produced by that external AI rather than reducing the external system to a raw-offer launcher for deterministic AAAAT boilerplate.
- **PLAN[3] — implementation retained.** The explicit IPC composition, readability work and dependency triage remain useful unless a recovered product requirement directly invalidates a piece. Do not redo PLAN[3] merely because the preceding gate was falsely closed.
- **PLAN[4] — REOPENED.** Retain the real portable rendering, immutable artifact and cover-letter/packet infrastructure from PR #324. The intended owner-approved document package remains unresolved: LaTeX2e public API, expl3 internals, and user-owned editable blueprints/modified package sources require the owner-paired design phase preserved by ADR 0015. A small macro facade and real pdfLaTeX portability proof are infrastructure, not completion of that design.
- **PLAN[5] — NOT STARTED and BLOCKED.** Do not perform final UX refinement until the recovered PLAN[2] gate is settled and PLAN[4] is genuinely completed.

The recovery checkpoint exits only when:

1. current owner authority has been traced to the actual implementation for the affected AI/setup/interoperability/document capabilities;
2. each major affected capability is classified as **implemented and actually demonstrated**, **implemented but only synthetically demonstrated**, **partial/scaffold**, **removed during drift**, **missing**, or **superseded by explicit owner decision**;
3. derived SPEC/Mission text no longer presents current carriers or scaffolds as the product requirement;
4. known false claims such as the non-rendering rendering self-test are corrected;
5. one concrete PLAN[2] acceptance set is defined from representative real user environments without pre-selecting a transport merely because it already exists.

No PLAN[5] work and no new broad feature implementation belongs inside this checkpoint.

## Sequence to alpha

### PLAN[0] — accepted integrated baseline, with bounded recovery notes

The accepted baseline established the current candidature/domain model and owner-reviewed interaction direction:

- one configurable Applications information surface;
- no field-derived candidature identity;
- user-controlled favourite/order/presentation;
- truthful current AI reachability semantics;
- explicit acceptance before AI output becomes durable data;
- local/manual/no-AI use remains complete;
- no arbitrary fixed BrowserWindow minimum;
- `schema.sql` is the single structural workspace schema authority;
- ordinary development verification is proportional.

Affordable/lightweight AI usefulness remains a product requirement. Existing provider contracts, partial-result salvage and local validation are useful foundations, but mocked OpenAI-compatible HTTP is not sufficient evidence that an actual constrained model satisfies the required journeys.

Setup/integration capability removed or narrowed during PR #319 is not automatically obsolete merely because the integrated baseline was accepted. Recover the user journey from higher authority before deciding whether deleted VS Code configuration, CV disclosure/render operations or other prior work should be restored, replaced or remain superseded.

### PLAN[1] — real test basis

Retain the cleanup of development-era AI-generated faux guardrails and the smaller basis around real user/domain promises.

Do not use passing tests, lower test count or removal of packaged synthetic AI journeys as product-acceptance evidence for PLAN[0]/PLAN[2]. Verification evidence proves only the boundary actually exercised.

### PLAN[2] — external-AI-originated journeys — REOPENED

Validate bounded journeys that **begin in real third-party AI systems**, including:

- at least one representative environment with local-computer/tool access; and
- at least one representative environment without local-computer access.

The product goal is a bounded working channel through an interaction surface the user already has, with setup that hides transport/configuration mechanics where practical.

MCP, files, clipboard, browser/desktop automation, synchronized rendezvous mechanisms or another carrier may be appropriate for a concrete environment. None is the PLAN outcome by itself.

Acceptance must demonstrate the external AI doing useful work before AAAAT receives the result. The contract must be able to carry the useful bounded result of that work where the journey requires it: for example analysed/proposed candidature information, retained research Sources, document contributions or selection/tailoring intent. Do not reduce external-AI-first work to `sourceText + outputs[]` unless the Product Owner explicitly decides that is sufficient for a particular journey.

Do not build a generic provider/plugin/integration framework. Choose representative environments and the smallest concrete channel that proves the product concept.

### PLAN[3] — architecture and dependency health — retained

The completed PLAN[3] code may remain: explicit main-process composition, removal of registration side effects, readability improvements and dependency-health classification are compatible with the product direction.

Revisit only pieces directly affected by recovered PLAN[2]/PLAN[4] requirements. Avoid architecture churn for its own sake.

### PLAN[4] — document/LaTeX package and AAAAT integration — REOPENED

Retain the useful production infrastructure already implemented:

- typed document state and deterministic local rendering;
- real pdfLaTeX/`latexmk` execution;
- self-contained portable projects;
- immutable Rendered CV/letter snapshots;
- Application packet output;
- retained/exportable user-owned artifacts;
- TeX-sensitive text encoding boundary.

Completion still requires the owner-approved document-package design preserved by ADR 0015:

- LaTeX2e public API;
- expl3 internals;
- user-owned editable blueprints and modified package sources;
- owner collaboration on detailed blueprint/language/font design;
- coherent AAAAT integration around the resulting document model.

Do not rewrite SPEC/ADR language to make the current small `aaaat.sty` facade equal that unresolved design.

### PLAN[5] — UX refinement — blocked

Refine the already broadly acceptable UI/UX only after the recovered PLAN[2] and PLAN[4] product models settle. Preserve the current visual character unless the Product Owner changes it.

#### Candidature field presentation

The structural information model is fixed in PLAN[0]: one configurable field surface with primary/favourite presentation and progressive disclosure for the rest. PLAN[5] refines interaction and visual cohesion without reintroducing duplicate field representations.

- Pencil/eye/AI glyph controls break visual cohesion and make a field read as unrelated mechanisms.
- Expanded editable fields consume too much space and are difficult to comprehend as one object.
- Do not represent one field as three different UI concepts for AI, position/presentation and editing. A field should read as one coherent information object; editing/privacy/AI actions are contextual controls on that object.

#### Loaded Home

- Once a workspace is loaded, Home should act as a simplified local control console rather than mostly a launcher.
- Surface useful workspace/local information, ongoing background tasks, truthful AI state, and document/PDF state.
- Leave room for useful later additions such as recent candidatures or recent tasks without inventing a generic dashboard framework.

#### Tags

- Existing Tag behavior is useful, but adding Tags has too much friction.
- Tags should read as reusable workspace vocabulary/glossary, not merely pills attached to records.
- Fast retrieval views should expose relevant Tags where useful.
- Use available left-rail space for a searchable Tag visor that can find a Tag and show, and potentially edit, its description.
- While reading candidature information, invoking a Tag-matching term should expose that Tag's stored description contextually.
- Demo/data quality should avoid low-value Tags whose descriptions merely restate generic technology/role dictionary definitions unless genuinely useful to the workspace.
- Keep Tags bounded; do not turn them into an ontology or knowledge-graph subsystem.

#### My information

- Current My information remains form-centric and difficult to scan. The grouped professional record should be readable first, with concise contextual editing rather than a large generic record form occupying the page.
- Reusable values, variants, career preferences and AI-disclosure controls must read as parts of one professional-information model rather than unrelated forms/panels.

#### AI settings and prompt configuration

- User-editable AI guidance belongs clearly in AI Settings. It must be discoverable as a first-class AI-settings section rather than buried in an advanced disclosure or duplicated across action surfaces.
- Action surfaces execute an AI operation and show relevant context/result state; they should link to central AI instruction/configuration when needed instead of exposing parallel prompt configuration concepts.

#### CV editing

- Current CV editing is confusing and form-centric: sections/entries appear as unrelated boxes and expose fields irrelevant to the specific item.
- Redesign around the user's document and document composition, not generic record forms.
- Sections and entries should read as one coherent CV structure, with concise editing and only relevant controls/fields exposed.
- Final shape follows genuine PLAN[4] document-model completion rather than pre-empting it.

## Verification policy

Ordinary development uses fast, focused verification. Stronger packaged/runtime verification belongs at meaningful run boundaries. Cross-OS verification belongs near release/finalization or when a change is explicitly platform-sensitive.

A green test or package run is evidence only for the premise it exercised. Synthetic providers do not prove actual lightweight-model usefulness; AAAAT's own MCP client does not prove a third-party-host journey; real TeX compilation does not by itself prove the intended document-package design.

## Execution contract

The master orchestrator owns sequence, scope, continuity and acceptance.

- Fix small, well-bounded corrections directly.
- Use a bounded specialist only for substantial autonomous work where it materially reduces owner effort.
- A run orchestrator may inspect broadly enough to understand one PLAN outcome, but its implementation prompt must remain inside that outcome.
- Implementation agents must not edit higher-authority/derived requirements to normalize their own implementation.
- Prefer one coherent specialist pass, continue the same specialist with short deltas, then independently review the actual diff and cross-surface consequences.
- A specialist never advances the PLAN sequence or declares its own PLAN complete.
