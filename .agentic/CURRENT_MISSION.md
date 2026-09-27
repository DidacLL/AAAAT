# Current mission — PLAN[5] UX refinement

Current explicit Product Owner instruction remains highest authority.

Base main: `59f61743ddf2f57ad0bd03e3df8e824e65051536`.

PLAN[0]/[1]/[3] are retained. PLAN[2] is complete. PLAN[4] is complete. PLAN[5] is now active.

## Execution model

The master orchestrator owns sequencing, scope, repository reading, design recovery, branch/diff review, independent evidence interpretation, PR creation/merge and durable state propagation.

Normal substantial implementation is done by one GitHub-capable specialist per coherent bounded slice. Do not use the Product Owner as a prompt courier for read-only/review/planning microsteps.

## PLAN[4] accepted completion

PLAN[4] is complete against ADR 0015 and the Product Owner decisions fixed during the recovery.

Issue #344 / PR #348 established and corrected the real package/rendering boundary:

- `aaaat.sty` exposes a LaTeX2e public API with expl3 internals;
- TypeScript owns generated document data in `data.tex`;
- the CV layout paginates long content without intentional truncation;
- PR #348 real-LaTeX evidence passed the strengthened multipage/content-survival boundary.

Issue #351 / PR #353 established the Blueprint selection/ownership boundary:

- editable/saved CVs remain composition-only and Blueprint-independent;
- one shared package/data contract supports CV and cover-letter presentation;
- AAAAT ships one built-in Blueprint and discovers compatible user `.tex` Blueprints from Electron `userData/blueprints`;
- Blueprint selection is explicit render-time input, not editable CV/template/letter ownership;
- retained/exported projects keep the exact selected Blueprint, generated data, shared package and PDF/build output;
- Application packet cover letters reuse the exact Blueprint retained with the selected Rendered CV;
- PR #353 real-LaTeX portability and Windows packaged-runtime candidate evidence passed.

Issue #355 / PR #358 completed the remaining owner-paired document design:

- CV Template and Working CV sections carry Blueprint-independent `presentationRole: "main" | "secondary"` composition data;
- Working-CV derivation, save-as-template, Rendered-CV snapshots and duplication preserve the role;
- the shipped Blueprint maps `secondary` to its narrow region, while another compatible Blueprint can interpret the same semantic role differently;
- the old order/count-based main/rail split is removed;
- `data.tex` feeds semantic roles and TypeScript owns no region geometry;
- document language remains document data and uses the bounded pdfLaTeX/Babel Latin-script set;
- supported language names, codes and region variants resolve explicitly; unsupported/non-Latin values fail clearly rather than silently becoming English;
- fonts remain Blueprint-owned; there is no font picker/theme abstraction or alternate-engine matrix.

Acceptance evidence for #355:

- branch Verify #1602 / run `36337507923` passed on exact head `915dc9fccb6435f8f5c9b6bba3a341749b41cdcd`;
- orchestrator independent real-pdfLaTeX validation produced a mixed-role 4-page 7-section / 37-entry CV with 37/37 markers, 7/7 sections, no `Overfull \\vbox`, and body content on page 1;
- the orchestrator independently compiled a standalone accented French letter and an alternate stacked Blueprint against the same CV data;
- PR #358 real-LaTeX portability run `36338236592` passed;
- PR #358 Windows package candidate run `36338236624` passed, including affected packaged runtime journeys;
- PR #358 merged as `59f61743ddf2f57ad0bd03e3df8e824e65051536` and closed Issue #355.

Reuse this evidence unless later work materially changes the exercised TeX/rendering, Blueprint contract, or packaged document boundaries.

## Settled document model carried into PLAN[5]

- Editable CVs are saved/reopenable data/composition, not rendered artifacts.
- CV Templates own reusable composition, including semantic section roles, but do not own presentation.
- Blueprints own presentation and fonts and are chosen at render time.
- The shipped Blueprint is the accepted first design; future compatible Blueprints may interpret `secondary` differently.
- Cover letters use the same Blueprint design contract.
- Rendered CVs, rendered letters and Application packets retain exact source projects.
- pdfLaTeX + Babel is the current engine/language boundary; non-Latin-script support is outside the current scope.
- Do not reopen PLAN[4] by inventing Blueprint persistence, a marketplace/registry, layout DSL, drag/drop designer, generic theme/font system, image/header asset system, or alternate TeX engines unless a later explicit Product Owner decision requires it.

## PLAN[5] active boundary

PLAN[5] refines the already broadly acceptable UI/UX without changing settled product/domain meaning.

Durable owner findings preserved in `MASTER_PLAN.md` include:

- candidature fields should read as coherent information objects rather than unrelated edit/presentation/AI glyph mechanisms;
- loaded Home should become a useful local control console rather than mostly a launcher;
- Tags should become easier to add/retrieve and read as reusable workspace vocabulary/glossary without becoming an ontology;
- My information should become readable-first rather than form-centric;
- user-editable AI guidance should be clearly centralized in AI Settings;
- CV editing should read as one coherent document/composition rather than unrelated generic record boxes and should expose only relevant fields/controls.

The order of those findings is not an implementation priority by itself. The master orchestrator must inspect current authority and implementation, choose the first coherent PLAN[5] slice, and delegate substantial implementation as one bounded run. Do not bundle all PLAN[5] areas into one redesign.