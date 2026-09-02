# ADR 0004 — Class C lower bounds and review evidence

## Context

AAAAT already requires Class C review for meaningful shared-contract/database-representation changes and process boundaries. Merged PRs #67 and #73 demonstrate that small implementations can nevertheless be classified downward, and review text published by one GitHub identity can obscure whether the underlying reasoning was actually separate.

## Decision

Class C classification is a lower bound for new or materially changed durable schema/storage representation, shared desktop contracts, production runtime dependencies, process/privilege boundaries, and material build integration unless an accepted ADR already covers the exact decision.

Class C evidence is tied to the exact reviewed commit SHA and records the separate Reviewer reasoning context, evidence inspected, concrete Reviewer findings, Skeptical Simplifier findings, and Integrator outcome. When Builder and review evidence are published by the same GitHub account, that limitation is disclosed; separate reasoning does not become a distinct GitHub identity or formal independent GitHub approval.

Constitutional and SPEC security, privacy, renderer-isolation, local-ownership, manual-independence, and portable-output constraints are review gates rather than weighted preferences.

## Consequences

- Small patches cannot bypass architectural review by self-classifying downward.
- Review provenance is auditable without storing transcripts or introducing a reviewer orchestration system.
- Existing accepted ADR decisions can be implemented without duplicate ADRs when the decision itself is unchanged.
- GitHub identity limitations are represented accurately.

## Rejected alternatives

- A generic policy engine or semantic classifier bot.
- Treating green CI as architectural approval.
- Treating role headings or one GitHub account as proof of independent reasoning.
- Rewriting old merged PR history.
