# ADR 0006 — First direct AI provider boundary

## Context

M3 requires optional provider-neutral AI without giving the sandboxed renderer arbitrary networking or credential authority. The first concrete operation is a read-only candidature fit assessment with privacy projection before inference.

## Decision

For the first demonstrated provider boundary:

- non-secret connection settings live in the user-owned workspace as `ai-connection.json`;
- an optional API credential is stored in that file only as Electron `safeStorage` ciphertext when secure OS storage is available; AAAAT does not persist a plaintext fallback;
- changing the configured endpoint does not carry an existing credential to the new endpoint unless the user supplies a replacement;
- privileged main code exposes only fixed connection, fit-preview, and fit-assessment IPC intentions;
- one operation-oriented provider interface is implemented by one generic OpenAI-compatible HTTP adapter; there is no provider registry or plugin layer;
- fit context is rebuilt from authoritative local data and privacy-projected immediately before inference; token mappings stay transient and local;
- local connections are restricted to loopback endpoints, while remote or unknown connections require HTTPS and an explicit projected-context acknowledgement in the UI;
- provider output must satisfy the fit operation schema and remains a read-only proposal in this slice.

## Consequences

The workspace owns understandable provider configuration while credentials remain OS-protected and non-portable by design. A workspace moved to a system that cannot decrypt an existing credential must be reconfigured rather than silently falling back to plaintext. Later M3 operations may reuse the demonstrated boundary where it fits, but this ADR does not create a provider marketplace, workflow engine, generic AI task model, or M4 integration surface.
