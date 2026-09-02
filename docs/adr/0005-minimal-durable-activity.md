# ADR 0005 — Minimal durable activity records

## Context

AAAAT requires durable mutations to record meaningful provenance/activity in the same transaction. Existing document activity used a cascading foreign key to `documents`, so `document.remove` was erased by the deletion it described. Concepts had no activity table at all.

## Decision

Migration 006 keeps activity domain-specific and minimal:

- `document_activity.document_id` remains the deleted document identifier but is no longer a cascading foreign key, so removal activity survives document deletion;
- `concept_activity` stores only `occurred_at`, `concept_id`, and a bounded action string;
- concept create/update mutations and their activity writes commit atomically.

The existing profile and candidature activity representations are unchanged. No generic provenance model, universal event envelope, undo log, command bus, or cross-domain activity service is introduced.

## Consequences

Activity rows may intentionally refer to an entity that no longer exists. That is required for truthful deletion history and is preferable to cascading away the evidence. The representation records current mutation meaning only; it does not claim generalized undo or full historical reconstruction.
