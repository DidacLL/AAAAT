# ADR 0006 — Direct AI provider boundary

> Status: Accepted technical boundary, revised for the authority-aligned AI connection model. [ADR 0015](0015-owner-approved-recovery-boundaries.md) supersedes outbound durable identifiers and any coupling of external/provider wire contracts to internal identifier-bearing contracts. `PRODUCT_DEFINITION.md` determines product meaning; this ADR records the technical boundary only.

## Context

AAAAT supports optional provider-neutral AI without giving the sandboxed renderer arbitrary networking or credential authority. A single-candidature opportunity review uses privacy projection before inference; it is evidence and questions, not a rating, ranking, career workflow, or prescribed action.

## Decision

For the current demonstrated provider boundary:

- connection settings live in the user-owned workspace as `ai-connection.json`;
- `http:` is accepted only for a loopback endpoint and a remote endpoint must use `https:`; URL credentials, query strings and fragments are rejected by this slice;
- for each connection, the current slice stores the user-defined connection name, endpoint, and model; credential, authorization-header, API-key, OAuth, provider-account, and secret-storage configuration are outside this slice rather than prohibited product-wide;
- privileged main code exposes only fixed connection and bounded operation IPC intentions;
- one operation-oriented provider interface is implemented by one generic OpenAI-compatible HTTP adapter; there is no provider registry or plugin layer;
- review context is rebuilt from authoritative local data and privacy-projected immediately before inference; token mappings stay transient and local;
- provider output must satisfy the neutral review schema and remains transient unless a bounded operation explicitly returns a user-reviewable proposal applied through normal application services;
- a remote endpoint may be used only when its authentication has already been handled outside AAAAT.

## Consequences

The current path can work with a locally running compatible model server or an already-authenticated remote HTTPS endpoint without adding a credential or secret-storage subsystem to this slice. The renderer still receives no networking authority. This ADR does not prescribe API keys, OAuth, a provider marketplace, workflow engine, generic AI task model, or a provider-specific integration surface.
