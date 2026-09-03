# ADR 0011: Keep current career context separate from professional evidence

- Status: Accepted for M6
- Decision class: C
- Issue: #128

## Context

AAAAT's canonical profile owns factual reusable professional evidence and profile variants store only differences from that evidence. M6 adds a different user need: current career direction, objectives, constraints, targets, and working/application preferences used to judge opportunities.

Those values are reusable across candidatures, but they are not another person's profile and are not necessarily durable professional facts. Treating them as profile items would blur the accepted canonical-evidence boundary. Recreating v1 `career_plans` would add history, lifecycle, and workflow state that the M6 user journey does not require.

The M6 journey needs only one current workspace-level context that can be edited manually and recovered after reopen.

## Decision

Store one fixed current `career_context` aggregate adjacent to, but separate from, canonical profile data.

The aggregate contains exactly the M6 concepts demonstrated by the current user journey:

- career direction;
- objectives;
- constraints;
- target roles;
- target markets/locations;
- work preferences;
- application/writing preferences.

M6 stores these values as ordinary text in one singleton row. Plural concepts are not normalized into independent target/preference entities until a demonstrated workflow requires independent identity or behavior.

All durable mutation goes through one explicit career-context application service and narrow typed preload/IPC methods. A minimal domain-specific activity table records meaningful updates without creating a general event/provenance system.

The Profile renderer may present this aggregate as `Current career context`, but it remains semantically distinct from authoritative professional evidence and difference-only profile variants.

## Consequences

- Canonical profile and variant semantics remain unchanged.
- A candidature does not copy or own workspace career preferences.
- Empty career-context values are valid.
- M6 can compare opportunity understanding against reusable current direction/constraints without introducing a planning subsystem.
- Later product work may change the representation only through a new demonstrated requirement and normal decision review.

## Rejected alternatives

### Store career context as profile items

Rejected because current goals, constraints, targets, and writing preferences are decision context rather than professional evidence. This would weaken the canonical-profile invariant.

### Recreate `career_plans`

Rejected because M6 demonstrates no plan history, status machine, workflow, date sequence, or plan-to-candidature lifecycle.

### Generic key/value or content registry

Rejected because seven fixed current values are known. A registry would add indirection and unused extension authority around a small feature.

### Copy career context into each candidature

Rejected because the values are reusable workspace context. Duplication would create stale, conflicting authority and make ordinary opportunity editing larger.
