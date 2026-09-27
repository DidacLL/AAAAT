# Current mission — PLAN[4] explicit section-role design

Current explicit Product Owner instruction remains highest authority.

Base main: `2829952a8e45ad6567fa4011bee4fd8e66c8eec7`.

PLAN[0]/[1]/[3] are retained. PLAN[2] is complete. PLAN[4] remains active. PLAN[5] remains blocked until PLAN[4] settles.

## Execution model

The master orchestrator owns sequencing, scope, repository reading, design recovery, branch/diff review, independent evidence interpretation, PR creation/merge and durable state propagation.

Normal substantial implementation is done by one GitHub-capable specialist per coherent bounded slice. Do not use the Product Owner as a prompt courier for read-only/review/planning microsteps.

## Accepted PLAN[4] rendering evidence

Issue #344 / PR #348 established and corrected the real package/rendering boundary:

- `aaaat.sty` exposes LaTeX2e commands with expl3 internals;
- TypeScript owns generated document data in `data.tex`;
- the CV layout paginates long content without intentional truncation;
- branch Verify #1572 (`36323791503`) passed on correction head `0d4bc9a8ee265495d50ae48c98f96415fb7620bd`;
- orchestrator independent real-LaTeX validation produced a multipage 7-section / 37-entry CV with all content retained, no `Overfull \\vbox`, and body content on page 1;
- PR #348 real-LaTeX run `36324026414` passed the strengthened multipage/content-survival boundary.

Issue #351 / PR #353 established the accepted Blueprint selection/ownership boundary:

- editable/saved CV data remains composition-only and Blueprint-independent;
- one shared LaTeX package/data contract supports both CV and cover-letter presentation;
- the shipped design is the first built-in Blueprint and compatible `.tex` Blueprints may be discovered from Electron `userData/blueprints`;
- Blueprint choice is explicit render-time input, not editable CV/template/letter ownership;
- retained projects keep the exact selected `blueprint.tex`, generated `data.tex`, shared `aaaat.sty`, generic entrypoint and build/PDF output;
- Application packet cover-letter rendering reuses the exact Blueprint retained by the selected Rendered CV;
- branch Verify #1580 (`36327742442`) passed on exact implementation head `c658f0d9e11fd4d1cf62cfa5d2e8ee0005ef55d8`;
- orchestrator independently validated the unified built-in Blueprint with a fresh long CV, standalone accented letter and separately authored compatible Blueprint;
- PR #353 real-LaTeX portability run `36330290494` and Windows package candidate run `36330290490` both passed;
- PR #353 merged as `5473e82f52e4d47d392d8222cc2da1fc1d3da24c` and closed Issue #351.

Reuse this evidence only while later work does not materially alter the exercised TeX/rendering or renderer/preload boundaries.

## Product Owner fixed Blueprint/CV model

- AAAAT may save editable CVs so users can reopen and edit them later. Editable CVs are data/composition, not rendered artifacts.
- The same editable CV data can render through different Blueprints.
- Blueprint choice is presentation selected for rendering, not CV ownership.
- A CV Template remains reusable content/composition. It does not select or own presentation.
- AAAAT ships one compatible Blueprint initially and may ship more later.
- Advanced users may add compatible Blueprint `.tex` files in AAAAT application configuration; there is no in-app Blueprint editor/designer/customizer.
- Keep one shared AAAAT LaTeX package/library.
- Blueprint design covers both CV and cover-letter presentation.
- TypeScript owns data feeding; LaTeX owns presentation/layout.
- LaTeX2e public API + expl3 internals + pdfLaTeX remain the technical boundary.
- Rendered CVs, rendered letters and packets retain the exact source project used.
- Do not invent a Blueprint marketplace, generic registry/framework, layout DSL, drag/drop designer, font/theme abstraction, image/header asset system, alternate TeX engine work or PLAN[5] redesign.

## Product Owner decisions for Issue #355

The remaining first-Blueprint design decisions are now fixed:

1. **Keep the current shipped Blueprint design** as the first AAAAT Blueprint: full-width title/header, wide main CV region, narrow secondary region, and coordinated cover-letter presentation through the same Blueprint.
2. **CV composition explicitly owns semantic section presentation role.** Each CV Template section and editable/Working CV section has a role `main` or `secondary`.
   - This is not geometry and not a Blueprint identifier.
   - A Blueprint interprets the role.
   - The current Blueprint maps `secondary` to its rail.
   - A future Blueprint may put secondary content at the bottom or elsewhere without changing CV data.
   - Section order remains independent from presentation role; remove the current automatic order-based main/rail split.
3. **Language/font boundary:** document language remains document data; use Babel through pdfLaTeX; Latin-script languages are in scope for now; non-Latin-script support is out of scope; unsupported language must fail clearly rather than silently becoming English. Fonts remain Blueprint-owned. No font picker/theme/font abstraction is added now.

There is no real-use v2 data baseline requiring compatibility machinery for the development-era section shape.

## Next coherent slice — Issue #355

Implement explicit section presentation roles and the fixed Latin-language boundary across the existing document model:

- add `main` / `secondary` role to CV Template and editable/Working CV section composition;
- expose concise role choice in both template and Working CV editing;
- preserve roles when deriving Working CVs from templates; new/profile/blank sections default to `main`;
- keep explicit save-back ownership semantics: Working CV changes do not silently rewrite templates;
- feed the semantic role through `data.tex` and the public LaTeX package contract;
- make the shipped Blueprint render `main` in its wide region and `secondary` in its current narrow region while preserving order inside each role;
- remove the previous automatic last-third/order split from `aaaat.sty`/Blueprint behavior;
- prove another compatible Blueprint can interpret `secondary` differently without changing CV data;
- validate supported Latin-script language input through Babel and reject unsupported/non-Latin language values clearly;
- preserve #351 render-time Blueprint selection, retained-source semantics, cover letters, packets, portable export and long-CV pagination.

Do not broaden this slice beyond Issue #355. The specialist does not declare PLAN[4] complete.