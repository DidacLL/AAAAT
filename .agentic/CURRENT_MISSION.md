# Active Mission — External AI-visible CV descriptions

**Active:** [Issue #196](https://github.com/DidacLL/AAAAT/issues/196) on `feature/external-cv-descriptors`, based on integrated bounded external Career Context `ab77fa3cb5b293bf0f6c6173120a6182c50fce74`.

## Outcome

Let users explicitly describe existing CVs with AI-visible tags and notes, then expose only those descriptions through one read-only named external-assistant operation so the chosen assistant can judge whether existing material appears suitable without receiving CV content, titles, durable local identifiers, paths, or candidature history.

## Boundaries

AI-visible tags/notes are explicit CV-only metadata, distinct from profile-variant target tags and from document content. They default to empty and are edited through a bounded CV descriptor service in the Documents UI. Descriptor edits do not change profile data, variants, item rules, TeX source ownership, rendering, retained artifacts, candidature links, or normal structured document content.

The external `cv_descriptions_read` operation accepts no data arguments and returns only described CVs under response-local synthetic labels plus their user-authored tags and optional notes. It does not expose document titles, durable IDs, profile/variant references, CV content, filesystem paths, candidatures/Sources, artifacts or generic browse/search/query authority. AAAAT does not rank CV suitability.

Do not add document-content retrieval, persistent external references, automatic descriptor generation, ranking/scoring, generic document metadata, tag/search infrastructure, provider/research work, compatibility migration machinery, dependencies, workflow machinery, or unrelated setup changes.

This is Class C because it adds durable disclosure metadata and extends the external integration/privacy surface. ADR 0022 records the bounded descriptor/disclosure decision. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if a generic metadata/external-data abstraction or compatibility layer appears.

## Evidence and continuation

Issue #194 / PR #195 is integrated at `ab77fa3cb5b293bf0f6c6173120a6182c50fce74`. Verify #449 passed typecheck, lint, 61 passed test files / 183 active tests, Linux packaged-runtime smoke and the aggregate Verification gate; LaTeX portability and the broader platform matrix were correctly not selected.

Next: finish Issue #196, run focused descriptor service/API/UI/MCP/setup tests plus impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
