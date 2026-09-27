# Current mission — PLAN[5] Tags glossary refinement

Current explicit Product Owner instruction remains highest authority.

Base main: `82165592914a761639dd85cab4755d13b0882f12`.

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

Working CV editing satisfies the bounded read-first refinement: one ordered CV outline, one selected item in edit mode, optional details only when retained or deliberately added, preserved source/ownership semantics, section roles, template reuse, AI tailoring, Blueprint choice and rendering. No domain/rendering boundary changed.

Acceptance evidence: implementation head `4697d9048f593a8f20b8dd852b478e5dba4f302c`; Verify #1612 / run `36342411968`; orchestrator renderer/state review; automatic Windows candidate `36344203631`; merge `f4a19c0cb4835fa28af338ace84c60419cf61b1f`.

## Accepted PLAN[5] slice — Issue #362 / PR #364

My information now reads as one coherent professional-information experience: read-first reusable items, one selected item editor, deliberate optional details, contextual saved variations, one-at-a-time Career preferences, one consistent `AI may use this information` eye affordance, and preserved reference-integrity/dirty/document-return behavior. No schema/service/domain/document/persistence boundary changed.

Acceptance evidence: implementation head `19f40ae3e73cda5f51e950dc30407adea43ec21a`; Verify #1625 / run `36346312108`; orchestrator base-item/variation/Career-preference/AI-use/handoff review; merge `863526ef8dffb5274f5b217aec3f5b861c57bc9e`.

## Accepted PLAN[5] slice — Issue #365 / PR #368

Candidature fields now read as one coherent information object without changing the candidature model:

- Primary and More reuse the same field-object rendering path;
- default fields are read-first with label/description, retained typed value or `Not set`, compact actions and contextual AI state;
- ordinary Edit exposes typed value editing while existing-field name/description editing remains behind deliberate `Edit information details` disclosure;
- only one ordinary field editor is active at a time and dirty switches require explicit discard;
- favourite membership/order/card size live under contextual `Field options` and preserve the existing preference/reorder APIs;
- each field has exactly one ordinary eye affordance with accessible meaning `AI may use this information`; `Ask AI` remains a separate operation;
- queued/working/failure/no-result/proposal/partial-issue/applied states and explicit accept/edit/dismiss/retry behavior remain intact;
- AI correction reuses typed value editing without definition/presentation/permission controls;
- custom-field creation/value-format behavior remains intact;
- no shared candidature contract, database, main-process, task-store, document or external-assistant boundary changed.

Acceptance evidence:

- implementation head `cec6bb95e008b236bc8bbeb5c800a4f8532c0183` changed exactly six renderer/test files;
- branch Verify #1638 / run `36350768827` passed Ordinary verification and Verification gate on that exact head;
- orchestrator independently reviewed editor coordination, favourite projection movement, definition reachability, single AI permission and AI acceptance behavior;
- PR #368 had no additional PR workflow configured for the exact head and was mergeable on the already-green branch evidence;
- PR #368 merged as `82165592914a761639dd85cab4755d13b0882f12` and closed Issue #365.

No real-LaTeX rerun was required for these renderer-only PLAN[5] slices.

## Next coherent slice — Issue #369

Implement **Tags as a low-friction shared workspace glossary** without redesigning the Tag domain.

Current Tag semantics already satisfy important UX authority and must be preserved:

- shared canonical name, aliases, definition and optional notes;
- compact application Tag chips;
- attach autocomplete over shared Tags;
- create missing Tag with a real definition;
- selecting an attached Tag exposes shared meaning and allows editing;
- candidature corpus search is already Tag-aware and can surface `Tag match`.

The remaining gaps are discoverability and friction:

- move the selected-application attached-Tag/attach-search interaction out of broad `More` so it is directly reachable while reading the application, without turning Tags into primary application identity;
- never render the whole glossary as a permanent application list;
- add a compact read-first `Tags` visor in the persistent loaded-workspace rail;
- empty visor query must not dump the glossary;
- visor search finds shared Tags by canonical name/aliases and shows canonical name, aliases, definition and notes for the selected result;
- keep the rail visor read-first rather than creating a second competing Tag editor; contextual shared editing remains on attached application Tags;
- application Tag create/update must refresh the visor without a workspace reload using a small renderer-local revision/callback, not a new state architecture;
- workspace switch/reset/restore loads the correct glossary;
- preserve existing corpus Tag-search behavior and constrained-window reachability.

Prefer renderer-local work around a small Tag visor component, `App.tsx`, `CandidaturesWorkspace.tsx`, existing shell/candidature CSS and focused tests. Reuse existing Tag APIs; no schema/service/preload-contract change is expected.

Do not change candidature-field behavior from #365, AI behavior, Documents, My information, Home semantics, Settings architecture or external-assistant integration.

## Remaining PLAN[5] authority notes

- **Loaded Home is not implementation-ready from `MASTER_PLAN.md` alone.** Current `docs/UX_DEFINITION.md` says loaded Home remains a branded landing surface and explicitly must not duplicate rail Data/AI/PDF status or become a metrics dashboard, while the older master-plan finding describes a simplified local control console surfacing those states. Do not delegate a Home redesign until this authority conflict is resolved.
- **AI-settings guidance is not automatically pending.** Current AI Settings already exposes editable per-operation `AI instructions` as a first-class section. Recover a concrete residual defect before creating another AI-settings slice.
- Later cross-surface polish must remain evidence-driven; do not create work merely to exhaust roadmap headings.
