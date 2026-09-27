# Current mission — PLAN[5] remaining UX boundary

Current explicit Product Owner instruction remains highest authority.

Base main: `88dc4468bc19cd9b421b5da88d9d2fccd0e7600b`.

PLAN[0]/[1]/[3] are retained. PLAN[2] and PLAN[4] are complete. PLAN[5] remains active pending resolution of the loaded-Home authority conflict and a final evidence-based residual-gap check.

## Execution model

The master orchestrator owns sequencing, scope, repository reading, design recovery, branch/diff review, independent evidence interpretation, PR creation/merge and durable state propagation.

Normal substantial implementation is done by one GitHub-capable specialist per coherent bounded slice. Do not use the Product Owner as a prompt courier for read-only/review/planning microsteps.

## Settled PLAN[4] document model

- Editable CVs are saved/reopenable data/composition, not rendered artifacts.
- CV Templates own reusable composition including semantic `main` / `secondary` section roles, but do not own presentation.
- Blueprints own presentation/fonts and are chosen at render time.
- The shared LaTeX2e/expl3 package/data contract supports CV and cover-letter presentation.
- Rendered CVs, rendered letters and Application packets retain exact source projects.
- pdfLaTeX + Babel is the current engine/language boundary; non-Latin-script support is outside current scope.
- Do not reopen PLAN[4] through Blueprint persistence, marketplace/registry work, a layout DSL, generic theme/font systems, image/header asset systems or alternate TeX engines without later explicit Product Owner direction.

Accepted PLAN[4] evidence remains recorded in `MASTER_PLAN.md`, SPEC/ADR authority and merged #348/#353/#358 history.

## Accepted PLAN[5] slices

### Issue #360 / PR #361 — Working CV

Working CV editing is read-first: one ordered CV outline, one selected item editor, optional details only when retained or deliberately added, preserved source/ownership semantics, section roles, template reuse, AI tailoring, Blueprint choice and rendering. No domain/rendering boundary changed.

Evidence: implementation `4697d9048f593a8f20b8dd852b478e5dba4f302c`; Verify #1612 / run `36342411968`; orchestrator review; automatic Windows candidate `36344203631`; merge `f4a19c0cb4835fa28af338ace84c60419cf61b1f`.

### Issue #362 / PR #364 — My information

My information is read-first with contextual reusable-item editing, deliberate optional details, contextual saved variations, one-at-a-time Career preferences, one consistent `AI may use this information` affordance, preserved reference integrity and dirty/document-return behavior. No schema/service/domain/document/persistence boundary changed.

Evidence: implementation `19f40ae3e73cda5f51e950dc30407adea43ec21a`; Verify #1625 / run `36346312108`; orchestrator review; merge `863526ef8dffb5274f5b217aec3f5b861c57bc9e`.

### Issue #365 / PR #368 — candidature fields

Candidature fields now read as one coherent information object. Primary and More reuse one field rendering path; typed value editing is local; label/description editing is contextual; one ordinary editor is active at a time with dirty-discard protection; favourite/order/card-size controls are contextual; each field has one ordinary `AI may use this information` affordance; AI operation/proposal state remains contextual and requires explicit acceptance; custom field creation remains intact.

Evidence: implementation `cec6bb95e008b236bc8bbeb5c800a4f8532c0183`; Verify #1638 / run `36350768827`; orchestrator review; merge `82165592914a761639dd85cab4755d13b0882f12`.

### Issue #369 / PR #371 — Tags

Tags now satisfy the bounded shared-glossary UX refinement without changing the Tag domain:

- selected-application Tag chips/search/create/edit are directly reachable outside broad `More`;
- there is one application Tag surface and it never renders the whole glossary;
- the persistent loaded-workspace rail has a compact read-only Tag visor across Home, Applications, CVs/Documents, My information and Settings;
- empty visor search does not dump the glossary; search is bounded and matches canonical name, aliases, definition and notes;
- selected visor results show shared canonical name, aliases, definition and notes;
- application Tag create/update refreshes the visor via a small renderer-local revision callback without remounting candidature work;
- workspace switch/reset/restore loads the correct glossary;
- shared Tag editing remains contextual on attached application Tags with dirty/discard protection;
- existing candidature Tag-aware search / `Tag match` behavior remains unchanged;
- no Tag schema/service/SQLite/preload/shared-contract boundary changed.

Acceptance evidence:

- implementation head `c82c8c4bada94e4b6f385a10d8f84696a75fae10` changed exactly eight renderer/test files;
- branch Verify #1654 / run `36353082997` passed Ordinary verification and Verification gate on that exact head;
- orchestrator independently reviewed Tag visor loading/search, application Tag mutations, dirty protection and non-remount synchronization;
- PR #371 had no additional PR-only workflow on the exact head and was mergeable on the already-green branch evidence;
- PR #371 merged as `88dc4468bc19cd9b421b5da88d9d2fccd0e7600b` and closed Issue #369.

No real-LaTeX rerun was required for these renderer-only PLAN[5] slices.

## Remaining PLAN[5] boundary

### Loaded Home requires Product Owner direction

Do not delegate Home from `MASTER_PLAN.md` alone.

Current `docs/UX_DEFINITION.md` says loaded Home remains a branded landing surface with workspace context, obvious continuation into ordinary work and compact workspace switching/recovery; it explicitly says Home must not duplicate the rail's Data/AI/PDF badges or become a metrics dashboard.

The older `MASTER_PLAN.md` finding instead describes loaded Home as a simplified local control console surfacing workspace/local information, background tasks, AI state and document/PDF state.

Those directions materially conflict. Resolve the intended loaded-Home model with the Product Owner before implementation. Do not infer a hybrid.

### AI Settings is not automatically pending

Current AI Settings already exposes editable per-operation `AI instructions` as a first-class section and owns connection/routing/instruction configuration. Do not create an AI-settings slice without identifying a concrete residual defect against current authority.

### Final PLAN[5] residual check

After the Home decision is resolved and any resulting bounded slice is accepted, inspect current code against current UX authority once for concrete remaining cross-surface defects. Do not create work merely to exhaust roadmap headings. Only then assess whether PLAN[5] is complete.
