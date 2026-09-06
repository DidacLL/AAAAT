# ADR 0007 — First bounded external command mode

> Recovery clarification: [ADR 0015](0015-owner-approved-recovery-boundaries.md) supersedes outbound durable identifiers, any coupling of external/provider wire contracts to internal identifier-bearing contracts, and the earlier structured candidature-create input described below. The retained decision is a bounded one-shot source-only create operation.

## Context

M4 begins external control only through demonstrated bounded capabilities. The first real case is creating a new candidature from an external tool. AAAAT must reuse normal application-service behavior without adding a localhost service, daemon, generic command framework, generic CRUD/query surface, or direct database access.

## Decision

The first external-control transport reuses the packaged AAAAT executable in a one-shot command mode:

```text
AAAAT --external-command candidature.create --workspace <existing-workspace>
```

The command reads one size-bounded JSON object from stdin, validates a dedicated source-only external contract containing exactly one retained Source, and calls `createCandidature` with that Source and no structured candidature values. The workspace must already be an initialized compatible AAAAT workspace. Success returns only a narrow acknowledgement and no entity IDs, paths, source material, or other private record content. Invalid invocation, unsupported capability, invalid input, and execution failure return bounded machine-readable failure codes and a nonzero exit status.

A small startup entrypoint selects either command mode or the existing desktop main module. Command mode does not load the desktop main module, create a BrowserWindow, or register renderer IPC.

Only `candidature.create` exists in this slice. Additional capabilities are added as separate demonstrated cases rather than through a generic registry. Structured external contributions remain a later named-operation capability rather than part of candidature creation.

## Consequences

- External tools get one useful task without database, filesystem, shell, process, network, repository, generic CRUD/query access, structured candidature-value mutation, or arbitrary ID-based access.
- The existing candidature service remains the sole mutation path and preserves transaction/activity semantics.
- No listener, background service, second application runtime, provider dependency, or renderer authority is introduced.
- The packaged executable becomes a small durable machine-facing contract, so package evidence must prove command invocation and output behavior when changes affect that contract; still-applicable successful evidence is reusable across unrelated later commits.

## Alternatives rejected

- Localhost HTTP/API service: no concrete consumer or authentication design exists, and M4 explicitly forbids speculative network services.
- Background daemon or second runtime: unnecessary for one request/response operation.
- Generic command registry or plugin system: premature abstraction for the first case.
- Direct SQLite or filesystem manipulation: bypasses application-service validation and the deliberately small task surface.
- Returning created entity IDs or paths: unnecessarily widens external mutation and discovery access.
- Structured field/value candidature creation in this operation: it widens the external mutation surface before a separate bounded contribution operation is justified.
