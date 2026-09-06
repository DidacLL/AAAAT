# Active Mission — Optional document profile variants

**Active:** [Issue #165](https://github.com/DidacLL/AAAAT/issues/165) on `feature/optional-document-variant`, based on integrated retained application artifacts `5190d58230126164a4d4710f3fe0de7dfeb9ea21`.

## Outcome

Correct the confirmed VCVGenerator semantic drift that currently requires every working document to depend on a profile variant. A CV or cover letter must be creatable directly from canonical professional information, while a selected named variant remains an optional difference layer before document-specific differences.

## Boundaries

Represent the optional relation directly; do not invent a hidden/default variant. Keep canonical profile, named variants, document-specific rules, managed/manual LaTeX ownership, candidature associations, retained artifacts and AI document assistance in their existing domain seams. No combined-output implementation, profile redesign, generic document-base framework, template marketplace, local-search work, AI-connection expansion or new dependency.

AAAAT still has no real-user v2 compatibility baseline. Correct the development document schema directly rather than adding compatibility migration machinery.

This is Class C because the correction changes a shared document contract and development database representation. Record the nullable document→variant decision in one short ADR. Obtain one independent Reviewer verdict before integration; invoke Simplifier only if material new complexity appears.

## Evidence and continuation

Issue #163 / PR #164 is integrated at `5190d58230126164a4d4710f3fe0de7dfeb9ea21`; Verify #411 passed on its complete candidate and remains reusable for unaffected artifact/runtime behavior.

Next: finish Issue #165 end to end, run impact-selected Verify on the complete candidate, obtain independent review, correct any concrete blocker, and integrate when accepted.
