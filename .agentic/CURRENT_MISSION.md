# Current mission — PLAN[4] Blueprint render model

Current explicit Product Owner instruction remains highest authority.

Base main: `5473e82f52e4d47d392d8222cc2da1fc1d3da24c`.

PLAN[0]/[1]/[3] are retained. PLAN[2] is complete. PLAN[4] remains active. PLAN[5] remains blocked until PLAN[4] settles.

## Execution model

The master orchestrator owns sequencing, scope, repository reading, design recovery, branch/diff review, independent evidence interpretation, PR creation/merge and durable state propagation.

Normal substantial implementation is done by one GitHub-capable specialist per coherent bounded slice. Do not use the Product Owner as a prompt courier for read-only/review/planning microsteps.

## Accepted PLAN[4] rendering evidence

Issue #344 / PR #348 established and corrected the first real package/rendering boundary:

- `aaaat.sty` exposes LaTeX2e commands with expl3 internals;
- TypeScript owns generated document data in `data.tex`;
- the CV layout paginates long content without intentional truncation;
- branch Verify #1572 (`36323791503`) passed on correction head `0d4bc9a8ee265495d50ae48c98f96415fb7620bd`;
- orchestrator independent real-LaTeX validation produced a 5-page 7-section / 37-entry CV with all content retained, no `Overfull \\vbox`, and body content on page 1;
- PR #348 real-LaTeX run `36324026414` passed the strengthened multipage/content-survival boundary.

Issue #351 / PR #353 established the accepted Blueprint selection/ownership boundary:

- editable/saved CV data remains composition-only and Blueprint-independent;
- one shared LaTeX package/data contract supports both CV and cover-letter presentation;
- the shipped design is the first built-in Blueprint and additional compatible `.tex` Blueprints may be discovered from Electron `userData/blueprints`;
- Blueprint choice is explicit render-time input for CV and standalone cover-letter rendering and is not added to editable CV/template/letter persistence;
- generated/retained projects contain generic `main.tex`, exact selected `blueprint.tex`, generated `data.tex`, shared `aaaat.sty`, and the resulting PDF/build output;
- Application packet cover-letter rendering reuses the exact `blueprint.tex` retained by its selected Rendered CV;
- branch Verify #1580 (`36327742442`) passed on exact implementation head `c658f0d9e11fd4d1cf62cfa5d2e8ee0005ef55d8` with 45 test files / 143 tests passing;
- orchestrator independent pdfLaTeX validation of the unified built-in Blueprint produced a 4-page 7-section / 37-entry CV with 37/37 markers, 7/7 sections, no `Overfull \\vbox`, and body content on page 1;
- orchestrator independently compiled a standalone accented cover letter through the same Blueprint and a separately authored compatible Blueprint against the same CV data;
- PR #353 real-LaTeX portability run `36330290494` passed;
- PR #353 Windows package candidate run `36330290490` passed including the affected packaged runtime journeys;
- PR #353 merged as `5473e82f52e4d47d392d8222cc2da1fc1d3da24c` and closed Issue #351.

Reuse this evidence only while later work does not materially alter the exercised TeX/rendering or renderer/preload boundaries.

## Product Owner corrected Blueprint/CV model

- There are currently no real saved/user CVs whose historical representation creates a compatibility obligation.
- AAAAT may save editable CVs so the user can reopen and edit them later. A saved/editable CV is CV data/composition, not a rendered artifact.
- The existing `WorkingCvRecord` / `working_cvs` persistence may remain the implementation basis for editable CVs. PLAN[4] does not need an additional saved-CV layer or development-era compatibility machinery.
- The same editable/saved CV data can be rendered through different Blueprints.
- Blueprint choice is presentation selected for rendering, not CV ownership. Do not add Blueprint ownership semantics to CV Templates or editable CV/letter records without a later explicit Product Owner decision.
- A CV Template remains reusable content/composition. It does not select or own presentation.
- AAAAT ships one compatible Blueprint initially and may ship more later.
- A Blueprint is a LaTeX source file conforming to the AAAAT document-data/package contract. It is not a normal-user-created CV version and there is no in-app Blueprint editor/designer/customizer.
- Advanced users may add compatible Blueprint files to AAAAT's application/configuration area. Once present there, AAAAT discovers them and offers them as render choices. This is application-level configuration, not per-workspace duplication and not an arbitrary external-path dependency.
- Keep one shared AAAAT LaTeX package/library. Do not duplicate that library per Blueprint merely to create a new design.
- Blueprint design covers both CV and cover-letter presentation. Cover letters are not a separate customization system.
- TypeScript remains responsible for data feeding; LaTeX remains responsible for presentation/layout.
- LaTeX2e public API + expl3 internals + pdfLaTeX remain the technical boundary.
- A rendered CV, rendered letter, or Application packet retains the exact source project actually used for that render. This is immutable artifact behavior, distinct from editable-CV persistence.
- Do not invent a Blueprint marketplace, registry framework, plugin system, generic document/layout engine, DSL, drag/drop designer, font/theme abstraction, image/header asset system, or PLAN[5] editor redesign.

## Remaining PLAN[4] boundary

The minimal infrastructure/ownership/selection boundary is now implemented and accepted. Do not reopen it by inventing persistence or customization semantics.

The master orchestrator must now recover the remaining PLAN[4] product/design work directly from current authority. Known owner-paired areas include the actual built-in Blueprint design direction and any richer language/typography/font behavior that the authority still leaves unresolved. Detailed visual/product choices must come from the Product Owner rather than being inferred from the minimal current Blueprint.

Before dispatching another implementation specialist, the master orchestrator must determine whether the remaining work is:

1. a bounded implementation already fixed by authority; or
2. a genuine Product Owner design decision.

If implementation is already fixed, dispatch one coherent substantial slice. If product design is genuinely unresolved, ask only the smallest decision set needed to proceed. Do not delegate read-only recovery to the Product Owner.
