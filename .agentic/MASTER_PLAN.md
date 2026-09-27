# AAAAT master plan

This is the durable sequencing and owner-requirements record for the path to alpha. Current explicit Product Owner instruction remains higher authority; repository authority is still resolved through `AGENTS.md`.

`CURRENT_MISSION.md` describes only the active run. This file preserves later PLANs and owner findings so they are not lost when missions, issues, PRs, or agents change.

## Current execution checkpoint — 2026-09-28 authority audit

This section supersedes older recovery-status statements below where they describe evidence as still missing or a PLAN as accepted. The older recovery text remains useful rationale for why mechanism proof is not product acceptance.

Current main after PR #372: `dd16cacd9233084bfec1b13755942eb7aa51d469`.

- **PLAN[0] — integrated UI/domain baseline retained.** Direct AI usefulness is actually demonstrated for one target-scoped constrained-model extraction case by PR #326 (`qwen2.5:0.5b-instruct` via Ollama). The ordinary four-field constrained-model request still timed out at AAAAT's intended 15-minute ceiling, so do not generalize the one-field evidence to broad extraction usefulness. Setup/integration remains partial but a bounded audit found no setup item that blocks the sequence.
- **PLAN[1] — retained.**
- **PLAN[2] — COMPLETE.** The local-computer third-party-host boundary is actually demonstrated through llama.cpp Web UI + Granite 4.1 3B. The no-local boundary is actually demonstrated through PR #330 + closed Issue #329. PRs #335/#336 implemented the candidature `Send to my AI` editor, shipped editable tasks, Copy/Paste and file alternatives, and user-created reusable tasks. PR #341 made the action directly discoverable on the selected candidature surface. PR #342 added reusable external-host guidance separately from individual task payloads. Issue #333 is closed. These real-host results are durable boundary evidence and are not to be rerun after ordinary UI/refactoring changes unless the external boundary materially changes.
- **PLAN[3] — retained.**
- **PLAN[4] — ACTIVE / NOT ACCEPTED.** PRs #348, #353 and #358 produced substantial correct document infrastructure and strong TeX/runtime evidence, but acceptance was advanced past an explicit deferred requirement. ADR 0015 requires user-owned editable Blueprints **and modified package sources**. Issue #344 explicitly deferred persistent reuse/selection of modified Blueprint/package sources. #351 later delivered persistent user Blueprint discovery, but the live render path still always injects the embedded shipped `aaaat.sty`; a user's modified shared package source cannot be reused by subsequent AAAAT renders. Issue #373 is the coherent completion outcome. Existing document code is implementation material, not a constraint if #373 exposes a better direct model.
- **PLAN[5] — BLOCKED / NOT ACCEPTED.** Merged UX slices #360/#362/#365/#369 contain potentially useful behavior but were accepted too narrowly against roadmap headings instead of the full still-open owner-acceptance boundary in Issue #314 and the mandatory visual direction. They are salvageable implementation material, not accepted PLAN[5] UX/UI. No PLAN[5] implementation proceeds until PLAN[4] is genuinely accepted.

Current recovery debts that must not be lost:

- host/setup UX is still partial and too technical; a real host proving MCP works does not make raw executable/MCP setup guidance an accepted ordinary-user setup journey, but clipboard/file `Send to my AI` makes that optional and it does not block PLAN[4];
- AI connection setup/routing is implemented and has real production-path evidence, while ordinary-user setup polish remains partial and optional;
- TeX prerequisite detection and the rendering self-test are implemented; document editing remains available without TeX, while real rendering naturally requires it;
- `installer.ai` and `configurator.ai` remain bounded optional assistance. The rendering self-test is real; configurator ordinary-user usefulness remains partial/synthetic. Neither blocks the sequence;
- PR #319 removed prior VS Code setup and external CV description/content/render capabilities. VS Code-specific setup is superseded unless a future concrete host journey justifies it; external document operations should only be reconsidered against the settled PLAN[4] document model;
- the older JSON `applicationHandoff` (`sourceText + outputs`) is a separate mechanism and not the `Send to my AI` product model;
- OpenAI-compatible remains an implementation adapter, not product/provider authority;
- scarce Codex/Copilot quotas should not be spent on deterministic harness/setup work when the orchestrator can execute narrow actions directly;
- the Product Owner is not a transport, routine QA layer or substitute UX auditor; manual real-environment checks are scarce boundary evidence, not a gate to repeat after each implementation increment;
- the orchestrator must not implement substantial product slices itself: small deterministic corrections are direct; substantial autonomous implementation belongs to a bounded specialist, followed by independent orchestrator review and evidence classification.

The setup audit is complete: no remaining setup/integration item blocks the active sequence. Keep those partial items visible for later refinement instead of creating work merely to eliminate historical mechanism gaps.

## Recovery checkpoint — origin and rationale

A Product Owner-directed re-audit found that several earlier completions confused **mechanism proof** with **product capability completion**. Later missions and derived documentation then normalized those mechanisms as if they were the original requirement.

