# AAAAT master plan

This is the durable sequencing and owner-requirements record for the path to alpha. Current explicit Product Owner instruction remains higher authority; repository authority is resolved through `AGENTS.md`.

`CURRENT_MISSION.md` describes the active run. This file preserves later PLANs and owner findings so they are not lost when missions, issues, PRs, or agents change.

## Current execution checkpoint — 2026-09-28 full authority audit

Audit target main: `1f68eb5dfdc1e4c78d8d179e993d63798738ebca` (PR #374 recovery merge).

The audit found additional drift after the first PLAN[4]/PLAN[5] recovery. This checkpoint supersedes older status statements below where they describe a PLAN as accepted or preserve implementation assumptions contradicted by current Product Owner authority.

- **PLAN[0] — useful integrated baseline retained, acceptance qualification reopened.** Flexible candidature data, no semantic field-derived identity, explicit field-level AI proposal review, partial-result salvage, local/manual completeness and no lifecycle requirement remain sound. The current New application composition and legacy background `application-document-preparation.ts` are not accepted: they combine the two creation intentions and directly persist AI-generated candidature/document changes without the deliberate acceptance used elsewhere.
- **PLAN[1] — retained.** Real-behavior test-basis cleanup remains compatible with current authority. Tests that encode superseded product meaning must still be rewritten or deleted.
- **PLAN[2] — real-host evidence retained; current interaction contract incomplete.** The demonstrated local-computer and no-local third-party-host journeys remain real evidence for those carrier/boundary premises. The current Product Owner model makes `Send to my AI` contextual; the live durable `opportunity_research_selected` candidature state and selector-free context/source round trip are superseded transport scaffolding, not current product state. A correction that materially changes the external context/return boundary requires representative revalidation; ordinary UI wording does not.
- **PLAN[3] — retained.** Main-process composition, sandboxed renderer and dependency-health findings remain sound.
- **PLAN[4] — ACTIVE / NOT ACCEPTED.** Existing document infrastructure is substantial, but three live gaps are confirmed: production/setup incorrectly require `latexmk` instead of direct `pdflatex`; reusable modified shared `aaaat.sty` is not consumed by later renders; packet-letter generation does not yet prove reuse of the exact package source retained by the selected Rendered CV. Issue #373 owns the remaining package/source boundary after a direct-`pdflatex` correction.
- **PLAN[5] — BLOCKED / NOT ACCEPTED.** Merged UX slices #360/#362/#365/#369 are salvageable implementation material only. Coherent visual/interaction acceptance still requires the full current Product Definition, Issue #314 owner-acceptance correction where consistent, and mandatory visual direction.

## Durable audit corrections

### AI visibility is persisted state, not inferred semantics

Every reusable professional-information item and candidature field has one ordinary `AI may use this information` choice.

A starting value may be chosen sensibly from an item's **initial** content kind, and shipped candidature fields may have explicit starting choices. These are initialization decisions only. Kind, label, `system_key`, value format, description and retained content are mutable user data; none is durable privacy meaning. Once created, ordinary edits must leave the stored AI-use choice unchanged until the user explicitly changes it.

Current blanket database defaults of `ai_use_allowed = 1` for new profile items and user-created candidature fields therefore need correction. Do not replace them with a permanent closed taxonomy or a rule that continuously infers privacy from kind.

### `Send to my AI` is contextual

The action belongs beside meaningful current work: a candidature, Source, information item, document or another bounded object. The generated task explicitly carries the permitted context for that action.

Clipboard, files, MCP or another bridge may carry the task. Carrier convenience must not create a durable exclusive “selected candidature/document/item for AI” state merely so a later transport can infer context.

Preserve the useful candidature task-editor mechanics already demonstrated where they fit the corrected model: editable task instruction, shipped/user reusable tasks, visible bounded context, copy/export, paste/import returned result and retention as ordinary AAAAT data. Detach those mechanics from `opportunity_research_selected` and selector-free transport coupling.

Independently bounded capabilities such as `candidature_create`, `application_documents_create`, and privacy-filtered `career_context_read` are not invalidated merely because the selected-candidature research mechanism is superseded.

### AI output becomes durable deliberately

The current field-level candidature AI path is the model to preserve: suggestions remain transient until the user chooses `Use this value`, accepts a corrected value, creates/uses a proposed field, or accepts a Tag. Direct document AI likewise updates editable in-memory draft state and requires Save.

The legacy New application background helper is the exception: it writes extracted candidature values, CV ordering and cover-letter content directly after save. Replace/remove that path; do not normalize it through tests or wording.

### Document engine is direct `pdflatex`

ADR 0015 fixes pdfTeX through pdfLaTeX. `latexmk` is not a product prerequisite.

Production rendering, environment readiness, rendering self-test and ordinary user guidance must exercise the same direct-`pdflatex` premise. Preserve bounded noninteractive invocation, timeout/process-tree safety and staged artifact creation.

### Reusable document-source storage scope is unresolved

ADR 0015 requires user-owned editable Blueprints and modified package sources. It does **not** settle whether the reusable editable source area is application-level configuration, workspace-owned or another portable scope.

The existing Electron `userData/blueprints` location and the earlier Issue #373 application-level proposal are implementation/design hypotheses, not authority. Do not hard-code final source placement until the Product Owner settles this consequential ownership/portability choice.

Whichever scope is chosen, there remains one shared package source rather than package-per-Blueprint ownership; TypeScript owns generated `data.tex`; editable CV/template/letter records do not own package or Blueprint selection; each render retains the exact package + Blueprint actually consumed.

## Recovery debts that must not be lost

- setup UX remains partial and too technical; raw MCP/executable/setup-harness vocabulary is not an accepted ordinary-user journey;
- optional AI connection setup/routing has useful implementation and real production-path evidence, but provider/protocol details remain implementation rather than product authority;
- current rendering prerequisite detection/self-test are stale because they require `latexmk`; document editing remains valid without TeX while PDF rendering naturally requires a working direct `pdflatex`;
- `installer.ai` and `configurator.ai` remain bounded optional mechanisms, not product pillars; ordinary-user usefulness/presentation stays partial;
- PR #319 removed prior VS Code setup and external CV description/content/render capabilities; restore nothing merely because it once existed;
- the older JSON `applicationHandoff` is separate mechanism history, not the current `Send to my AI` product model;
- OpenAI-compatible remains an adapter, not provider/runtime authority;
- README/User Guide and several ADRs/tests still describe stale Focus, `Parse with AI`, `Concepts`, selected-candidature research or old setup assumptions; update them with the implementation corrections rather than documenting unimplemented target behavior as current fact;
- the Product Owner is not routine QA/transport; manual real-environment checks are scarce boundary evidence and are rerun only when a changed premise requires them;
- substantial implementation belongs to a bounded specialist followed by independent orchestrator review; small deterministic corrections may be direct.

## Proven technical foundations to preserve

Unless a directly affected correction demonstrates otherwise:

- one local authoritative workspace and direct current-schema correction before any real-use compatibility baseline;
- sandboxed/context-isolated renderer, Node integration off, webviews off and no arbitrary BrowserWindow minimum;
- typed/domain validation and normal application-service durable mutations;
- flexible candidature field definitions without semantic identity from label or system key;
- favourite/order/presentation preferences as local presentation state;
- no required status/priority/stage/next-action/completeness lifecycle;
- first-class Sources, bounded shared Tags and reusable professional information;
- read-first/profile-variant/document composition mechanics where they fit final UX;
- minimal runtime dependency set and no ORM/design-system/state-framework requirement;
- robust workspace backup/recovery integrity model and separate AI configuration portability;
- LaTeX2e public API + expl3 internals, TypeScript `data.tex`, semantic `main`/`secondary` roles, bounded Babel languages, immutable render snapshots, duplicate/resume and portable retained project model where unaffected.

## Sequence to alpha

### PLAN[0] — integrated candidature/domain baseline, qualified recovery

Retain:

- one configurable Applications information model;
- no field-derived candidature identity;
- user-controlled favourite/order/presentation;
- sparse candidature validity;
- Sources retained independently from extraction;
- local/manual/no-AI completeness;
- explicit review before ordinary AI proposals become durable;
- current-schema direct correction and proportional verification.

PR #326 remains real evidence that one target-scoped constrained-model extraction using `qwen2.5:0.5b-instruct` via Ollama produced a useful result while partial-result validation retained valid facts. The broader four-field request timed out at the intended 15-minute ceiling, so do not generalize that evidence.

Current recovery still required:

- replace the one-screen New application + pre-save `Parse with AI` composition with the Product Definition's two direct creation approaches;
- after raw Source retention, expose peer `Send to AI` and `Fill manually` continuations;
- remove the legacy background path that directly persists AI extraction/document changes;
- correct AI-use initialization so initial defaults are sensible but never become mutable-kind semantics.

### PLAN[1] — real test basis

Retain the smaller basis around actual user/domain behavior. Rewrite or delete tests that freeze superseded development representations, including selected-candidature external research, blanket AI-use defaults, `latexmk` prerequisites and obsolete New application behavior.

A green test run proves only the contract represented by the current tests; poisoned tests do not create authority.

### PLAN[2] — external-AI-originated journeys, evidence retained / interaction correction required

Prior evidence remains valuable:

- a real local-computer/tool-capable host journey through llama.cpp Web UI + Granite 4.1 3B;
- a real no-local-computer path using portable task context/result return;
- useful returned work retained visibly in AAAAT;
- a candidature task editor with editable task text, reusable tasks, bounded visible context, Copy/Paste and file alternatives;
- reusable external-host guidance separate from individual task payloads.

The current Product Owner contract supersedes the durable “selected candidature for external opportunity research” state. Correct the product interaction so `Send to my AI` binds its context directly rather than setting `opportunity_research_selected`. The selector-free `opportunity_research_context_read` / `candidature_source_add` pair and candidature-specific saved research-template service are implementation history unless a capability survives independently in the corrected contextual model.

Clipboard, files, MCP, browser/desktop automation, synchronized rendezvous or another carrier may support a concrete host. None defines product meaning. Do not build a generic provider/plugin/orchestration framework.

When the corrected external context/return boundary is implemented, rerun only the representative evidence materially affected by that change; do not repeat unrelated historical demonstrations.

### PLAN[3] — architecture and dependency health — retained

Keep the completed main-process composition/readability/dependency health work. Avoid architecture churn for its own sake.

### PLAN[4] — document/LaTeX package and AAAAT integration — ACTIVE / NOT ACCEPTED

Retain and revalidate useful existing work:

- typed editable CV/template/letter state;
- LaTeX2e public commands with expl3 internals;
- TypeScript-generated `data.tex` carrying document data and semantic section roles rather than geometry;
- one shipped Blueprint covering CV and cover-letter presentation;
- render-time Blueprint choice without Blueprint ownership on editable document records;
- same Working CV renderable through different Blueprints;
- CV Template / Working CV / Rendered CV ownership separation;
- `main` / `secondary` semantic roles independent from concrete Blueprint geometry;
- immutable Rendered CV/letter snapshots and duplicate/resume behavior;
- bounded pdfLaTeX/Babel Latin-script language handling and Blueprint-owned fonts;
- staged rendering, multipage/content-survival and portable retained projects.

Corrected active boundary:

1. Replace production `latexmk` invocation with direct `pdflatex` and align setup readiness/self-test/user guidance.
2. Establish one reusable user-owned editable shared `aaaat.sty` source, seeded from the shipped default when first established and never silently overwritten once owned.
3. Preserve user-owned compatible Blueprint choice, but do not assume the current `userData/blueprints` scope is final authority.
4. Every render retains the exact package source + exact selected Blueprint source it actually consumed.
5. Application-packet letter generation uses the exact retained package **and** Blueprint from the selected Rendered CV.
6. Editable CV/template/letter persistence continues to own neither package nor Blueprint selection.
7. No migration framework, package registry, marketplace, package-per-Blueprint model, layout DSL, drag/drop designer, font/theme/image system or alternate engine is justified.

Issue #373 owns this final package/source outcome. The reusable source placement/portability scope is one unresolved Product Owner decision. Direct-`pdflatex` correction proceeds independently while that decision is obtained.

Closing #373 never automatically closes PLAN[4]. The orchestrator independently compares the final implementation and real evidence to ADR 0015, Product Definition and direct owner decisions.

### PLAN[5] — coherent UX/UI refinement — BLOCKED / NOT ACCEPTED

PLAN[5] starts only after genuine PLAN[4] acceptance and after earlier domain/AI contradictions that would poison the final interaction are corrected.

Issues #360/#362/#365/#369 remain implementation-slice history. Keep useful behavior only where it survives the coherent design.

#### Global interaction/visual acceptance boundary

The final visible candidate must coherently cover:

- first-run workspace entry with Create/Open primary and recovery secondary;
- loaded shell that gives one principal task the useful viewport at constrained sizes;
- branded loaded Home as concise landing console, not workspace-entry launcher or metrics framework;
- Applications retrieval/capture as primary composition, configuration deeper;
- two direct New application approaches: structured direct entry and raw-material capture;
- raw Source retention as complete work followed by peer `Send to AI` and `Fill manually` continuations;
- selected application as one coherent information surface with schema machinery progressive;
- read-first My information and CV/Documents work;
- contextual AI-use controls that read as properties/actions of information;
- Tags as bounded shared glossary/retrieval aid without permanent glossary administration crowding the shell;
- intentional sparse/empty states;
- clean Settings information architecture and contextual capability handoffs;
- dirty-state/navigation safety where already correct.

`docs/UX_VISUAL_DIRECTION.md` is mandatory for every visible UI run. The target is friendly worn retrofuturism with professional clarity: repaired field-terminal/workshop machine framing, paper/dossier information surfaces, restrained mid-century industrial cues and warm weathered materials. Reject generic SaaS minimalism, developer dashboards, aggressive cyberpunk and decoration that harms readability.

Historical research assets under `docs/owner-source/`—`AAAATART.png`, paired dark/light logos, banners, backgrounds and loading art—must be inspected directly during coherent shell/Home/onboarding/theme work. They are research inputs, not a requirement to reproduce an old mockup or build a heavy theme framework.

#### Loaded Home

Loaded Home is a **landing console** combining AAAAT identity with concise useful operational shorthand.

Once a workspace is loaded, the landing body must not contain `New workspace`, `Open existing workspace`, `Open demo` or equivalent workspace-entry actions. Workspace switching/creation belongs in compact shell/workspace interaction or Settings. Home may surface meaningful state/continuations, but it must not duplicate every rail badge or become a dashboard framework.

#### Candidature information

The structural model remains one configurable field surface with favourite/primary presentation and progressive disclosure. Editing, AI use and presentation controls are contextual actions on the same information object; glyph/button mechanics that fragment one field into several unrelated-looking controls are not accepted merely because they are accessible.

#### Tags

Tags remain reusable workspace vocabulary/glossary and retrieval aids. Compact attach/search/create and a shared visor are useful only where they fit the final constrained shell. No ontology/knowledge graph.

#### My information

Reusable professional information is readable content first. Variants and career preferences are contextual parts of the same model. AI visibility remains understandable and secondary. Initial AI-use defaults may be content-kind-informed, but kind remains open/custom and later edits never infer privacy state.

#### AI settings and guidance

User-editable reusable AI guidance belongs clearly in AI Settings. Action surfaces execute contextual operations rather than competing prompt-configuration systems. Current `installer.ai` / `configurator.ai` / setup-harness vocabulary is implementation evidence, not ordinary-user language.

#### CV/Documents

Document work is read-first and composition-shaped. Preserve final PLAN[4] ownership/render semantics. In the collection, reusable CV work is primary; candidature-owned letters/artifacts surface from their candidature, while standalone cover-letter creation remains a secondary exception rather than peer global prominence.

## Verification policy

Use focused verification during development and stronger runtime/package evidence at meaningful boundaries.

A green run proves only the premise it exercised. Synthetic providers do not prove actual constrained-model usefulness; AAAAT's own MCP client does not prove a third-party-host journey; direct `pdflatex` proves rendering mechanics but not the whole package/source design.

Reuse previous real evidence where the changed code cannot affect its premise. A change from selected-candidature external state to explicitly contextual tasks **does** materially alter the external context/return premise and requires representative revalidation. A change from `latexmk` to direct `pdflatex` **does** materially alter the rendering/setup premise and requires real direct-pdfLaTeX evidence.

PLAN[5] cannot be accepted from component tests/CSS reachability. Final acceptance needs actual packaged/rendered desktop evidence across first run, loaded Home/shell, Applications including both creation routes, My information, Documents, Tags and Settings; constrained and expanded sizes; intentional empty/sparse states; and the final supported light/dark presentation. The orchestrator inspects that evidence directly.

## Execution contract

The master orchestrator owns sequence, scope, continuity and acceptance.

- Fix small deterministic corrections directly.
- Do not use the Product Owner as transport, audit substitute or routine QA.
- Use one bounded specialist for substantial autonomous work and independently inspect its actual diff/evidence.
- A specialist does not edit higher authority to normalize its implementation, advance PLAN sequencing or declare PLAN completion.
- For UX/UI, do not decompose the experience into mechanical patches that each pass tests while leaving the whole incoherent.
- Evidence environments, models, carriers and historical assets are fixtures/references, not project architecture.