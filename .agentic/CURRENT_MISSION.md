# Current mission — PLAN[5] candidature field cohesion

Current explicit Product Owner instruction remains highest authority.

Base main: `863526ef8dffb5274f5b217aec3f5b861c57bc9e`.

PLAN[0]/[1]/[3] are retained. PLAN[2] and PLAN[4] are complete. PLAN[5] is active.

## Execution model

The master orchestrator owns sequencing, scope, repository reading, design recovery, branch/diff review, independent evidence interpretation, PR creation/merge and durable state propagation.

Normal substantial implementation is done by one GitHub-capable specialist per coherent bounded slice. Do not use the Product Owner as a prompt courier for read-only/review/planning microsteps.

## Settled PLAN[4] document model

- Editable CVs are saved/reopenable data/composition, not rendered artifacts.
- CV Templates own reusable composition, including semantic `main` / `secondary` section roles, but do not own presentation.
- Blueprints own presentation/fonts and are chosen at render time.
- The shared LaTeX2e/expl3 package/data contract supports both CV and cover-letter presentation.
- Rendered CVs, rendered letters and Application packets retain exact source projects.
- pdfLaTeX + Babel is the current engine/language boundary; non-Latin-script support is outside current scope.
- Do not reopen PLAN[4] through Blueprint persistence, marketplace/registry work, a layout DSL, generic theme/font system, image/header asset system or alternate TeX engines unless a later explicit Product Owner decision requires it.

Accepted PLAN[4] evidence remains recorded in `MASTER_PLAN.md`, SPEC/ADR authority and the merged #348/#353/#358 history. Reuse it unless later work materially changes the exercised rendering boundary.

## Accepted PLAN[5] slice — Issue #360 / PR #361

Working CV editing satisfies the bounded read-first refinement:

- sections/items read as one ordered semantic CV outline;
- retained content is primary and only one selected item expands inline;
- optional content is exposed only when retained or deliberately added;
- open/custom `kind`, source/ownership semantics, section roles, template reuse, AI tailoring, Blueprint choice and rendering remain intact;
- no schema, persistence, shared-contract, AI-contract, service, LaTeX, Blueprint or render-API boundary changed.

Acceptance evidence:

- exact implementation head `4697d9048f593a8f20b8dd852b478e5dba4f302c`;
- branch Verify #1612 / run `36342411968` passed;
- orchestrator independent renderer/state review passed;
- PR #361 automatic Windows candidate run `36344203631` passed;
- PR #361 merged as `f4a19c0cb4835fa28af338ace84c60419cf61b1f` and closed Issue #360.

## Accepted PLAN[5] slice — Issue #362 / PR #364

My information now reads as one coherent professional-information experience without changing its domain model:

- the grouped reusable-item index remains and the selected item is read-first;
- only the selected item enters editing; `Group` remains open `kind` data and Title remains required;
- retained optional subtitle/description/start/end/link content is editable while absent details are deliberately added;
- saved variations are optional/contextual to the base item, and their full existing content contract including dates and URL remains reachable;
- Career preferences remain semantically distinct targeting context but are presented inside the same My information experience and edited one preference at a time;
- reusable items and individual Career preferences use one compact eye affordance with accessible meaning `AI may use this information`;
- existing disclosure persistence, profile/variation/career-context API shapes, reference-integrity failures, dirty protection and document-return handoff remain intact;
- no schema, service/domain, AI-operation, document or persistence boundary changed.

Acceptance evidence:

- implementation head `19f40ae3e73cda5f51e950dc30407adea43ec21a` changed exactly seven renderer/test files;
- branch Verify #1625 / run `36346312108` passed Ordinary verification and Verification gate;
- orchestrator independently reviewed base-item, variation, Career-preference, AI-use and App-level dirty/handoff behavior against Issue #362;
- PR #364 had no PR-triggered workflow configured for its exact head and was mergeable on the already-green branch evidence;
- PR #364 merged as `863526ef8dffb5274f5b217aec3f5b861c57bc9e` and closed Issue #362.

No real-LaTeX rerun was required because neither accepted PLAN[5] slice altered TeX/rendering behavior.

## Next coherent slice — Issue #365

Implement **candidature fields as one coherent information object** without redesigning the candidature/domain model.

PLAN[0] remains authoritative: one configurable field surface, favourite/primary presentation, progressive disclosure for the rest, typed values, explicit AI acceptance and complete manual/no-AI operation.

Required bounded outcome:

- preserve one field representation reused in Primary and More;
- default field view is read-first: label, optional description, retained typed value or `Not set`, and contextual transient AI status/result;
- ordinary value Edit stays local and concise; field-definition editing remains reachable but becomes a compact contextual option rather than permanent form chrome;
- preserve all current typed editors, validation, Save/Clear/Cancel and dirty-state behavior;
- preserve favourite status, favourite order and presentation size but move those controls under one compact field-options interaction instead of a permanent heading strip;
- each field has exactly one ordinary eye/visibility affordance whose accessible meaning is `AI may use this information`, backed by the existing `aiUseAllowed` preference;
- AI permission remains distinct from `Ask AI to fill`; do not render a second `AI use: On/Off` control inside the editor;
- preserve per-field and bulk extraction, queued/working/failure/no-result/proposal/partial-issue/applied states, explicit accept/edit/dismiss/retry behavior and partial-result salvage;
- proposal correction may reuse typed value editing but must not expose field-definition/presentation administration;
- preserve `CandidatureFieldDefinitionsPanel` as the existing advanced field-creation/value-format surface; existing-field label/description editing remains reachable through the field-object interaction;
- preserve custom fields, enable/disable, choice/cardinality definitions and constrained-window reachability.

Prefer renderer-local changes around `CandidaturesWorkspace.tsx`, `CandidatureFieldValueEditor.tsx`, `CandidatureFieldAiState.tsx`, candidature CSS and focused semantic tests.

Do not change shared candidature schema, SQLite, main-process services, AI proposal/task contracts, document/PLAN[4] behavior, Tags, Sources, Send to my AI, Home, Settings or My information in this slice.

Other PLAN[5] owner findings remain durable in `MASTER_PLAN.md`: loaded Home, Tags, centralized AI-settings guidance and later cross-surface polish. Do not invent work for a finding already satisfied by current code; recover the actual remaining gap before delegating it.