The 2026-09-28 audit found the same class of error in the PLAN[4] → PLAN[5] transition: individually coherent implementation slices and green evidence were treated as sufficient acceptance even though the full higher-authority completion boundary had not been rechecked.

This checkpoint is not a new PLAN number and is not permission for indiscriminate rollback. It restores authority before further implementation.

Durable rules:

- synthetic/model/carrier tests prove only the boundary they exercise;
- a real third-party environment is required where the PLAN names one;
- once a real boundary has been demonstrated, reuse that evidence unless a later change materially alters the boundary; do not make the Product Owner repeat manual acceptance as routine QA;
- carrier choice follows the user journey rather than defining it;
- external-AI-first work must be able to retain useful external results, not merely launch deterministic AAAAT work from raw opportunity text;
- setup is a user journey, not command/protocol vocabulary;
- rendering mechanics and portable artifacts do not by themselves complete the owner-approved document-package/source design;
- visible-UI behavior tests do not by themselves establish coherent UX/UI design; the complete interaction hierarchy, spatial composition and visual authority must also be satisfied;
- useful code from a false completion state may remain when it fits the corrected design, but sunk implementation cost never turns it into product authority.

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

### PLAN[4] — document/LaTeX package and AAAAT integration — ACTIVE / NOT ACCEPTED

Retain and revalidate useful existing work rather than reverting it mechanically:

- typed editable CV/template/letter state and deterministic local rendering;
- real pdfLaTeX/`latexmk` execution;
- LaTeX2e public commands with expl3 internals;
- TypeScript-generated `data.tex` carrying document data and semantic CV section roles rather than presentation geometry;
- one shipped Blueprint covering CV and cover-letter presentation;
- advanced-user Blueprint discovery from application configuration and explicit render-time selection;
- CV Template/Working CV `main` / `secondary` section roles independent from Blueprint geometry;
- no Blueprint ownership attached to editable CV/template/letter persistence;
- immutable Rendered CV/letter snapshots, duplicate/resume behavior and exact retained projects;
- Application packets using the selected Rendered CV's retained Blueprint for the packet letter;
- bounded pdfLaTeX/Babel Latin-script language handling and Blueprint-owned fonts;
- multipage/content-survival and packaged-runtime evidence.

These pieces are strong evidence, not a PLAN-completion shortcut.

Completion still requires the full ADR-0015 source-ownership model. The outstanding concrete gap is the reusable user-owned **modified shared package source**. Issue #344 explicitly deferred persistent reuse/selection of modified Blueprint/package sources. #351 completed the Blueprint side, but current rendering still writes the embedded `aaaat.sty` into every new project. Editing an exported `aaaat.sty` affects that exported copy only and cannot become the shared package source for later AAAAT renders.

Issue #373 owns the coherent completion:

- establish one application-level user-owned editable shared `aaaat.sty` source without an in-app editor or package-per-Blueprint model;
- keep user Blueprint discovery and TypeScript `data.tex` separation;
- render with and retain the exact shared package source actually used;
- make the source location deliberately discoverable through a small typed advanced Documents action rather than hidden-path knowledge;
- preserve the correct document-domain ownership model;
- independently revalidate CV, letter, alternate Blueprint, packet, language, snapshots, multipage survival and portable reproduction with the final source boundary.

No compatibility framework, package registry, marketplace, generic layout DSL, drag/drop designer, theme/font/image subsystem or alternate TeX engine is justified.

After #373 is implemented and candidate evidence passes, the master orchestrator must compare the whole resulting PLAN[4] model back to ADR 0015, Product Definition and the Product Owner decisions before advancing the PLAN. A closed #373 is not an automatic completion declaration.

### PLAN[5] — coherent UX/UI refinement — BLOCKED / NOT ACCEPTED

PLAN[5] begins only after genuine PLAN[4] acceptance.

The previous PLAN[5] execution was too narrow. Issues #360/#362/#365/#369 can remain closed as implementation-slice history, but their merged behavior is only salvageable material for the final design. The PLAN outcome must satisfy the full current Product Definition plus the still-open blocking owner-acceptance correction on Issue #314. Do not design around the current React/component structure if that structure conflicts with the intended interaction.

#### Global interaction/visual acceptance boundary

Future PLAN[5] work must coherently cover, rather than patch independently:

- first-run workspace entry with Create/Open as the primary task and recovery secondary;
- a loaded shell that uses available desktop space and keeps one principal task legible at constrained sizes;
- a branded loaded Home that acts as a concise landing console rather than a redundant workspace launcher or generic metrics dashboard;
- Applications retrieval/capture as the primary composition, with configuration deeper rather than pushing useful work away;
- two direct New application approaches: structured direct entry and raw-material capture;
- raw retention as complete work, followed in the same post-retention view by explicit peer **Send to AI** and **Fill manually** continuations;
- selected/complete application information as one coherent information surface, with schema machinery progressive rather than first-sight language;
- read-first My information, CV/Documents and other content-heavy surfaces;
- contextual AI-use controls that read as a property/action of information instead of a competing mechanism;
- Tags as shared glossary/retrieval aids without turning the rail or application view into glossary administration;
- intentional empty/sparse states;
- clean Settings information architecture and contextual capability handoffs;
- dirty-state/navigation safety already implemented where correct.

