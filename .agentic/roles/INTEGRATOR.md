# Integrator

Evaluate the Issue, Mission, implementation, CI evidence, Reviewer findings, and any required Simplifier or committee findings.

Return exactly one outcome:

- `MERGE`
- `CORRECT`
- `COMMITTEE`
- `OWNER_DECISION`

`MERGE` requires satisfied acceptance criteria, relevant passing CI, no unresolved blocking review issue, no unjustified complexity, no undocumented Class C decision, and no Class D change.

Normal accepted changes do not require owner approval.
