# ADR 0018 — Validated AI operation capabilities and defaults

**Status:** Accepted for Issue #179. The capability/default-routing decision remains accepted. References to format version 3 below are historical provenance for that pre-baseline slice; the current configuration format is version 4 and does not retain a v3 compatibility reader or migration path.

## Context

ADR 0017 established several named AI connections and one explicit nullable general default, while deliberately deferring capability discovery and per-operation routing. Product authority then required honest capability-aware setup: multiple connections may provide different capabilities, no provider is assumed to support every operation, and useful operation defaults must be based on actual capability rather than assumption.

There was no real-user v2 compatibility baseline. The format-version-2 plural connection file was development-era configuration, not an upgrade commitment.

## Decision

For this historical slice, `ai-connection.json` moved directly to format version 3. Each stable-ID connection stored a bounded set of existing AAAAT AI operations that had been explicitly validated for its current endpoint/model. The file also stored explicit per-operation default connection IDs. These are internal routing/validation metadata; the user-defined connection coordinates remain name, endpoint and model.

Validation uses only synthetic AAAAT context and the existing provider operation contract. It records success only when the provider returns output valid for that operation's current typed contract. Validation does not disclose candidature, profile, Source or document content and is not a benchmark or claim about model intelligence.

Editing a connection's endpoint or model invalidates all recorded operation capabilities for that connection and clears per-operation defaults that reference it. A name-only edit preserves validation. Removing a connection clears its operation defaults.

The first connection successfully validated for an operation becomes that operation's default only when no operation default exists. Later validations do not switch it. Users may explicitly choose another connection only after it has been validated for that operation.

AI operations resolve their explicit operation default first. The general default from ADR 0017 remains a convenience fallback only when that connection is itself validated for the requested operation. AAAAT never searches other connections or falls back automatically.

The development-era version-2 format was not migrated or projected; it was corrected directly under the pre-baseline rule. The same rule now applies to development-era v3 configuration: current v4 rejects it rather than normalizing or rewriting it.

## Consequences

AAAAT can distinguish connection capability and operation routing without a provider registry, ranking system, generic routing engine or background discovery service. Existing provider prompts, privacy projection and mutation rules remain bounded by current product authority.

Credential/authentication configuration, research capability, provider-specific onboarding, model benchmarking, automatic fallback and broader setup orchestration are outside this slice. Their absence here is not a product-wide prohibition.
