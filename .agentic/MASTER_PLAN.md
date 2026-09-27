# AAAAT master plan

This is the durable sequencing and owner-requirements record for the path to alpha. Current explicit Product Owner instruction remains higher authority; repository authority is still resolved through `AGENTS.md`.

`CURRENT_MISSION.md` describes only the active run. This file preserves later PLANs and owner findings so they are not lost when missions, issues, PRs, or agents change.

## Current execution checkpoint — 2026-09-27

This section supersedes older recovery-status statements below where they describe evidence as still missing. The older recovery text remains useful rationale for why mechanism proof is not product acceptance.

Current main after PR #358: `59f61743ddf2f57ad0bd03e3df8e824e65051536`.

- **PLAN[0] — integrated UI/domain baseline retained.** Direct AI usefulness is actually demonstrated for one target-scoped constrained-model extraction case by PR #326 (`qwen2.5:0.5b-instruct` via Ollama). The ordinary four-field constrained-model request still timed out at AAAAT's intended 15-minute ceiling, so do not generalize the one-field evidence to broad extraction usefulness. Setup/integration remains partial but a bounded audit found no setup item that blocks the sequence.
- **PLAN[1] — retained.**
- **PLAN[2] — COMPLETE.** The local-computer third-party-host boundary is actually demonstrated through llama.cpp Web UI + Granite 4.1 3B. The no-local boundary is actually demonstrated through PR #330 + closed Issue #329. PRs #335/#336 implemented the candidature `Send to my AI` editor, shipped editable tasks, Copy/Paste and file alternatives, and user-created reusable tasks. PR #341 made the action directly discoverable on the selected candidature surface. PR #342 added reusable external-host guidance separately from individual task payloads. Issue #333 is closed. These real-host results are durable boundary evidence and are not to be rerun after ordinary UI/refactoring changes unless the external boundary materially changes.
- **PLAN[3] — retained.**
- **PLAN[4] — COMPLETE.** PRs #348, #353 and #358 establish the owner-approved document package and AAAAT integration: LaTeX2e public API with expl3 internals; TypeScript data feeding; user-owned portable source projects; render-time user-selectable Blueprints; unified CV/cover-letter design contract; explicit Blueprint-independent `main`/`secondary` section roles; pdfLaTeX/Babel Latin-language boundary; retained exact artifact sources; portable real-LaTeX output; and packaged-runtime evidence. The Product Owner's detailed Blueprint/language/font decisions are implemented.
- **PLAN[5] — ACTIVE.** UX refinement is now unblocked. Preserve settled PLAN[4] document semantics while improving interaction/readability across the owner findings below.

Current recovery debts that must not be lost:

- host/setup UX is still partial and too technical; a real host proving MCP works does not make raw executable/MCP setup guidance an accepted ordinary-user setup journey, but clipboard/file `Send to my AI` makes that optional and it does not block PLAN[5];
- AI connection setup/routing is implemented and has real production-path evidence, while ordinary-user setup polish remains partial and optional;
- TeX prerequisite detection and the rendering self-test are implemented; document editing remains available without TeX, while real rendering naturally requires it;
- `installer.ai` and `configurator.ai` remain bounded optional assistance. The rendering self-test is real; configurator ordinary-user usefulness remains partial/synthetic. Neither blocks the sequence;
- PR #319 removed prior VS Code setup and external CV description/content/render capabilities. VS Code-specific setup is superseded unless a future concrete host journey justifies it; external document operations should only be reconsidered against the settled PLAN[4] document model;
- the older JSON `applicationHandoff` (`sourceText + outputs`) is a separate mechanism and not the `Send to my AI` product model;
- OpenAI-compatible remains an implementation adapter, not product/provider authority;
- scarce Codex/Copilot quotas should not be spent on deterministic harness/setup work when the orchestrator can execute narrow actions directly;
- the Product Owner is not a transport or routine QA layer; manual real-environment checks are scarce boundary evidence, not a gate to repeat after each implementation increment;
- the orchestrator must not implement substantial product slices itself: small deterministic corrections are direct; substantial autonomous implementation belongs to a bounded specialist, followed by independent orchestrator review and evidence classification.

The setup audit is complete: no remaining setup/integration item blocks the active sequence. Keep those partial items visible for later refinement instead of creating work merely to eliminate historical mechanism gaps.

## Recovery checkpoint — origin and rationale

