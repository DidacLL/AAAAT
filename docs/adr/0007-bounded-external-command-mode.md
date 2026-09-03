# ADR 0007 — First bounded external command mode

## Context

M4 begins external control only through demonstrated bounded capabilities. The first real case is creating a new candidature from an external tool. AAAAT must reuse normal application-service mutation authority without adding a localhost service, daemon, generic command framework, or direct database access.

## Decision

The first external-control transport reuses the packaged AAAAT executable in a one-shot command mode:

```text
AAAAT --external-command candidature.create --workspace <existing-workspace>
```

The command reads one size-bounded JSON object from stdin, validates it with the existing `candidatureInputSchema`, and calls `createCandidature`. The workspace must already be an initialized compatible AAAAT workspace. Success returns only a narrow acknowledgement and no entity IDs, paths, source material, or other private record content. Invalid invocation, unsupported capability, invalid input, and execution failure return bounded machine-readable failure codes and a nonzero exit status.

A small startup entrypoint selects either command mode or the existing desktop main module. Command mode does not load the desktop main module, create a BrowserWindow, or register renderer IPC.

Only `candidature.create` exists in this slice. Additional capabilities are added as separate demonstrated cases rather than through a generic registry.

## Consequences

- External tools get one useful mutation without database, filesystem, shell, process, network, repository, or arbitrary ID-based authority.
- The existing candidature service remains the sole mutation path and preserves transaction/activity semantics.
- No listener, background service, second application runtime, provider dependency, or renderer authority is introduced.
- The packaged executable becomes a small durable machine-facing contract, so native package smoke must prove command invocation and output behavior.

## Alternatives rejected

- Localhost HTTP/API service: no concrete consumer or authentication design exists, and M4 explicitly forbids speculative network services.
- Background daemon or second runtime: unnecessary for one request/response operation.
- Generic command registry or plugin system: premature abstraction for the first case.
- Direct SQLite or filesystem manipulation: bypasses application-service validation and authority.
- Returning created entity IDs or paths: unnecessarily widens external mutation and discovery authority.
