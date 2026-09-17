# AAAAT master plan

This is the durable sequencing and owner-requirements record for the path to alpha. Current explicit Product Owner instruction remains higher authority; repository authority is still resolved through `AGENTS.md`.

`CURRENT_MISSION.md` describes only the active run. This file preserves later PLANs and owner findings so they are not lost when missions, issues, PRs, or agents change.

## Sequence to alpha

### PLAN[0] — accepted integrated baseline

Outcome: finish PR #319 as a coherent baseline, resolve first-class defects exposed by owner natural use, then integrate the accepted candidate into `main`.

Current first-class defects:

1. **AI readiness must be truthful.** Configuration/routing or a historical success must not mean current `AI: Ready`. A successful current validation/request may establish readiness; a relevant failure must promptly invalidate it. Reuse existing validation/task/diagnostic state; do not invent polling or a generic health subsystem.

2. **Candidature presentation must be one configurable field surface.** Remove the product-level duplication between Focus and All-data views. Corpus recognition and selected-candidature reading use the same field presentation preferences: favourite/starred fields appear first, in user order and prominence; a compact More/advanced disclosure reveals the rest. Role and Organisation are shipped field definitions only, with no hidden identity privilege. `identityOrder` must not drive user-visible presentation, and there is no fixed card-title concept outside the configurable field model. Raw Source may explain an active search match but is not an implicit normal field. Avoid generic equal-height card-grid behavior where one long value determines the height of unrelated cards.

Preserve completed PLAN[0] foundation corrections:

- no arbitrary fixed BrowserWindow minimum;
- `schema.sql` is the single structural workspace schema authority;
- ordinary development verification is lightweight and proportional; stronger packaged verification belongs at explicit run boundaries.

Exit: Product Owner accepts the integrated baseline, it is on `main`, and no known first-class integrity contradiction remains.

### PLAN[1] — test basis

Replace/reduce development-era AI-generated faux guardrails with a smaller, clearer test basis around real user/domain promises. Do not optimize for historical test count, coverage percentage, or implementation freezing. Keep development verification proportional.

### PLAN[2] — external-AI-originated journeys

Validate bounded journeys that begin in third-party AI systems, including journeys with local-computer access and without local-computer access. Solve concrete product journeys; do not build a generic provider/plugin/integration framework.

### PLAN[3] — architecture and dependency health

Owner-led pass for human-readable, directly modifiable code, pragmatic boundaries, and dependency-health triage. Avoid enterprise architecture, framework abstraction contests, and broad rewrites without concrete value.

### PLAN[4] — document/LaTeX package and AAAAT integration

Owner-led document-package work so CV/cover-letter composition, generation, rendering, portability, and AAAAT integration are coherent and maintainable. This precedes final CV-editor UX refinement because the editor should reflect the document model that survives.

### PLAN[5] — UX refinement

Refine the already broadly acceptable UI/UX after the document model settles. Preserve the current visual character unless the Product Owner changes it.

#### Candidature field presentation

The structural information model is fixed in PLAN[0]: one configurable field surface with favourite/starred fields first and progressive disclosure for the rest. PLAN[5] only refines its interaction and visual cohesion.

- Pencil/eye/AI glyph controls break visual cohesion and make a field read as unrelated mechanisms.
- Expanded editable fields consume too much space and are difficult to comprehend as one object.
- A field should read primarily as one coherent information object; editing/privacy/AI actions should be secondary, understandable controls rather than scattered symbols.

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

#### CV editing

- Current CV editing is confusing and form-centric: sections/entries appear as unrelated boxes and expose fields irrelevant to the specific item.
- Redesign around the user's document and document composition, not generic record forms.
- Sections and entries should read as one coherent CV structure, with concise editing and only relevant controls/fields exposed.
- Final shape follows PLAN[4] document-model work rather than pre-empting it.

## Verification policy

Ordinary development uses fast, focused verification. Stronger packaged/runtime verification belongs at meaningful run boundaries. Cross-OS verification belongs near release/finalization or when a change is explicitly platform-sensitive.

## Orchestration contract

The master orchestrator owns sequence and continuity. A temporary run orchestrator owns one PLAN outcome and delegates coherent implementation/review passes. It must not silently substitute itself for an implementation specialist. If its environment cannot delegate another agent, it returns the exact specialist brief instead of making repository implementation changes itself.

Prefer one or a few coherent autonomous passes. Continue the same specialist with a delta brief when possible instead of spawning additive parallel work.
