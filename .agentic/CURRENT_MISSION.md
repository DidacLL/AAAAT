# M3 — AI Assistance

## Outcome

AAAAT adds optional AI assistance over the proven manual workspace. The user can configure a model connection and invoke bounded, privacy-projected operations for job extraction, fit assessment, profile-variant recommendation, CV tailoring, and cover-letter drafting without making AI authoritative or required.

## Required

- preserve complete manual usefulness when no AI provider is configured or available
- keep the AI domain provider-neutral; product/domain code does not import provider-specific request types or behavior
- start with the simplest demonstrated user-accessible connection appropriate to each slice; do not assume developer API keys or paid API access are the default connection experience
- each AI operation owns its input/output schema, minimum required context, privacy requirements, capability requirements, instructions, and mutation/conflict policy
- construct operation-specific context immediately before inference and apply privacy projection before any provider invocation
- each eligible value may be exposed, omitted, or replaced by a local opaque token; token mappings remain local
- classify configured connections as local, remote, or unknown and make remote disclosure understandable; unusually broad remote analysis requires proportionate acknowledgement
- validate every provider result against the operation contract before it can affect authoritative state
- permitted valid results use the same normal application services as manual UI mutations; invalid output never mutates authoritative data and conflicting proposals never silently overwrite existing authoritative values
- introduce credential storage only when a demonstrated connection requires credentials; required credentials are not plaintext application records, and insecure fallback conditions are explicit
- renderer authority remains narrow: no arbitrary provider networking, credential access, filesystem, database, process, or generic privileged invocation
- deterministic provider fixtures and focused operation/privacy tests prove the implemented contracts

## Explicit non-goals

- AI becoming mandatory for core AAAAT, candidature management, profile editing, or VCVGenerator
- M4 external control: MCP, host integrations, external agent commands, installer automation, portable AI exchange, backup, or restore
- agent frameworks, workflow frameworks, provider registries or marketplaces, cloud gateways, background schedulers, generic durable task systems, or event buses
- generic field-action registries or general approval queues
- direct renderer networking or credential authority
- arbitrary AI-generated executable TeX projects as the normal document path
- redesigning the M0 Electron/SQLite boundary or M1/M2 domain contracts without concrete evidence
- company-research agents or broad autonomous job-search workflows

## Completion

A user can configure at least one demonstrated direct model connection and use the bounded M3 operations through coherent desktop workflows. Provider input is privacy-projected before inference, output is typed and validated, conflicts cannot silently overwrite authoritative data, permitted mutations follow ordinary application services, and the product remains fully useful when AI is absent. Independent review accepts the result without M4 infrastructure or speculative AI frameworks.