`docs/UX_VISUAL_DIRECTION.md` is mandatory for every visible UI run. The target is friendly worn retrofuturism with professional clarity: repaired field-terminal/workshop machine framing, paper/dossier information surfaces, restrained mid-century industrial cues and warm weathered materials. It rejects generic SaaS minimalism, generic developer dashboards, aggressive cyberpunk and decoration that harms readability.

The historical visual research assets under `docs/owner-source/` must be inspected directly during coherent visual implementation: `AAAATART.png`, paired dark/light logos, banners, backgrounds and loading art. The current renderer's use of only the light logo and `color-scheme: light` is implementation evidence, not a design decision. Resolve light/dark visual presentation deliberately without manufacturing a heavy design-system/theme framework.

#### Loaded Home — explicit Product Owner direction

Loaded Home is a **landing console**: AAAAT product image/identity plus concise useful operational shorthand.

Once a workspace is already loaded, Home must not present `New workspace`, `Open existing workspace`, `Open demo` or equivalent workspace-entry buttons as landing content. Workspace switching/creation belongs in a compact shell/options interaction or a deliberate interaction on the displayed workspace/path; full workspace administration remains in Settings.

Home may surface meaningful workspace/local state, ongoing work/tasks and obvious continuations, but it should not redundantly duplicate every persistent rail badge or become a generic metrics framework.

#### Candidature field presentation

The structural information model remains one configurable field surface with primary/favourite presentation and progressive disclosure for the rest.

- glyph/button mechanics must not make one field read as unrelated AI/edit/presentation objects;
- editing/privacy/AI/presentation are contextual actions on one information object;
- literal emoji/glyph controls that pass accessibility tests but break the intended visual cohesion are not sufficient acceptance.

#### Tags

- Tags remain reusable workspace vocabulary/glossary and retrieval aids;
- compact attach/search/create and the shared visor are useful implementation material if they fit the final shell;
- preserve bounded Tags; no ontology/knowledge graph;
- do not let a permanent rail widget crowd constrained layouts merely because it already exists.

#### My information

- reusable professional information is readable content first;
- variants and career preferences remain contextual parts of the same model;
- AI disclosure stays understandable and secondary;
- current read-first code may be retained only where it fits the coherent final composition.

#### AI settings and prompt configuration

- user-editable AI guidance belongs clearly in AI Settings;
- action surfaces execute contextual operations rather than expose competing prompt-configuration systems;
- do not invent work here merely to satisfy a roadmap heading if the concrete product behavior is already correct.

#### CV/Documents editing

- document work is read-first and shaped around document composition rather than generic record forms;
- preserve the final accepted PLAN[4] ownership/render semantics;
- current #360 behavior may be reused if it survives the coherent visual/spatial redesign.

## Verification policy

Ordinary development uses fast, focused verification. Stronger packaged/runtime verification belongs at meaningful run boundaries. Cross-OS verification belongs near release/finalization or when a change is explicitly platform-sensitive.

A green test or package run is evidence only for the premise it exercised. Synthetic providers do not prove actual lightweight-model usefulness; AAAAT's own MCP client does not prove a third-party-host journey; real TeX compilation proves rendering/portability mechanics but does not by itself prove the intended package/source design. Once a real external boundary has been demonstrated, ordinary changes that do not alter that boundary do not require the Product Owner to manually demonstrate it again.

PLAN[5] cannot be accepted from component tests and CSS reachability alone. The final coherent UX/UI candidate requires actual rendered/packaged desktop evidence across first run, loaded Home/shell, Applications including both creation routes, My information, Documents, Tags and Settings; representative constrained and expanded sizes; intentional empty/sparse states; and the final supported light/dark visual presentations. The master orchestrator inspects that evidence directly. The Product Owner is not the screenshot QA operator.

## Execution contract

The master orchestrator owns sequence, scope, continuity and acceptance.

- Fix small, well-bounded corrections directly.
- Do not use the Product Owner as a transport layer, audit substitute or routine QA layer for engineering/setup/UX verification work.
- Use a bounded specialist only for substantial autonomous work where it materially reduces owner effort; scarce Codex/Copilot quota is not for small deterministic tasks.
- A run orchestrator may inspect broadly enough to understand one PLAN outcome, but its implementation prompt must remain inside that outcome.
- Implementation agents must not edit higher-authority/derived requirements to normalize their own implementation.
- Prefer one coherent specialist pass, continue the same specialist with short deltas, then independently review the actual diff and cross-surface consequences.
- For UX/UI, do not decompose the product experience into mechanical patches that each pass tests while leaving the whole interaction incoherent.
- A specialist never advances the PLAN sequence or declares its own PLAN complete.
- Evidence environments, models, carriers and historical visual assets are fixtures/references, not project architecture.
