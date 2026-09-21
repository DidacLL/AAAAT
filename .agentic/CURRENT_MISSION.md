# Current mission — PLAN[4] document package and integration

Current explicit Product Owner instruction remains higher authority. PLAN[0]–PLAN[3] are closed. PLAN[5] final UX refinement remains later and is out of scope here.

## Outcome

Make AAAAT's document production one coherent, inspectable, user-owned path while preserving the fixed product distinctions between My information, optional Profile variants, reusable CV templates, editable Working CVs, immutable Rendered CVs, editable cover letters and generated Application packets.

- keep a small LaTeX2e `aaaat.sty` public API with pdfLaTeX/`latexmk -pdf` as the production baseline;
- make TypeScript feed typed CV/letter state into semantic LaTeX commands without leaking internal item kinds or layout decisions;
- keep every generated/exported CV, letter and packet project self-contained and compilable from its own directory;
- add direct local cover-letter rendering, retained output, PDF opening and portable source export for standalone and candidature-owned letters;
- keep the existing Application packet engine, retained contributor snapshots and combined output, and add portable project export;
- preserve immutable Rendered CV snapshots and explicit ownership/save-back semantics;
- encode ordinary UTF-8 Latin-script and TeX-sensitive retained user text safely at one deliberate source boundary;
- remove or correct obsolete document-production assumptions that conflict with current Product Definition without creating generic document/rendering frameworks.

Use only the minimal UI additions needed to expose finished capabilities. Do not perform PLAN[5] CV-editor or collection visual redesign.

## Verification

Protect ownership, snapshot, failure-cleanup, portability and encoding behavior with focused tests, then finish with `npm run verify`. Record one real `latexmk` + pdfLaTeX portability run covering a CV, standalone letter, candidature-owned letter and Application packet outside the workspace. Perform exact-head packaged verification for affected desktop paths.

Stop after one PR against `main` is open with exact evidence. Do not merge and do not declare PLAN[4] complete.
