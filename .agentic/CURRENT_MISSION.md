# Active Mission — Bounded external Career Context

**Active:** [Issue #194](https://github.com/DidacLL/AAAAT/issues/194) on `feature/external-career-context`, based on integrated selected candidature comparison `936018e131e48974833415d61ce9d71ef1b12a21`.

## Outcome

Expose one read-only named external-assistant operation that returns the existing user-written Career Context needed for career assistance, without exposing candidature history, profile/document content, durable local identifiers, workspace paths, or mutation authority.

## Boundaries

Reuse the existing official MCP stdio integration and authoritative Career Context service. The wire result contains only non-empty values from the seven existing Career Context meanings: career direction, objectives, constraints, target roles, target markets/locations, work preferences, and application-writing preferences. Empty values are omitted; no content is invented.

Do not add profile/document browsing, CV suitability descriptors, candidature/source/concept/ToDo/artifact access, arbitrary IDs, search/query surfaces, research/web access, external networking, persistence changes, migrations, dependencies, workflow machinery, or unrelated setup work.

This is Class C because it extends the external integration/privacy surface. The accepted named-operation MCP boundary is sufficient; no new ADR is required unless implementation introduces a new durable mechanism. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if a generic external-data abstraction appears.

## Evidence and continuation

Issue #191 / PR #193 is integrated at `936018e131e48974833415d61ce9d71ef1b12a21`. Verify #448 passed typecheck, lint, 60 passed test files / 181 active tests, Windows/macOS/Linux packaged-runtime smoke and the aggregate Verification gate; LaTeX portability was correctly not selected.

Next: finish Issue #194, run focused MCP/Career Context tests plus impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
