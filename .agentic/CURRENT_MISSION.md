# Active Mission — Local candidature corpus search

**Active:** [Issue #172](https://github.com/DidacLL/AAAAT/issues/172) on `feature/local-candidature-search`, based on integrated combined VCVGenerator output `6d5d261ea6eef76cedeae3bbbdfafacf29b93856`.

## Outcome

Move ordinary free-text candidature retrieval from renderer-only corpus reconstruction to one bounded local main-process operation over authoritative candidature, retained Source, normal field-value and associated concept data. Preserve the existing human search surface and deterministic case-insensitive substring semantics while keeping archive and structured field filters composable.

## Boundaries

Use the existing Electron/preload/application-service/SQLite architecture and existing candidature/field/concept services. Do not add FTS, vector storage, embeddings, a background indexer, search daemon, generic repository/search framework, ranking/recommendation, AI analysis, network access, persistence migrations or new dependencies. Structured field filtering remains a separate domain operation. Do not redesign candidature information, Focus, Sources, documents, retained artifacts or external integration authority.

This is Class B: a bounded local read operation inside established architecture with no new durable architectural boundary. No ADR is expected. Apply the review policy for the final diff; invoke Skeptical Simplifier only if material new abstraction appears.

## Evidence and continuation

Issue #169 / PR #171 is integrated at `6d5d261ea6eef76cedeae3bbbdfafacf29b93856`; Verify #416 passed Fast verification with 43 test files / 140 active tests, real single-document and combined pdfLaTeX unrelated-directory portability, Windows/macOS/Linux packaged release/runtime smoke and the aggregate Verification gate.

Next: finish Issue #172, run focused search service/API/renderer tests and impact-selected Verify, correct concrete findings, review according to policy, and integrate when accepted.
