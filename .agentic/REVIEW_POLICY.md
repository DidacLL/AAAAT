# Review Policy

Default topology:

```text
Builder → Reviewer → Integrator
```

Reviewer challenges Builder assumptions and reports concrete evidence-backed findings. Use a separate reasoning context or specialist when the change's risk or novelty makes that useful. Material corrective changes invalidate the affected review; the Integrator decides whether a correction requires review to repeat.

Security, privacy, renderer isolation, local data ownership, manual independence, and portable user-owned output are hard review and merge gates where applicable. They are not preferences to trade against simplicity, convenience, or schedule; changing a governing constraint requires the corresponding authoritative decision.

## Priorities after gates pass

1. correctness
2. approved product behavior
3. simplicity
4. maintainability
5. portability
6. testability
7. ecosystem convention
8. hypothetical future flexibility

## Required search

Reviewers actively search for scope expansion, SPEC violations, duplicate mutation paths, unused abstractions, premature frameworks, manual workflows depending on AI, renderer security weakening, privacy leaks, non-portable LaTeX, v1 architecture leaking into v2, and tests that freeze incidental implementation structure.

Deletion is a valid recommendation. Executable evidence outranks agent opinion or committee majority.

## Integration outcomes

- `MERGE`: acceptance criteria and relevant CI pass; applicable hard gates pass; no blocking finding, unjustified complexity, undocumented Class C decision, or Class D change remains.
- `CORRECT`: Builder corrects the same branch; the Integrator determines which verification and review evidence must repeat.
- `COMMITTEE`: a minimal relevant expert group evaluates materially unresolved evidence.
- `OWNER_DECISION`: a concrete Class D Issue is prepared.
