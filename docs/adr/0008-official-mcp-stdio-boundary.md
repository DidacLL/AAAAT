# ADR 0008 — Official MCP stdio boundary

Status: accepted transport boundary, updated for current bounded application/document/setup operations. Product Definition and current owner instructions govern capability meaning.

## Decision

The packaged executable exposes a local standard-input/output mode:

```text
AAAAT --mcp --workspace <existing-workspace>
```

The official `@modelcontextprotocol/server` SDK owns protocol framing. Startup validates the workspace and serves bounded tools without loading the desktop window/renderer. There is no network listener, daemon or homemade JSON-RPC implementation.

Current registrations in `src/main/mcp-server.ts` cover Source-backed application creation, prepared application requests and proposal returns, selected document operations, and optional setup intentions. They call normal application services. Temporary session/request references are scoped to those intentions and do not grant arbitrary durable-ID mutation authority.

The renderer remains unprivileged. The external host gets no generic entity catalogue, corpus query, raw SQLite, filesystem, shell or process capability from AAAAT. Its own computer access is a separate trust choice.

Application/document/context permissions are checked by the same local services that govern desktop work. Opening a request locally does not permit connected reads. Configurator/installer mutation requires its separately enabled bounded local authority.

## Consequences

MCP is one carrier, not product identity or an agent platform. The official client library is development tooling. A successful SDK connection, AAAAT-authored client or mocked provider proves only that mechanism; a useful third-party-host journey needs evidence through the actual host. Current product shaping does not manufacture tests or new gates to certify this boundary.
