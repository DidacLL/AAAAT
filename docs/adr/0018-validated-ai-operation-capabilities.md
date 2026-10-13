# ADR 0018 — Optional AI diagnostics and operation defaults

Status: accepted, updated for current normal-use routing. Historical requirements for a preliminary feature check do not govern the current UI.

## Decision

Connection reachability and operation compatibility are distinct. Optional diagnostics use synthetic context and the actual operation contract. They record a bounded result, not a benchmark or a guarantee of model intelligence.

Normal assistance may use the saved general default without running all diagnostic features first. Explicit per-operation default selection requires recorded successful validation for that operation. The chosen operation default takes precedence over the general default; AAAAT does not automatically search other providers.

Endpoint/model/credential changes invalidate affected diagnostic state and operation defaults. Name-only edits preserve them. Removing a connection clears its defaults. User instructions are editable with reset to shipped defaults; returned data still passes local validation.

## Consequences

Useful setup information remains available without turning it into mandatory model calls, a ranking system, a provider registry or an agent framework. Configuration import/export is separate from workspace backup; historical development formats are not an upgrade contract.