A Product Owner-directed re-audit found that several earlier completions confused **mechanism proof** with **product capability completion**. Later missions and derived documentation then normalized those mechanisms as if they were the original requirement.

This checkpoint is not a new PLAN number and is not permission for another broad redesign. It restores authority before further implementation.

The recovery established these durable rules:

- synthetic/model/carrier tests prove only the boundary they exercise;
- a real third-party environment is required where the PLAN names one;
- once a real boundary has been demonstrated, reuse that evidence unless a later change materially alters the boundary; do not make the Product Owner repeat manual acceptance as routine QA;
- carrier choice follows the user journey rather than defining it;
- external-AI-first work must be able to retain useful external results, not merely launch deterministic AAAAT work from raw opportunity text;
- setup is a user journey, not command/protocol vocabulary;
- rendering infrastructure did not by itself equal completion of the owner-approved document-package design; PLAN[4] is complete only because the owner-paired design and integration are now also implemented and independently evidenced.

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

Affordable/lightweight AI usefulness remains a product requirement. PR #326 provides real constrained-model evidence for a target-scoped one-field job-extraction journey and proves the existing partial-result salvage/local validation can preserve a useful result while rejecting bad siblings. It does not prove every broad/current-field extraction request is useful: the demonstrated ordinary four-field request produced no model response within AAAAT's intended 15-minute ceiling.

Setup/integration capability removed or narrowed during PR #319 is not automatically obsolete merely because the integrated baseline was accepted. Recover the user journey from higher authority before deciding whether deleted host-specific setup, CV disclosure/render operations or other prior work should be restored, replaced or remain superseded.

### PLAN[1] — real test basis

Retain the cleanup of development-era AI-generated faux guardrails and the smaller basis around real product/domain behavior.

Do not use passing tests, lower test count or removal of packaged synthetic AI journeys as product-acceptance evidence for PLAN[0]/PLAN[2]. Verification evidence proves only the boundary actually exercised.

### PLAN[2] — external-AI-originated journeys — COMPLETE

PLAN[2] required bounded journeys that begin in real third-party AI systems, including one representative environment with local-computer/tool access and one without local-computer access, plus a usable product interaction rather than a carrier-specific scaffold.

The local-computer requirement is actually demonstrated: llama.cpp Web UI + Granite 4.1 3B originated the journey, read the locally selected candidature through bounded AAAAT operations, produced useful application-preparation reasoning, wrote it through the bounded Source mutation, and the returned Source was visible in normal AAAAT UI. llama.cpp/Granite are representative evidence fixtures only.

The no-local requirement is also actually demonstrated through PR #330 and closed Issue #329: AAAAT exported bounded readable task context, an external AI with no access to the local AAAAT computer produced substantive Markdown work, the returned result was imported through the selector-free Source-only mutation, and the result was visible in normal AAAAT UI.

The Product Owner then superseded the specialized `External opportunity research` product surface with Issue #333's **Send to my AI** interaction. PR #335 implemented the candidature task editor, shipped fully editable tasks, visible bounded context, Copy task, pasted-result retention and file alternatives. PR #336 added user-created reusable tasks without making saving mandatory. PR #341 moved `Send to my AI` out of `More` so it is directly discoverable. PR #342 added one reusable external-host instruction artifact in AI Settings, with preview/copy/save-once behavior and raw local-tool connection mechanics remaining Advanced. Task payloads therefore stay focused on task + bounded context rather than repeatedly teaching AAAAT mechanics. Issue #333 is closed.

Task instruction remains user-owned and fully editable. Context projection and return-mutation authority remain AAAAT-owned and bounded. Clipboard, files and MCP are carriers, not product meaning. Career/document contexts may reuse the interaction later when a concrete user need justifies it; a second context is not a PLAN[2] completion gate.

The demonstrated local/no-local host journeys are durable boundary evidence. Do not rerun them after ordinary UI, wording, task-template or refactoring changes that do not materially alter context projection, carrier behavior or return mutation. The Product Owner is not the QA transport layer.

MCP, files, clipboard, browser/desktop automation, synchronized rendezvous mechanisms or another carrier may be appropriate for a concrete environment. None is the PLAN outcome by itself.

Do not build a generic provider/plugin/integration framework. Choose representative environments and the smallest concrete channel that proves the product concept.

### PLAN[3] — architecture and dependency health — retained

The completed PLAN[3] code may remain: explicit main-process composition, removal of registration side effects, readability work and dependency-health classification are compatible with the product direction.

