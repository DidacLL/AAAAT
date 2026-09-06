# ADR 0017 — Plural local AI connections with an explicit default

**Status:** Accepted for Issue #175

## Context

AAAAT's first AI slice deliberately supported one keyless loopback OpenAI-compatible connection. Product authority now requires several named AI connections while preserving no-AI operation, bounded provider access and maintainability by one developer. Current AI operations still need one concrete connection per invocation; this slice does not introduce capability discovery or routing.

There is no real-user v2 compatibility baseline. The version-1 single-connection `ai-connection.json` is development-era configuration, not an upgrade commitment.

## Decision

`ai-connection.json` remains the machine-local AI configuration file and moves directly to format version 2. It stores a bounded set of named local connections, each with a stable UUID plus name, endpoint and model, and one nullable `defaultConnectionId`.

Names are unique case-insensitively. The existing keyless loopback HTTP/HTTPS endpoint restrictions remain authoritative for every connection in this slice. No credentials or secrets are stored.

The first saved connection becomes the default because no selection ambiguity exists. Adding or editing later connections does not change the default. The user may explicitly choose another default. Removing the default clears `defaultConnectionId`; AAAAT does not select or fall back to another connection automatically.

Existing fit, extraction, historical discovery, variant recommendation, CV tailoring and cover-letter operations resolve only the explicit default connection. With configured connections but no default, AI assistance fails clearly until the user selects one. Manual AAAAT remains unaffected.

The file remains excluded from portable workspace backup as machine-local AI configuration. The development-era version-1 format is not migrated or projected; it is corrected directly under the pre-baseline rule.

## Consequences

AAAAT can retain several understandable named local connections without introducing a provider registry, plugin system, generic routing engine or second persistence model. Stable IDs make editing/default selection unambiguous while names remain user-facing.

Remote authentication, credentials, capability discovery, per-operation defaults, provider-specific onboarding and automatic fallback remain separate future decisions. A later capability-aware slice may extend connection metadata and operation defaults without changing the rule that fallback must be explicit rather than hidden.
