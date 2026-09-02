# ADR 0004 — Class C lower bounds and review evidence

## Context

AAAAT already requires Class C review for meaningful shared-contract/database-representation changes and process boundaries. Merged PRs #67 and #73 demonstrate that small implementations can nevertheless be classified downward. The project also needs review evidence to distinguish a separate reasoning pass from merely relabeling Builder output, without turning that requirement into GitHub identity or reviewer-management ceremony.

## Decision

Class C classification is a lower bound for new or materially changed durable schema/storage representation, shared desktop contracts, production runtime dependencies, process/privilege boundaries, and material build integration unless an accepted ADR already covers the exact decision.

Class C evidence is tied to the exact reviewed commit SHA and records a Reviewer reasoning context separate from the Builder, evidence inspected, concrete Reviewer findings, Skeptical Simplifier findings, and Integrator outcome.

Reasoning independence is provider-agnostic. The same GitHub identity may publish Builder, Reviewer, Simplifier, and Integrator evidence. A separate GitHub account, reviewer request, formal approval object, bot, team, or provider-specific review integration is neither required nor evidence of reasoning independence, and must not be introduced solely to satisfy this contract.

Constitutional and SPEC security, privacy, renderer-isolation, local-ownership, manual-independence, and portable-output constraints are review gates rather than weighted preferences.

## Consequences

- Small patches cannot bypass architectural review by self-classifying downward.
- Review provenance is auditable without storing transcripts or introducing a reviewer orchestration system.
- Review roles remain compatible with a single-maintainer repository and provider-neutral execution.
- Existing accepted ADR decisions can be implemented without duplicate ADRs when the decision itself is unchanged.

## Rejected alternatives

- A generic policy engine or semantic classifier bot.
- Treating green CI as architectural approval.
- Treating role headings as proof of separate reasoning.
- Requiring separate GitHub identities, reviewer registrations, approval objects, bots, or teams to represent reasoning roles.
- Rewriting old merged PR history.
