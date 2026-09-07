# Active Mission — Deliberately shared CV content

**Active:** [Issue #198](https://github.com/DidacLL/AAAAT/issues/198) on `feature/external-cv-content`, based on integrated AI-visible CV descriptions `ee7921b17bb5c3135232a80542bc3e63c7929b16`.

## Outcome

Let a user deliberately select at most one existing CV whose effective resolved content may be read by a configured external assistant when the minimal AI-visible tags/notes are insufficient, without creating document browsing, durable external references, or candidature-history access.

## Boundaries

Selection authority is local and CV-only. One persisted flag plus a database invariant permits at most one selected CV. Enabling another CV atomically revokes the previous selection; cover letters cannot be selected. The permission is independent from descriptors, structured document content, profile/variant data, item rules, TeX/source ownership, rendering, artifacts and candidature links.

The external `cv_content_read` operation accepts no data arguments. With no local selection it returns null. With one selection it resolves the working CV through the existing document service and returns only the effective included/overridden/ordered profile-item content under a dedicated external schema, with local IDs and sort order removed. It does not expose document titles/IDs, descriptors, paths, raw TeX/PDF, candidatures/Sources, other documents, or generic browse/search/query authority.

Do not add cover-letter content disclosure, persistent external references, document selection/search input, generic permission/metadata infrastructure, candidature history, ranking/scoring, automatic sharing, provider/research work, compatibility migration machinery, dependencies, workflow machinery, or unrelated scope.

This is Class C because it extends durable local disclosure state and the external privacy surface. ADR 0023 records the single-local-selection/content-projection decision. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if a generic permission/document-browser abstraction, compatibility layer, dependency or material framework appears.

## Evidence and continuation

Issue #196 / PR #197 is integrated at `ee7921b17bb5c3135232a80542bc3e63c7929b16`. Verify #450 passed typecheck, lint, 65 passed test files / 192 active tests, Windows/macOS/Linux packaged release/runtime lanes, Windows demonstrated VS Code host-contract installation and the aggregate Verification gate; LaTeX portability was correctly skipped.

Next: finish Issue #198, run focused content-access service/API/UI/MCP/setup tests plus impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
