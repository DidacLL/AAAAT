# ADR 0006 — Direct AI provider boundary

Status: accepted technical boundary, updated for the current v2 preview. Product meaning comes from Product Definition and current owner instruction.

## Decision

Optional AI operations run in privileged main-process services through one generic OpenAI-compatible adapter. The sandboxed renderer receives typed domain intentions, not networking or credential authority.

Connections are named workspace-local configuration with endpoint/model and optional protected Bearer credential. HTTP is limited to loopback; remote endpoints require HTTPS. URL credentials, queries and fragments are rejected. Credential storage requires secure OS-backed protection; AAAAT does not implement provider accounts or OAuth.

Current direct operations are application-information extraction, shared Tag suggestions, focused CV writing and cover-letter drafting. Context is constructed for the operation and filtered by the applicable local permissions before provider calls. Internal identities are not provider mutation authority; temporary references resolve results through typed local services.

Application document permission applies to internal provider calls and external document access. The local context preview uses the same projection without enabling external reads. Returned structure is validated locally; useful partial results remain available. Untouched empty information may be filled directly by the requested action, while existing/newer manual work is preserved. New shared Tags remain reviewable before creation.

## Consequences

Manual use remains complete. Providers supply information processing, not product authority. AAAAT owns its local context and mutation boundaries, not the external model's reasoning, policy, accuracy or account system. No provider registry, plugin framework or generic AI platform is introduced.
