# AAAAT Constitution

These durable invariants may change only through an accepted Class D owner decision, subject to the higher Product Owner authority in `docs/OWNER_INTENT.md`.

## Product invariants

- AAAAT is local-first. The user's local workspace is authoritative.
- AAAAT remains fully human-operable without AI. Manual input, AAAAT-assisted AI, and bounded external-AI interaction are alternative ways to work with the same user-owned information.
- Optional capability is not mandatory; non-core capability is not automatically forbidden.
- VCVGenerator is core functionality and remains usable without a candidature or AI.
- Generated LaTeX and its source projects belong to the user and remain usable without AAAAT.
- Document programming uses standard LaTeX plus `expl3`.
- pdfLaTeX is the baseline; LuaLaTeX and XeLaTeX are capability extensions.
- One canonical professional profile owns authoritative professional evidence.
- Named profile variants contain focus, visibility, ordering, and override rules rather than cloned identities.
- Document overrides do not mutate the canonical profile or a profile variant.
- Every durable mutation uses an AAAAT application service, regardless of whether input came from a person, direct AI, or bounded external AI.
- AAAAT security is structural: authoritative local data, explicit product-specific data structures, narrow application-service mutations, typed validation, bounded capabilities, and process/renderer privilege boundaries are the authority boundary.
- AAAAT does not own or secure an external AI model's reasoning, prompt interpretation, provider internals, network, or research behavior. External AI receives bounded operation-specific context/capabilities rather than broad local authority.
- AI context is privacy-projected before inference. Privacy projection controls disclosure; it is separate from domain authority and may expose, omit, or locally replace/tokenize information.
- AI output is validated and operation-scoped. Invalid or conflicting output never silently overwrites authoritative data; retained AI-produced values remain ordinary editable AAAAT information. No universal human-approval queue is implied.
- The Electron renderer remains sandboxed, context-isolated, and unprivileged.
- The AI domain remains provider-neutral.
- Optional AI connectivity prioritizes practical user accessibility: developer API credentials or paid cloud access are not assumed prerequisites when simpler keyless or broadly accessible paths can satisfy the current need; remote and provider-specific mechanisms remain allowed when justified.
- External integrations receive only bounded AAAAT capabilities.
- AAAAT has no v1 compatibility obligation.
- AAAAT remains understandable and maintainable by one engineer.

## Architectural prohibitions

AAAAT does not become a general agent framework, workflow engine, generic plugin platform, mandatory cloud service, local microservice system, provider marketplace, generic AI policy/security engine, or prompt-injection/security middleware layer.

These prohibitions do not forbid a bounded product capability merely because that capability is optional or non-core.

> **If the current Mission can succeed without a new subsystem, framework, abstraction, extension mechanism or runtime service, do not add it.**

> **The autonomous development system must remain materially simpler than AAAAT itself.**
