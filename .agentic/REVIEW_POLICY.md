# Review Policy

Default topology:

```text
Builder → Reviewer → Integrator
```

Use the Skeptical Simplifier and temporary expert committees only when the change justifies them. Class C always requires a separate Reviewer reasoning context and a Skeptical Simplifier pass.

Reviewer separation is about reasoning context, not provider identity. A separate GitHub account, reviewer request, or formal approval object is not required. In this single-maintainer repository, Builder, Reviewer, Simplifier, and Integrator evidence may all be published through the same GitHub identity. Do not add accounts, bots, teams, or provider-specific reviewer integrations merely to represent those roles.

## Constitutional and specification gates

Before weighing ordinary review priorities, verify that the change preserves applicable non-negotiable constraints from the Constitution and SPEC, including:

- local user ownership and manual independence;
- renderer sandboxing, context isolation, and bounded privileged authority;
- privacy boundaries and no unintended disclosure of private data;
- portable, user-owned generated LaTeX/output where document behavior is involved;
- provider-neutral domain behavior and bounded external capabilities where AI/integration behavior is involved.

These are gates, not preferences to trade against simplicity, maintainability, convenience, or schedule. A violated gate is a blocking finding unless an accepted higher-authority decision explicitly changes the constraint.

## Priorities after gates pass

1. correctness
2. approved product behavior
3. simplicity
4. maintainability
5. portability
6. testability
7. ecosystem convention
8. hypothetical future flexibility

Security and privacy remain mandatory through the gates above rather than a weighted priority.

## Required search

Reviewers actively search for scope expansion, SPEC violations, duplicate mutation paths, unused abstractions, premature frameworks, manual workflows depending on AI, renderer security weakening, privacy leaks, non-portable LaTeX, v1 architecture leaking into v2, and tests that freeze incidental implementation structure.

Deletion is a valid recommendation. Executable evidence outranks agent opinion or committee majority.

## Class C evidence contract

Class C review evidence must identify:

- the exact reviewed commit SHA;
- whether the Reviewer reasoning context was separate from the Builder reasoning context;
- the relevant Issue, SPEC/Mission/ADR constraints and executable evidence inspected;
- concrete Reviewer findings, including explicit `none` where a searched category produced no finding, rather than bare `PASS` language;
- Skeptical Simplifier findings about unnecessary complexity and the smallest acceptable design;
- the Integrator outcome: `MERGE`, `CORRECT`, `COMMITTEE`, or `OWNER_DECISION`.

The evidence must be published against the exact final corrective SHA before merge. Publication identity is not evidence of reasoning independence: the same GitHub account may publish all role evidence, and no GitHub reviewer registration or approval object is required by this policy. Do not describe same-account publication as a distinct GitHub approval.

## Integration outcomes

- `MERGE`: acceptance criteria and relevant CI pass; constitutional/specification gates pass; no blocking finding, unjustified complexity, undocumented Class C decision, or Class D change remains.
- `CORRECT`: Builder corrects the same branch, then verification and exact-head review repeat.
- `COMMITTEE`: a minimal relevant expert group evaluates the same evidence independently.
- `OWNER_DECISION`: a concrete Class D Issue is prepared.
