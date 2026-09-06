# Active Mission — User-owned LaTeX source boundaries

**Active:** [Issue #167](https://github.com/DidacLL/AAAAT/issues/167) on `feature/document-source-ownership`, based on integrated optional document variants `964710ddc056f8f3f7c6ec10c0d6d9c96eaa90a2`.

## Outcome

Complete the accepted VCVGenerator production ownership boundary: the TypeScript feeder owns generated `data.tex`, while the initialized `main.tex` blueprint and `aaaat.sty` package source are user-owned and are not silently replaced by structured document regeneration.

## Boundaries

Reuse the existing document service, managed/manual mode, portable project layout, pdfLaTeX runner, export and retained-artifact capture. Direct blueprint/package edits remain user-owned; direct edits to feeder-owned `data.tex` retain the existing explicit recovery/regeneration behavior. Do not add a generic source/version abstraction, template framework, detailed blueprint redesign, combined CV+letter output, multilingual/font redesign, local search, AI-connection expansion or new dependency.

This is Class C execution of the already accepted ADR 0015 source-ownership decision. A new ADR is unnecessary unless implementation introduces a new durable architectural decision beyond ADR 0015. Obtain one independent Reviewer verdict before integration; invoke Simplifier only if material new complexity appears.

## Evidence and continuation

Issue #165 / PR #166 is integrated at `964710ddc056f8f3f7c6ec10c0d6d9c96eaa90a2`; Verify #412 passed Fast verification, Linux packaged runtime smoke and LaTeX unrelated-directory portability on the complete candidate.

Next: finish Issue #167 end to end, run impact-selected Verify including LaTeX portability, obtain independent review, correct any concrete blocker, and integrate when accepted.
