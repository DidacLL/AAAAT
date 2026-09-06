# ADR 0018 — Validated AI operation capabilities and defaults

**Status:** Accepted for Issue #179

## Context

ADR 0017 established several named local AI connections and one explicit nullable general default, while deliberately deferring capability discovery and per-operation routing. Product authority now requires honest capability-aware setup: multiple connections may provide different capabilities, no provider is assumed to support every operation, and useful operation defaults must be based on actual capability rather than assumption.

There is still no real-user v2 compatibility baseline. The format-version-2 plural connection file is development-era configuration, not an upgrade commitment.

## Decision

`ai-connection.json` remains the single machine-local AI configuration file and moves directly to format version 3. Each stable-ID connection stores a bounded set of existing AAAAT AI operations that have been explicitly validated for its current endpoint/model. The file also stores explicit per-operation default connection IDs.

Validation uses only synthetic AAAAT context and the existing provider operation contract. It records success only when the provider returns output valid for that operation's current typed contract. Validation does not disclose candidature, profile, Source or document content and is not a benchmark or claim about model intelligence.

Editing a connection's endpoint or model invalidates all recorded operation capabilities for that connection and clears per-operation defaults that reference it. A name-only edit preserves validation. Removing a connection clears its operation defaults.

The first connection successfully validated for an operation becomes that operation's default only when no operation default exists. Later validations do not switch it. Users may explicitly choose another connection only after it has been validated for that operation.

AI operations resolve their explicit operation default first. The general default from ADR 0017 remains a convenience fallback only when that connection is itself validated for the requested operation. AAAAT never searches other connections or falls back automatically.

The development-era version-2 format is not migrated or projected; it is corrected directly under the pre-baseline rule.

## Consequences

AAAAT can distinguish connection capability and operation routing without a provider registry, ranking system, generic routing engine or background discovery service. Existing provider prompts, privacy projection and mutation rules remain unchanged.

Remote authentication, research capability, provider-specific onboarding, model benchmarking, automatic fallback and broader setup orchestration remain separate product slices. A future setup capability may reuse these validated operation facts rather than inventing a second capability model.
