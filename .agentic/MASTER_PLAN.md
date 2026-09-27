# AAAAT master plan

This is the durable sequencing and owner-requirements record for the path to alpha. Current explicit Product Owner instruction remains higher authority; repository authority is still resolved through `AGENTS.md`.

`CURRENT_MISSION.md` describes only the active run. This file preserves later PLANs and owner findings so they are not lost when missions, issues, PRs, or agents change.

## Current execution checkpoint — 2026-09-27

This section supersedes older recovery-status statements below where they describe evidence as still missing. The older recovery text remains useful rationale for why mechanism proof is not product acceptance.

Current main after PR #330: `ce1c1530a985342f0d0f552f69c90d5ae7dc56ad`.

- **PLAN[0] — integrated UI/domain baseline retained.** Direct AI usefulness is now actually demonstrated for one target-scoped constrained-model extraction case by PR #326 (`qwen2.5:0.5b-instruct` via Ollama). The ordinary four-field constrained-model request still timed out at AAAAT’s intended 15-minute ceiling, so do not generalize the one-field evidence to broad extraction usefulness. Setup/integration remains partial.
- **PLAN[1] — retained.**
- **PLAN[2] — ACTIVE, one acceptance gate remains.** The local-computer third-party-host journey is actually demonstrated through llama.cpp Web UI + Granite 4.1 3B using the bounded ADR-0025 opportunity-research read/Source-write operations. PR #330 implements the separate no-local portable task/result carrier and is green. Issue #329 remains open only for the real no-local external-AI journey: export bounded task → external AI with no local-machine access performs substantive work → returned Markdown/text file → AAAAT selector-free import → Source visible in normal UI. Do not close PLAN[2] from carrier/unit evidence alone.
- **PLAN[3] — retained.**
- **PLAN[4] — REOPENED, still after PLAN[2].** Production rendering/portable/immutable artifact infrastructure remains real. The owner-approved LaTeX2e public API + expl3 internals + user-owned editable blueprint/package-source design remains unresolved and requires the ADR-0015 owner-paired design phase.
- **PLAN[5] — NOT STARTED and BLOCKED.**

Current recovery debts that must not be lost:

- host/setup UX is still partial and too technical; a real host proving MCP works does not make raw executable/MCP setup guidance an accepted ordinary-user setup journey;
- PR #319 removed prior VS Code setup and external CV description/content/render capabilities; neither deletion nor historical existence decides whether they should be restored, replaced or remain superseded;
- the older JSON `applicationHandoff` (`sourceText + outputs`) is a separate mechanism and not evidence of external AI returning useful completed work;
- PR #330’s portable file carrier is intentionally one named-task carrier, not authority for a generic handoff/result framework;
- an OpenAI-compatible endpoint remains an implementation adapter, not product/provider authority;
- scarce Codex/Copilot quotas should not be spent on deterministic harness/setup work when the orchestrator can execute narrow actions directly.

After the real no-local #329 journey succeeds, propagate PLAN[2] classification before advancing. Reassess remaining recovery/setup debts against authority rather than automatically declaring all interoperability/setup work complete.

## Recovery checkpoint — origin and rationale

A Product Owner-directed re-audit after PLAN[4] found that several earlier completions confused **mechanism proof** with **product capability completion**. Later missions and derived documentation then normalized those mechanisms as if they were the original requirement.

This checkpoint is not a new PLAN number and is not permission for another broad redesign. It restores authority before any further implementation.

The recovery established these durable rules:

- synthetic/model/carrier tests prove only the boundary they exercise;
- a real third-party environment is required where the PLAN names one;
- carrier choice follows the user journey rather than defining it;
- external-AI-first work must be able to retain useful external results, not merely launch deterministic AAAAT work from raw opportunity text;
- setup is a user journey, not command/protocol vocabulary;
- rendering infrastructure does not equal completion of the owner-approved document-package design.

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

Affordable/lightweight AI usefulness remains a product requirement. PR #326 now provides real constrained-model evidence for a target-scoped one-field job-extraction journey and proves the existing partial-result salvage/local validation can preserve a useful result while rejecting bad siblings. It does not prove every broad/current-field extraction request is useful: the demonstrated ordinary four-field request produced no model response within AAAAT’s intended 15-minute ceiling.

Setup/integration capability removed or narrowed during PR #319 is not automatically obsolete merely because the integrated baseline was accepted. Recover the user journey from higher authority before deciding whether deleted VS Code configuration, CV disclosure/render operations or other prior work should be restored, replaced or remain superseded.

### PLAN[1] — real test basis

Retain the cleanup of development-era AI-generated faux guardrails and the smaller basis around real user/domain promises.

Do not use passing tests, lower test count or removal of packaged synthetic AI journeys as product-acceptance evidence for PLAN[0]/PLAN[2]. Verification evidence proves only the boundary actually exercised.

### PLAN[2] — external-AI-originated journeys — ACTIVE

Validate bounded journeys that **begin in real third-party AI systems**, including:

- at least one representative environment with local-computer/tool access; and
- at least one representative environment without local-computer access.

The local-computer requirement is now actually demonstrated: llama.cpp Web UI + Granite 4.1 3B originated the journey, read the locally selected candidature through `opportunity_research_context_read`, produced useful application-preparation reasoning, wrote it through `candidature_source_add`, and the returned Source was visible in normal AAAAT UI. llama.cpp/Granite are representative evidence fixtures only.

The no-local carrier is implemented by PR #330. It exports the same bounded selected-candidature projection as readable Markdown and imports one returned Markdown/text result through the same selector-free Source-only mutation. Real no-local acceptance remains pending in #329 and must use an external AI environment that cannot access the local AAAAT workspace.

MCP, files, clipboard, browser/desktop automation, synchronized rendezvous mechanisms or another carrier may be appropriate for a concrete environment. None is the PLAN outcome by itself.

Acceptance must demonstrate the external AI doing useful work before AAAAT receives the result. The contract must be able to carry the useful bounded result of that work where the journey requires it: for example analysed/proposed candidature information, retained research Sources, document contributions or selection/tailoring intent. Do not reduce external-AI-first work to `sourceText + outputs[]` unless the Product Owner explicitly decides that is sufficient for a particular journey.

Do not build a generic provider/plugin/integration framework. Choose representative environments and the smallest concrete channel that proves the product concept.

### PLAN[3] — architecture and dependency health — retained

The completed PLAN[3] code may remain: explicit main-process composition, removal of registration side effects, readability work and dependency-health classification are compatible with the product direction.

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
- Do not use the Product Owner as a transport layer for routine engineering or deterministic setup work.
- Use a bounded specialist only for substantial autonomous work where it materially reduces owner effort; scarce Codex/Copilot quota is not for small deterministic tasks.
- A run orchestrator may inspect broadly enough to understand one PLAN outcome, but its implementation prompt must remain inside that outcome.
- Implementation agents must not edit higher-authority/derived requirements to normalize their own implementation.
- Prefer one coherent specialist pass, continue the same specialist with short deltas, then independently review the actual diff and cross-surface consequences.
- A specialist never advances the PLAN sequence or declares its own PLAN complete.
- Evidence environments, models and carriers are fixtures, not project architecture.
