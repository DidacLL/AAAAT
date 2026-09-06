# ADR 0008 — Official MCP stdio boundary

> Recovery clarification: [ADR 0015](0015-owner-approved-recovery-boundaries.md) supersedes outbound durable identifiers, any coupling of external/provider wire contracts to internal identifier-bearing contracts, and the earlier field-catalogue/structured-create MCP surface described below. The retained MCP capability is source-only candidature creation.

## Context

M4 requires an official MCP integration after the first bounded external command is proven. The integration must reuse AAAAT application-service behavior without adding handwritten protocol framing, a network listener, broad agent privileges, or a general data API.

## Decision

AAAAT uses the official MCP TypeScript v2 packages, pinned exactly. The packaged AAAAT executable exposes MCP only through a local stdio mode:

```text
AAAAT --mcp --workspace <existing-workspace>
```

The server is built with `@modelcontextprotocol/server` and the v2 `serveStdio` transport. The current MCP surface exposes one named task:

- `candidature_create` accepts exactly one retained Source, validates the same dedicated source-only external create contract used by the one-shot command, and calls `createCandidature` with no structured candidature values. Its result is a narrow acknowledgement with no internal IDs, paths, source material, notes, or other private record content.

There is no MCP candidature-field catalogue and no operation-reference machinery for candidature creation. Structured external contributions, if later required, must arrive as separate named operations with only the minimum temporary references needed for their own validated round trip; they are not implicit in `candidature_create`.

This is a deliberately provided product task, not generic CRUD, entity browsing/listing/search/query, arbitrary entity-ID, or data-scraping access.

The MCP startup path validates an existing workspace before serving and does not load the desktop main module, create a BrowserWindow, or register renderer IPC. Official `@modelcontextprotocol/client` is a development-only dependency used to prove the protocol contract and packaged stdio behavior.

## Consequences

- MCP and the existing bounded command share source-only application-service semantics without sharing a generic dispatch framework or external data API.
- The official SDK owns protocol framing and schema rejection.
- Package/runtime evidence is selected by impact. Existing successful cross-platform launch evidence remains valid across later platform-neutral contract changes unless those changes affect packaging, startup, transport, or another platform-specific premise; the affected MCP contract itself still requires focused automated verification.
- Additional MCP tasks remain separate demonstrated cases rather than an implied generic data-access surface.

## Alternatives rejected

- Handwritten MCP or JSON-RPC framing: prohibited by the specification and unnecessary.
- Streamable HTTP, SSE, localhost listeners, or a daemon: no concrete network consumer or authentication design exists.
- A generic capability registry or command bus: premature for this small MCP surface.
- Direct SQLite access: bypasses application-service validation, activity semantics, and the deliberately small task surface.
- MCP resources, prompts, sampling, elicitation, or model-provider calls: not required for the demonstrated external-control case.
- Field-list plus structured candidature creation: unnecessary for source capture and wider than the current recovery contract; future structured contributions require their own bounded operation.
