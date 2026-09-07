# ADR 0022 — AI-visible CV descriptors are explicit bounded document metadata

**Status:** Accepted for Issue #196

## Context

OWNER_INTENT and SPEC require an external assistant to be able to inspect **AI-visible CV tags and notes** so the assistant can judge whether existing material appears suitable. This is deliberately narrower than later access to CV/document content, and AAAAT must not rank CV suitability itself.

The current v2 document model has no such descriptors. Profile-variant `targetTags` describe a variant's intended focus; reusing them as CV descriptions would conflate two meanings and could disclose information the user did not deliberately mark for this external purpose. Document titles, profile items, rendered/source paths and candidature associations are also not substitutes for explicit disclosure metadata.

AAAAT has no real-user v2 compatibility baseline. The existing document schema is development-era state rather than a user-data upgrade commitment.

## Decision

Add two explicit fields to persisted working documents:

- `ai_tags_json`, defaulting to an empty tag list;
- nullable `ai_notes`.

They are meaningful only for CV documents. A bounded `cv-descriptor-service` validates the document kind and owns descriptor reads and mutations. Tags are user-authored, trimmed, limited to 20 values of at most 80 characters each and unique ignoring case. Notes are user-authored and limited to 5,000 characters. Empty tags and null notes mean that CV has no AI-visible description.

Descriptor mutation is independent from structured document content and TeX production. It records normal document activity in the same transaction but does not modify profile data, variants, item rules, source ownership, rendering, artifacts or candidature associations. Cover letters cannot use the descriptor service.

The desktop renderer receives only fixed `current` and `update` CV-descriptor intentions through the existing trusted preload/IPC boundary. The normal Documents UI exposes the descriptors only for CVs and protects unsaved descriptor edits through the existing dirty-navigation mechanism.

The external MCP operation `cv_descriptions_read` is read-only and accepts no data arguments. It returns only CVs having at least one explicit descriptor. Each returned item contains:

- a synthetic response-local label such as `CV 1`;
- AI-visible tags;
- AI-visible notes when present.

The projection never includes a document title, durable local ID, profile/variant reference, source/PDF/project path, CV body/profile-item content, candidature history, Sources, artifacts or other workspace state. Synthetic labels are not persisted and are not accepted as document references by this operation or another operation. Access to further document content remains a separate named capability with its own disclosure contract.

Correct migration `003_documents.sql` directly to include the two descriptor columns. Do not add a compatibility migration or schema-version adapter solely for pre-use development databases.

## Consequences

- Users explicitly control the minimal CV descriptions available to an external assistant without sharing the CV itself.
- Variant focus metadata remains semantically distinct and private unless another operation deliberately permits it.
- AAAAT supplies descriptions; the assistant supplies suitability judgment. No ranking, scoring or recommendation engine is introduced.
- Later document-content access cannot treat `cv_descriptions_read` labels as durable identifiers; it must define its own bounded selection/reference semantics.
- Existing document rendering, retained artifacts and portable source ownership remain unchanged.

This decision does not establish generic document metadata, a tag platform, generic external browsing/search/query, durable external document identifiers, automatic descriptor generation, a CV-ranking service, migration compatibility machinery, or a provider/research framework.
