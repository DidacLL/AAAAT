# Current mission — PLAN[5] My information refinement

Current explicit Product Owner instruction remains highest authority.

Base main: `f4a19c0cb4835fa28af338ace84c60419cf61b1f`.

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

Working CV editing now satisfies the bounded read-first refinement:

- sections/items read as one ordered semantic CV outline rather than equal-weight record forms;
- retained content is primary; source/tailoring context is secondary;
- only the deliberately selected item expands inline for editing;
- Title remains directly editable while optional subtitle/description/start/end/link fields appear only when retained or deliberately added;
- clearing optional detail stores it as absent;
- open/custom `kind` values remain supported without profession/content registries;
- current / saved-variation / `This CV only` source and ownership semantics remain unchanged;
- section role/reorder/remove, item reorder/remove, add-section/add-information, template reuse, AI tailoring, Blueprint choice and rendering remain reachable;
- no schema, persistence, shared-contract, AI-contract, service, LaTeX, Blueprint or render-API boundary changed.

Acceptance evidence:

- implementation head `4697d9048f593a8f20b8dd852b478e5dba4f302c` changed only `src/renderer/DocumentWork.tsx`, `src/renderer/documents.css`, and `test/WorkingCvEditor.read-first.test.tsx`;
- branch Verify #1612 / run `36342411968` passed on that exact head;
- the orchestrator independently reviewed the renderer state transitions and semantic tests against Issue #360;
- PR #361's automatically triggered Windows candidate run `36344203631` passed package creation and affected packaged-runtime journeys;
- PR #361 merged as `f4a19c0cb4835fa28af338ace84c60419cf61b1f` and closed Issue #360.

No real-LaTeX rerun was required because the slice did not alter TeX/rendering behavior.

## Next coherent slice — Issue #362

Implement **My information as one readable professional record** without redesigning the professional-information domain.

The current renderer already has the necessary reusable-item, saved-variation, career-context and AI-disclosure semantics. The remaining UX problem is fragmentation and form-centric editing.

Required bounded outcome:

- preserve the grouped reusable-information overview and make retained content the normal read-first surface;
- edit only the selected item in context;
- keep Title and the open-ended semantic group/kind editable, but omit absent optional subtitle/description/date/link fields until deliberately added;
- keep custom/unanticipated kinds valid; do not create a career ontology or schema engine;
- make saved variations contextual/secondary to the selected reusable item rather than a competing equal-weight form panel;
- keep all existing variation content reachable, including dates and URL, while requiring no variation for ordinary use;
- keep career preferences semantically distinct from factual evidence but visibly part of the same My information experience;
- make career-preference editing contextual/compact instead of rendering all preference textareas as one administration form;
- preserve one ordinary AI-use meaning: `AI may use this information`, with one consistent contextual affordance for reusable items and individual career-preference fields;
- preserve document return context, reference-integrity behavior, dirty/discard boundaries and manual/no-AI completeness.

Prefer renderer-local changes around `ProfileWorkspace.tsx`, `CareerContextPanel.tsx`, the two AI-disclosure controls, `professional-information.css`, minimal parent composition if genuinely necessary, and focused semantic tests.

Do not change schema, services/contracts, document/PLAN[4] behavior, external-AI integration, candidature fields, Tags, Home or Settings in this slice. Do not bundle all PLAN[5] findings together.

Other PLAN[5] owner findings remain durable in `MASTER_PLAN.md` and must not be lost: candidature-field cohesion, loaded Home, Tags, AI-settings guidance, and later cross-surface polish.