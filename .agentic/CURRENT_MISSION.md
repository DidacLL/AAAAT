# Active Mission — Bounded candidature comparison

**Active:** [Issue #191](https://github.com/DidacLL/AAAAT/issues/191) on `feature/candidature-comparison`, based on integrated graphical workspace recovery `4c1fb2bf18ffc9e08a9737453f3bf47d45381608`.

## Outcome

Let the user explicitly select 2–5 existing candidatures, preview the ordinary candidature information that AAAAT would disclose, and request one read-only AI comparison. The result surfaces strengths, concerns, questions and cross-cutting considerations without ranking, scoring, choosing a winner, or mutating local state.

## Boundaries

Reuse the established candidature field disclosure meanings and AI capability/default routing. Retained Sources, candidature history, ToDos, documents, artifacts, profile data and unrelated workspace state are outside the comparison context. Provider payloads use fresh operation-local references rather than durable local identifiers. Results are transient and read-only.

Do not add Sources opt-in, research/web access, vector/RAG infrastructure, a ranking or recommendation engine, generic multi-record browsing/query, external-host expansion, persistence, migration, dependencies or unrelated AI work.

This is Class C because it adds a new privileged/provider AI operation and a seventh member of the deliberately finite operation capability model. The established AI operation/privacy architecture is sufficient; no new ADR is required unless implementation introduces a durable decision beyond it. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if a generic comparison/ranking/retrieval abstraction appears.

## Evidence and continuation

Issue #187 / PR #190 is integrated at `4c1fb2bf18ffc9e08a9737453f3bf47d45381608`. Verify #438 passed typecheck, lint, 57 test files / 175 active tests, Windows/macOS/Linux packaged-runtime smoke and the aggregate Verification gate; LaTeX portability was correctly not selected.

Next: finish Issue #191, run focused comparison service/API/UI tests plus existing AI privacy/routing tests and impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
