# Review Policy

Default topology:

```text
Builder → Reviewer → Integrator
```

Use the Skeptical Simplifier and temporary expert committees only when the change justifies them.

## Priorities

1. correctness
2. approved product behavior
3. simplicity
4. maintainability
5. portability
6. security and privacy
7. testability
8. ecosystem convention
9. hypothetical future flexibility

## Required search

Reviewers actively search for scope expansion, SPEC violations, duplicate mutation paths, unused abstractions, premature frameworks, manual workflows depending on AI, renderer security weakening, privacy leaks, non-portable LaTeX, v1 architecture leaking into v2, and tests that freeze incidental implementation structure.

Deletion is a valid recommendation. Executable evidence outranks agent opinion or committee majority.

## Integration outcomes

- `MERGE`: acceptance criteria and relevant CI pass; no blocking finding, unjustified complexity, undocumented Class C decision, or Class D change remains.
- `CORRECT`: Builder corrects the same branch, then verification and review repeat.
- `COMMITTEE`: a minimal relevant expert group evaluates the same evidence independently.
- `OWNER_DECISION`: a concrete Class D Issue is prepared.
