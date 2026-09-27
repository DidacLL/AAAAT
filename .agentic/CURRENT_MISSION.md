# Current mission — PLAN[4] post-minimal design recovery

Current explicit Product Owner instruction remains highest authority.

Base main: `a181bf9a7b99afd99394ef986b098e74b174e9b8`.

PLAN[0]/[1]/[3] are retained. PLAN[2] is complete. The post-PLAN[2] setup audit found no sequence blocker. PLAN[4] remains active. PLAN[5] remains blocked until PLAN[4] settles.

## Execution model

The master orchestrator owns sequencing, scope, review, evidence interpretation, PR creation/merge and state propagation.

Normal substantial implementation is done by a GitHub-capable chat specialist working through GitHub only. Use repository CI as the normal engineering verification surface. The Product Owner is not routine QA or a prompt courier beyond starting a bounded specialist chat when required.

## Completed PLAN[4] evidence to reuse

Issue #344 / PR #346 implemented and merged the authorized minimal package/blueprint slice:

- real `aaaat.sty` package boundary with LaTeX2e public commands and expl3 internals;
- one generic CV blueprint with full-width header and bounded rail/main body;
- Working CV sections/items remain TypeScript-fed content in `data.tex`;
- straightforward Babel language selection with no visible `Language:` metadata row;
- cover-letter, immutable snapshot, portable export and Application packet behavior preserved;
- ordinary Verify run #1566 (`36319735148`) passed;
- PR #346 real-LaTeX portability run `36320796442` passed, compiling exported CV, letters and packet with pdfLaTeX/latexmk.

Do not rerun that evidence unless a later change materially alters the TeX/rendering boundary.

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

The minimal working blueprint is accepted as a first PLAN[4] slice, not PLAN[4] completion.

Remaining material debt is:

1. persistent ownership/reuse/selection of user-modified blueprint and package sources;
2. exact boundary between shipped defaults, user-owned copies, Working CV selection and rendered immutable snapshots;
3. detailed blueprint/customization behavior;
4. fuller language/font design beyond the minimal Babel mapping;
5. final coherent AAAAT integration around the settled document model before PLAN[5] can start.

The Product Owner explicitly cannot perform the originally intended detailed pair-design now. Do not silently convert unresolved product decisions into implementation choices merely to advance the sequence.

## Next

Run one read-only PLAN[4] recovery/design specialist against current `main` to determine the smallest next bounded action that is already fixed by repository authority, separating it from decisions that genuinely require Product Owner input. The specialist must not edit repository state, open issues/PRs, implement capability, or declare PLAN[4] complete.

The orchestrator will then choose either:

- a bounded implementation slice if the next acceptance boundary is already determined by authority; or
- a short Product Owner decision set if implementation would otherwise invent unresolved document-product semantics.
