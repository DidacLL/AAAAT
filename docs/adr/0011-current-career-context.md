# ADR 0011: Keep career preferences separate from professional information

- Status: Accepted technical decision; the historical M6 scope is non-authoritative.
- Decision class: C
- Issue: #128

## Historical context

This ADR's M6 terminology records the historical programme that introduced a distinct workspace-level preference aggregate. `PRODUCT_DEFINITION.md` establishes current product meaning, and this ADR remains technical evidence only.

AAAAT stores reusable professional information separately from current direction, objectives, constraints, targets, and working/application preferences. Those preferences are not necessarily durable professional facts. Treating them as professional-information items would blur the technical separation. Recreating v1 `career_plans` would add history, lifecycle, and workflow state that the recorded historical use case did not require.

The bounded technical need is one current workspace-level aggregate that can be edited manually and recovered after reopen.

## Decision

Store one fixed current `career_context` aggregate adjacent to, but separate from, professional-information data.

The aggregate contains these fixed concepts:

- career direction;
- objectives;
- constraints;
- target roles;
- target markets/locations;
- work preferences;
- application/writing preferences.

These values are ordinary text in one singleton row. Plural concepts are not normalized into independent target/preference entities until a demonstrated product need requires independent identity or behavior.

All durable mutation goes through one explicit career-context application service and narrow typed preload/IPC methods. A minimal domain-specific activity table records meaningful updates without creating a general event/provenance system.

The renderer presents this aggregate as `Career preferences`. The underlying `career_context` storage name remains an implementation detail, semantically distinct from professional information and difference-only document variations.

## Consequences

- Professional-information storage and document-variation semantics remain unchanged.
- A candidature does not copy or own workspace career preferences.
- Empty career-context values are valid.
- Preferences can be retained alongside a candidature without introducing a planning subsystem, ranking, or career workflow.
- Later product work may change the representation only through a new demonstrated requirement and normal decision review.

## Rejected alternatives

### Store career preferences as professional-information items

Rejected because current goals, constraints, targets, and writing preferences are decision context rather than professional information. This would weaken the technical separation.

### Recreate `career_plans`

Rejected because the historical use case demonstrates no plan history, status machine, workflow, date sequence, or plan-to-candidature lifecycle.

### Generic key/value or content registry

Rejected because seven fixed current values are known. A registry would add indirection and unused extension authority around a small feature.

### Copy career preferences into each candidature

Rejected because the values are reusable workspace context. Duplication would create stale, conflicting authority and make ordinary opportunity editing larger.