Revisit only pieces directly affected by later requirements. Avoid architecture churn for its own sake.

### PLAN[4] — document/LaTeX package and AAAAT integration — COMPLETE

The accepted document model and rendering boundary now include:

- typed editable CV/template/letter state and deterministic local rendering;
- real pdfLaTeX/`latexmk` execution;
- a LaTeX2e public API with expl3 internals in the shared `aaaat.sty` package;
- TypeScript-generated `data.tex` containing document data and semantic CV section roles, not presentation geometry;
- one shipped Blueprint covering both CV and cover-letter presentation;
- compatible advanced-user `.tex` Blueprint discovery from application configuration and explicit render-time selection;
- CV Template/Working CV `main` / `secondary` section presentation roles independent from Blueprint geometry;
- no Blueprint ownership attached to editable CV/template/letter persistence;
- current shipped Blueprint mapping `secondary` to its narrow region while another Blueprint can interpret the same role differently;
- bounded pdfLaTeX/Babel Latin-script language handling with supported natural names/codes/region variants and explicit unsupported-language failure;
- Blueprint-owned fonts with no font/theme framework or alternate-engine matrix;
- immutable Rendered CV/letter snapshots and exact retained source projects;
- Application packets using the selected Rendered CV's exact retained Blueprint for the packet letter;
- self-contained portable/exportable user-owned source projects and PDFs;
- strengthened real-LaTeX multipage/content-survival evidence and Windows packaged-runtime evidence.

Key completion evidence:

- Issue #344 / PR #348 corrected multipage pagination and passed real-LaTeX content-survival verification;
- Issue #351 / PR #353 implemented unified Blueprint discovery/selection, exact source retention and CV/letter/packet integration; PR-only real-LaTeX and Windows package candidate runs passed;
- Issue #355 / PR #358 implemented explicit semantic section roles and the owner-approved language/font boundary; independent adversarial pdfLaTeX validation passed, followed by PR real-LaTeX run `36338236592` and Windows package candidate run `36338236624` on exact head `915dc9fccb6435f8f5c9b6bba3a341749b41cdcd`;
- PR #358 merged as `59f61743ddf2f57ad0bd03e3df8e824e65051536`.

Do not reopen PLAN[4] during UX work by inventing Blueprint persistence, a marketplace/registry framework, a layout DSL, drag/drop document designer, generic font/theme/image subsystem, or alternate TeX engines. Later concrete requirements may extend the settled model only through explicit Product Owner direction.

### PLAN[5] — UX refinement — ACTIVE

Refine the already broadly acceptable UI/UX now that the recovered PLAN[4] product model is settled. Preserve the current visual character unless the Product Owner changes it. PLAN[5] is not permission for a monolithic redesign; execute coherent bounded slices against the owner findings below.

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
- Preserve the settled PLAN[4] semantics: reusable/template/working ownership, semantic `main` / `secondary` roles, render-time Blueprint choice and separate rendered artifacts.

## Verification policy

Ordinary development uses fast, focused verification. Stronger packaged/runtime verification belongs at meaningful run boundaries. Cross-OS verification belongs near release/finalization or when a change is explicitly platform-sensitive.

A green test or package run is evidence only for the premise it exercised. Synthetic providers do not prove actual lightweight-model usefulness; AAAAT's own MCP client does not prove a third-party-host journey; real TeX compilation proves rendering/portability mechanics and, together with owner-approved design plus integration evidence, supports the accepted PLAN[4] boundary. Once a real external boundary has been demonstrated, ordinary changes that do not alter that boundary do not require the Product Owner to manually demonstrate it again.

## Execution contract

The master orchestrator owns sequence, scope, continuity and acceptance.

- Fix small, well-bounded corrections directly.
- Do not use the Product Owner as a transport layer or routine QA layer for engineering/setup work.
- Use a bounded specialist only for substantial autonomous work where it materially reduces owner effort; scarce Codex/Copilot quota is not for small deterministic tasks.
- A run orchestrator may inspect broadly enough to understand one PLAN outcome, but its implementation prompt must remain inside that outcome.
- Implementation agents must not edit higher-authority/derived requirements to normalize their own implementation.
- Prefer one coherent specialist pass, continue the same specialist with short deltas, then independently review the actual diff and cross-surface consequences.
- A specialist never advances the PLAN sequence or declares its own PLAN complete.
- Evidence environments, models and carriers are fixtures, not project architecture.
