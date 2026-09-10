# ADR 0017 — Plural local AI connections with an explicit default

**Status:** Accepted for Issue #175. The plural-connection/default-selection decision remains accepted. Endpoint/authentication scope is now governed by the revised ADR 0006: loopback HTTP or already-authenticated remote HTTPS. Credential and authentication configuration remain outside the current slice, not prohibited product-wide.

## Context

AAAAT's first AI slice deliberately supported one loopback OpenAI-compatible connection. Product authority then required several named AI connections while preserving no-AI operation, bounded provider access and maintainability by one developer. Current AI operations still need one concrete connection per invocation; this slice does not introduce capability discovery or routing.

There is no real-user v2 compatibility baseline. The version-1 single-connection `ai-connection.json` is development-era configuration, not an upgrade commitment.

## Decision

`ai-connection.json` remains the machine-local AI configuration file and moved directly to format version 2 for this historical slice. It stored a bounded set of named connections, each with a stable UUID plus the user-defined connection name, endpoint and model, and one nullable `defaultConnectionId`.

Names are unique case-insensitively. Current endpoint acceptance is governed by ADR 0006. The current user-defined connection record contains name, endpoint and model; this slice contains no credential, API-key, OAuth, provider-account or secret-storage configuration.

The first saved connection becomes the default because no selection ambiguity exists. Adding or editing later connections does not change the default. The user may explicitly choose another default. Removing the default clears `defaultConnectionId`; AAAAT does not select or fall back to another connection automatically.

Operations resolve only an explicitly applicable connection. With configured connections but no usable default, AI assistance fails clearly until the user selects one. Manual AAAAT remains unaffected.

The development-era version-1 format is not migrated or projected; it was corrected directly under the pre-baseline rule.

## Consequences

AAAAT can retain several understandable named connections without introducing a provider registry, plugin system, generic routing engine or second persistence model. Stable IDs make editing/default selection unambiguous while names remain user-facing.

Authentication/credential flows, provider-specific onboarding and provider marketplaces are outside this slice. That scope choice does not establish a product-wide prohibition against a later explicitly authorized design.
