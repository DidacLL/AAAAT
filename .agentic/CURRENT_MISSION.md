# M4 — Agentic Interoperability and Setup

**Status: active.** M0 through M3 are accepted and complete. The owner has activated M4. Only bounded M4 capabilities are decomposed and implemented; M5 remains inactive.

## Outcome

AAAAT can expose demonstrated, bounded capabilities to external AI tools and help users configure supported environments without surrendering local ownership, manual independence, renderer isolation, or application-service mutation authority. Setup knowledge, configuration portability, backup, and restore are introduced incrementally only as real product paths require them.

## Required

- begin with the smallest demonstrated external capability and add later integration surfaces only against real consumers or hosts
- external integrations expose bounded AAAAT application capabilities only and call the same application services as the desktop UI
- never expose general database, filesystem, shell, process, network, repository, generic privileged invocation, or arbitrary entity-mutation authority
- keep direct inference and external control separate; AI remains optional and provider-neutral
- use the official TypeScript SDK when MCP is introduced; never hand-roll MCP protocol framing
- do not create a localhost HTTP service without a concrete consumer and explicit authentication/security design
- generated host integration material begins disabled/proposed and is validated before activation, including manifest, capability names, transport, permissions, connection, test operation, and privacy disclosure
- introduce host integrations only against demonstrated real hosts; detect and accept working existing environments before proposing replacement
- keep installer/setup knowledge incremental and structured; recipes reference known AAAAT actions rather than unrestricted generated shell programs
- preserve configuration portability without turning configuration into a plugin framework or provider registry
- backup includes a consistent SQLite backup plus relevant user-owned files and a manifest; secrets are excluded by default
- restore validates the manifest, schema, integrity, and paths before activation
- preserve security/privacy, local ownership, manual independence, portable user-owned documents, and narrow renderer/preload authority as hard gates
- add focused behavioral and security evidence for each implemented external contract or setup/recovery path

## Explicit non-goals

- generic agent frameworks, workflow engines, task databases, command buses, plugin runtimes, plugin marketplaces, provider registries, or cloud gateways
- general REST or GraphQL APIs, background daemons, broad localhost services, or speculative local microservices
- general database, filesystem, shell, process, network, repository, or privileged authority for integrations
- hand-written MCP or JSON-RPC framing
- speculative adapters or compatibility files for hosts that have not been demonstrated
- unrestricted generated shell programs or executable installer recipes
- mandatory AI, mandatory cloud services, or replacing a working user environment without need
- cloud synchronization
- M5 release-hardening work

## Completion

M4 is complete when the bounded external-command path, official MCP integration, demonstrated adaptive host integration, incremental installer/setup knowledge, configuration portability, and safe backup/restore behavior required by the SPEC are implemented with focused executable evidence and accepted independent review, while AAAAT remains local-first, manual-first, provider-neutral, and materially simpler than a general agent or plugin platform.
