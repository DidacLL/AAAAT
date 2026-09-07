# ADR 0023 — External CV content uses one deliberate local selection

**Status:** Accepted for Issue #198

## Context

OWNER_INTENT and SPEC require an external assistant to be able to obtain further permitted document content when AI-visible CV descriptions are insufficient. That broader sharing must be an understandable deliberate user choice and must not become generic profile/document browsing, candidature-corpus access, or a durable local-ID interface.

ADR 0022 deliberately made `cv_descriptions_read` labels response-local and unusable as document references. Reusing `CV 1`, a document title, a local UUID, a path, tags, or search text as input to a later content operation would either create cross-operation reference authority or a document query surface.

AAAAT has no real-user v2 compatibility baseline. The document schema remains development-era state rather than a compatibility commitment.

## Decision

Persist one CV-only disclosure flag, `documents.ai_content_visible`, defaulting to false. A database check prevents a cover letter from setting the flag, and a partial unique index permits at most one selected document. Correct development-era migration `003_documents.sql` directly; do not add a compatibility migration or generic permission/settings framework.

A bounded `cv-content-access-service` owns local selection. The Documents UI exposes the control only for CVs and explains that this permission shares effective CV content rather than only descriptor tags/notes. Enabling requires explicit confirmation. Enabling one CV atomically revokes any prior selected CV. Revocation and replacement record document activity for every document whose permission changes. Structured document edits, descriptors, profile/variant data, item rules, rendering, TeX/source ownership, retained artifacts and candidature associations remain independent.

The external MCP operation `cv_content_read` accepts a strict zero-field input. The caller cannot supply a title, UUID, path, descriptor label, tag, query, or other selector. If no CV is selected locally, the result is `null`.

When a CV is selected, AAAAT resolves it through the existing authoritative document service so document-specific exclusion, content overrides and ordering are honored. The wire projection contains at most 200 effective profile items. Each item contains only its established content fields: kind, title, optional subtitle, description, start/end date and URL. Local profile-item IDs and sort order are removed. The projection also excludes the document title, document ID, descriptor tags/notes, profile/variant references, project/source/PDF paths, raw TeX/PDF, candidature/Sources, concepts, ToDos, artifacts, activity/configuration/database metadata and every other document.

The external wire schema is separate from the local `ProfileItem` schema. Oversized or malformed effective content fails closed; AAAAT does not truncate, invent or silently normalize the shared CV.

VS Code setup discloses the new `cv_content.read` / `cv_content_read` capability as part of the exact live MCP surface and retains the existing pre-activation cardinality/name check. Host configuration still contains executable/workspace paths so shell-capable host authority remains an explicit trust decision outside the bounded tool payload.

## Consequences

- An assistant can move from minimal CV descriptions to one deliberately permitted CV's actual effective content without gaining document browsing authority.
- Selection authority stays local and understandable; external calls remain identifier-free and zero-input.
- Document-specific CV specialization is what the assistant reads, rather than canonical/profile-variant state that the working CV excluded or overrode.
- Deleting the selected working CV naturally leaves no selected content.
- Additional document-content types or contribution/production operations remain separate future named capabilities.

This decision does not establish generic document permissions, persistent external document references, document search/query/browse, arbitrary file/PDF/TeX access, cover-letter content disclosure, candidature-history access, ranking/scoring, automatic sharing, compatibility machinery, dependencies, provider/research expansion, or workflow infrastructure.
