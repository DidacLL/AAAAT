# Current mission — PLAN[4] post-minimal design recovery

Current explicit Product Owner instruction remains highest authority.

Base main: `d60f07e280147767d62a0f45f823d29f2e69659b`.

PLAN[0]/[1]/[3] are retained. PLAN[2] is complete. The post-PLAN[2] setup audit found no sequence blocker. PLAN[4] remains active. PLAN[5] remains blocked until PLAN[4] settles.

## Execution model

The master orchestrator owns sequencing, scope, repository reading, design recovery, branch/diff review, independent evidence interpretation, PR creation/merge and durable state propagation.

Normal substantial implementation is done by a GitHub-capable chat specialist working through GitHub only. The Product Owner should only need to start a specialist chat for a coherent bounded implementation slice or answer genuinely unresolved product decisions. Do not dispatch read-only/review/planning specialists merely to transport analysis the orchestrator can perform directly.

## Completed PLAN[4] evidence to reuse

Issue #344 established the authorized minimal package/blueprint slice. PR #346 implemented the first version, but its initial portability acceptance was later found insufficient: an independent long-CV audit exposed severe fixed-height `minipage` overflow despite successful compilation. Issue #344 was reopened.

PR #348 corrected that acceptance defect and is the accepted #344 state:

- real `aaaat.sty` package boundary with LaTeX2e public commands and expl3 internals;
- one generic CV blueprint with full-width header and rail/main body;
- TypeScript still owns generated content in `data.tex`;
- first-page header height is budgeted into the available body height and later pages receive full-page rail/main budgets;
- rail/main content is split across physical pages without intentional truncation;
- straightforward Babel language selection remains, with no visible `Language:` metadata row;
- cover-letter, immutable snapshot, portable export and Application packet behavior remain preserved;
- branch Verify #1572 (`36323791503`) passed on exact correction head `0d4bc9a8ee265495d50ae48c98f96415fb7620bd`;
- orchestrator independently compiled a separate 7-section / 37-entry adversarial CV with real `latexmk`/`pdflatex`: 5 pages, 37/37 entry markers, 7/7 section headings, no `Overfull \\vbox`, and real body content on page 1; visual page-1 inspection confirmed header + rail/main content;
- PR #348 strengthened real-LaTeX portability run `36324026414` passed on that exact head, including multipage/content-survival/overflow assertions.

Reuse this evidence unless a later change materially alters the TeX/rendering boundary.

## Fixed PLAN[4] authority

- no in-app LaTeX editor;
- a Blueprint is block/layout structure, not a font/theme/style preset;
- LaTeX2e public package API with expl3 internals;
- pdfTeX/pdfLaTeX remains the renderer;
- TypeScript owns generated document data;
- generated/exported document projects are user-owned and editable;
- persistent user-modified blueprint/package-source reuse and selection remains a required unresolved part of the recovered document-package design;
- detailed blueprint/customization, richer language behavior and font decisions remain owner-paired design debt;
- do not conflate a Blueprint with the existing reusable CV Template, which is content composition;
- do not invent a generic document/layout engine, marketplace, drag/drop designer, DSL, image/header asset system or PLAN[5] CV-editor redesign.

## Current recovery boundary

The corrected minimal working blueprint is accepted as a first PLAN[4] slice, not PLAN[4] completion.

Remaining material debt is:

1. persistent ownership/reuse/selection of user-modified blueprint and package sources;
2. exact boundary between shipped defaults, user-owned copies, Working CV selection and rendered immutable snapshots;
3. detailed blueprint/customization behavior;
4. fuller language/font design beyond the minimal Babel mapping;
5. final coherent AAAAT integration around the settled document model before PLAN[5] can start.

The Product Owner explicitly cannot perform the originally intended detailed pair-design now. Do not silently convert unresolved product decisions into implementation choices merely to advance the sequence.

## Next

The master orchestrator directly performs the PLAN[4] ownership/persistence recovery against current `main`, using repository authority and the current implementation. It must determine what semantics are already fixed versus what genuinely requires Product Owner input.

Only after that analysis should the orchestrator choose either:

- one coherent bounded implementation slice for a GitHub-capable specialist, with the full acceptance boundary in a single prompt; or
- a short Product Owner decision set if implementation would otherwise invent unresolved document-product semantics.
