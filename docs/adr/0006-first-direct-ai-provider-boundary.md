# ADR 0006 — First direct AI provider boundary

## Context

M3 requires optional provider-neutral AI without giving the sandboxed renderer arbitrary networking or credential authority. The first concrete operation is a read-only candidature fit assessment with privacy projection before inference.

## Decision

For the first demonstrated provider boundary:

- connection settings live in the user-owned workspace as `ai-connection.json`;
- the first supported connection is keyless and local: only loopback HTTP/HTTPS endpoints are accepted;
- the user configures only a connection name, endpoint, and model;
- privileged main code exposes only fixed connection, fit-preview, and fit-assessment IPC intentions;
- one operation-oriented provider interface is implemented by one generic OpenAI-compatible HTTP adapter; there is no provider registry or plugin layer;
- fit context is rebuilt from authoritative local data and privacy-projected immediately before inference; token mappings stay transient and local;
- provider output must satisfy the fit operation schema and remains a read-only proposal in this slice;
- remote/provider-hosted authentication, including API-key support, is deferred to a separate provider-specific decision rather than assumed as the default user path.

## Consequences

The first M3 path is accessible without an account, cloud credential, or secret-storage subsystem and can work with a locally running compatible model server. The renderer still receives no networking authority. Later remote providers must justify their own authentication UX and security model; this ADR does not prescribe API keys, OAuth, a provider marketplace, workflow engine, generic AI task model, or M4 integration surface.
