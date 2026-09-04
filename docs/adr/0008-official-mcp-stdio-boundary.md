# ADR 0008 — Official MCP stdio boundary

## Context

M4 requires an official MCP integration after the first bounded external command is proven. The integration must reuse AAAAT application-service behavior without adding handwritten protocol framing, a network listener, broad agent privileges, or a general data API.

## Decision

AAAAT uses the official MCP TypeScript v2 packages, pinned exactly. The packaged AAAAT executable exposes MCP only through a local stdio mode:

```text
AAAAT --mcp --workspace <existing-workspace>
```

The server is built with `@modelcontextprotocol/server` and the v2 `serveStdio` transport. The initial MCP surface exposes the two named tasks needed for bounded external candidature input:

- `candidature_fields_list` returns only enabled field definitions—stable field IDs, labels, value shapes, and allowed choices—so an external host can form valid creation input. It does not return candidatures, retained values, Sources, documents, user search results, or arbitrary entities.
- `candidature_create` validates the existing `candidatureInputSchema` and calls `createCandidature`. Its result is a narrow acknowledgement with no internal IDs, paths, source material, notes, or other private record content.

These are deliberately provided product tasks, not generic CRUD, entity browsing/listing/search/query, arbitrary entity-ID, or data-scraping access.

The MCP startup path validates an existing workspace before serving and does not load the desktop main module, create a BrowserWindow, or register renderer IPC. Official `@modelcontextprotocol/client` is a development-only dependency used to prove the protocol contract and packaged stdio behavior.

## Consequences

- MCP and the existing bounded command share application-service semantics without sharing a generic dispatch framework or external data API.
- The official SDK owns protocol framing and schema rejection.
- Native package tests must prove the executable's stdio behavior on Windows, macOS, and Linux.
- Additional MCP tasks remain separate demonstrated cases rather than an implied generic data-access surface.

## Alternatives rejected

- Handwritten MCP or JSON-RPC framing: prohibited by the specification and unnecessary.
- Streamable HTTP, SSE, localhost listeners, or a daemon: no concrete network consumer or authentication design exists.
- A generic capability registry or command bus: premature for this small MCP surface.
- Direct SQLite access: bypasses application-service validation, activity semantics, and the deliberately small task surface.
- MCP resources, prompts, sampling, elicitation, or model-provider calls: not required for the demonstrated external-control case.
