# ADR 0004 — Class C lower bounds and review evidence

## Context

AAAAT already requires Class C review for meaningful shared-contract/database-representation changes and process boundaries. Merged PRs #67 and #73 demonstrate that small implementations can nevertheless be classified downward. The review contract also needs to distinguish a genuine separate reasoning pass from merely relabeling Builder output without adding process machinery beyond what the harness already provides.

## Decision

Class C classification is a lower bound for new or materially changed durable schema/storage representation, shared desktop contracts, production runtime dependencies, process/privilege boundaries, and material build integration unless an accepted ADR already covers the exact decision.

Class C evidence is tied to the exact reviewed commit SHA and records a Reviewer reasoning context separate from the Builder, evidence inspected, concrete Reviewer findings, Skeptical Simplifier findings, and Integrator outcome.

Review execution uses the simplest adequate existing execution surface. The review contract does not itself justify new orchestration, state, or ceremony; additional machinery requires its own bounded need.

Constitutional and SPEC security, privacy, renderer-isolation, local-ownership, manual-independence, and portable-output constraints are review gates rather than weighted preferences.

## Consequences

- Small patches cannot bypass architectural review by self-classifying downward.
- Review provenance is auditable without storing transcripts or introducing a reviewer orchestration system.
- Review remains compatible with a single-maintainer project and provider-neutral execution.
- Existing accepted ADR decisions can be implemented without duplicate ADRs when the decision itself is unchanged.

## Rejected alternatives

- A generic policy engine or semantic classifier bot.
- Treating green CI as architectural approval.
- Treating role headings as proof of separate reasoning.
- Adding review-management infrastructure or ceremony when existing execution surfaces already satisfy the bounded review need.
- Rewriting old merged PR history.
