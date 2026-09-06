# Active Mission — Combined CV and cover-letter output

**Active:** [Issue #169](https://github.com/DidacLL/AAAAT/issues/169) on `feature/combined-document-packet`, based on integrated user-owned document source boundaries `65d85942d1e625d7df9d14985babe70dba9df592`.

## Outcome

Deliver the required bounded VCVGenerator combined-output capability without inventing a third working-document model. A user chooses one existing CV and one existing cover letter and exports one portable application packet whose combined PDF presents the cover letter first and CV second while preserving both effective source projects.

## Boundaries

Reuse ordinary document rendering so canonical/optional-variant/document-specific semantics and user-owned `main.tex`/`aaaat.sty` plus feeder-owned `data.tex` behavior remain authoritative. The combined packet is an export/production result, not a persistent document kind. Keep pdfLaTeX/pdfTeX and portable source ownership. Do not add an artifact-schema redesign, PDF library/system merge dependency, generic export/filesystem/version framework, typography/template redesign, multilingual/font redesign, AI work or local search.

This is Class C because it adds a bounded renderer→preload→main→TeX production contract. Product meaning is explicit in OWNER_INTENT/SPEC. A new ADR is unnecessary unless implementation introduces a durable architectural decision beyond SPEC/ADR 0015. Obtain one independent Reviewer verdict before integration; invoke Simplifier only if material new complexity appears.

## Evidence and continuation

Issue #167 / PR #168 is integrated at `65d85942d1e625d7df9d14985babe70dba9df592`; Verify #414 passed Fast verification, Linux packaged runtime smoke, real pdfLaTeX unrelated-directory portability and the aggregate Verification gate on the accepted candidate.

Next: finish Issue #169 end to end, run focused service/API/UI tests and impact-selected Verify including combined LaTeX portability, obtain independent review, correct any concrete blocker, and integrate when accepted.
