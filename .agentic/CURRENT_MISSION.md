# Current mission — PLAN[4] Blueprint render model

Current explicit Product Owner instruction remains highest authority.

Base main: `f03b0ce2b8ef03b54cf9e162604dc57cacbc1361`.

PLAN[0]/[1]/[3] are retained. PLAN[2] is complete. PLAN[4] remains active. PLAN[5] remains blocked until PLAN[4] settles.

## Execution model

The master orchestrator owns sequencing, scope, repository reading, design recovery, branch/diff review, independent evidence interpretation, PR creation/merge and durable state propagation.

Normal substantial implementation is done by one GitHub-capable specialist per coherent bounded slice. Do not use the Product Owner as a prompt courier for read-only/review/planning microsteps.

## Accepted PLAN[4] rendering evidence

Issue #344 / PR #348 established and corrected the first real package/rendering boundary:

- `aaaat.sty` exposes LaTeX2e commands with expl3 internals;
- TypeScript owns generated document data in `data.tex`;
- the current CV layout paginates long content without intentional truncation;
- branch Verify #1572 (`36323791503`) passed on correction head `0d4bc9a8ee265495d50ae48c98f96415fb7620bd`;
- orchestrator independent real-LaTeX validation produced a 5-page 7-section / 37-entry CV with all content retained, no `Overfull \\vbox`, and body content on page 1;
- PR #348 real-LaTeX run `36324026414` passed the strengthened multipage/content-survival boundary.

Reuse that evidence only while later work does not materially alter the TeX/rendering boundary.

## Product Owner corrected Blueprint/CV model

The following replaces the previous incorrect ownership/persistence interpretation.

- There are currently no real saved/user CVs whose historical representation creates a compatibility obligation.
- AAAAT may save editable CVs so the user can reopen and edit them later. A saved/editable CV is CV data/composition, not a rendered artifact.
- The existing `WorkingCvRecord` / `working_cvs` persistence may remain the implementation basis for editable CVs. PLAN[4] does not need an additional saved-CV layer or development-era compatibility machinery.
- The same editable/saved CV data can be rendered through different Blueprints.
- Blueprint choice is a **render-time input for the current slice**, not presentation ownership attached to the CV. Do not add Blueprint IDs/paths/defaults/last-used values to CV records, CV Templates, letters, or the workspace database unless a later explicit product decision requests that convenience.
- A CV Template remains reusable content/composition. It does not select or own presentation.
- AAAAT ships one compatible Blueprint initially and may ship more later.
- A Blueprint is a LaTeX source file conforming to the AAAAT document-data/package contract. It is not a normal-user-created CV version and there is no in-app Blueprint editor/designer/customizer.
- Advanced users may add compatible Blueprint files to AAAAT's application/configuration area. Once present there, AAAAT discovers them and offers them as render choices. This is application-level configuration, not per-workspace duplication and not an arbitrary external-path dependency.
- Keep one shared AAAAT LaTeX package/library. Do not duplicate that library per Blueprint merely to create a new design.
- Blueprint design covers **both CV and cover-letter presentation**. Cover letters are not a separate customization system.
- TypeScript remains responsible for data feeding; LaTeX remains responsible for presentation/layout.
- LaTeX2e public API + expl3 internals + pdfLaTeX remain the technical boundary.
- A rendered CV, rendered letter, or Application packet retains the exact source project actually used for that render. This is immutable artifact behavior, distinct from editable-CV persistence.
- Do not invent a Blueprint marketplace, registry framework, plugin system, generic document/layout engine, DSL, drag/drop designer, font/theme abstraction, image/header asset system, or PLAN[5] editor redesign.

## Next coherent slice

Issue #351 implements render-time Blueprint discovery and selection across both CV and cover-letter rendering while preserving editable-CV save/reopen behavior:

1. define one small compatible Blueprint-file contract on top of the shared `aaaat.sty` data/package API;
2. ship the current design as the first built-in Blueprint under that contract;
3. discover additional compatible Blueprint files from an AAAAT application-level Blueprint directory under Electron `userData`;
4. expose the available Blueprint list through a typed trusted boundary;
5. pass the selected Blueprint explicitly into CV and cover-letter render operations without adding Blueprint ownership to editable document data;
6. retain the exact selected Blueprint source plus shared package/data/entrypoint sources inside each generated artifact/project;
7. expose Blueprint choice beside the render action for both CV and cover-letter work;
8. preserve editable-CV save/reopen behavior and Application packet semantics using retained contributor artifacts.

No schema migration machinery or development-era compatibility programme is justified for this slice.

The implementation specialist may choose the smallest LaTeX macro/file shape that satisfies this model, but may not change the product semantics above.
