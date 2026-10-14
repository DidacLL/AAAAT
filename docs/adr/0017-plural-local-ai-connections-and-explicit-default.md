# ADR 0017 — Named AI connections and an explicit general default

Status: accepted, updated for the current configuration. [ADR 0006](0006-first-direct-ai-provider-boundary.md) owns endpoint/credential boundaries; All assistance uses the selected connection; the capability-certification and per-operation-routing design has been removed.

## Decision

Workspace-local AI configuration stores named connections with stable identities and case-insensitively unique names. Each identifies an endpoint and model, with an optional protected credential. The user selects a nullable general default.

The first connection becomes the general default when there is no ambiguity. Adding or editing later connections does not silently change it. Removing it clears that default rather than selecting another server. All assistance uses the general default; it does not search or switch providers automatically.

## Consequences

Several understandable connections support different local or remote models without a provider marketplace, generic routing engine or background discovery service. Historical development formats are discarded rather than supported through compatibility readers or migrations. Manual work is unaffected by missing AI configuration.
