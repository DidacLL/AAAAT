# AAAAT v1 release readiness status

Status: AUTOMATED IMPLEMENTATION COMPLETE; MANUAL HUMAN REVIEW PENDING.

PR: #45

Current authority:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`

## Automated closure

The B1–B15 implementation blockers are now covered by local code and executable fake-data validation:

- wx has a useful empty workspace, distinct Smart/Detailed responsibilities, one-note persistence, structured keywords, plain assisted choices, progress, portable exchange, and profile-to-render guidance;
- MCP has a shipped subprocess smoke client; the browser companion has a generated local native-host launcher; portable and Advanced-command paths have deterministic round trips and expected-failure coverage;
- expected CLI failures are concise, backup closes SQLite handles on Windows, and restore verifies into a separate workspace;
- privacy, capability lifecycle, controlled paths, wrapper ingestion, wheel/sdist installation, and local rendering are exercised through public boundaries.

Evidence at the implementation head: 155-test suite; built wheel and sdist installed outside the checkout; installed MCP smoke and release validator pass; and the installed wx desktop starts against a clean external workspace on Windows.

## Why human readiness is still pending

The first human review found that the review material and several active documents/tests were not aligned with the actual AAAAT product. They introduced or normalized wrong concepts, including plural candidature notes, invented fields, Smart/Detailed panel reuse, task-state clutter, internal-ID workflows, unexplained protocol processes, and grep-based privacy checks.

The release remains draft until a human performs the documented wx demonstrations: manual first use, assisted disclosure/progress/failure/retry, a real external AI plus an independent wrapper, browser or portable transfer, and rendered-artifact review. Those are acceptance observations, not remaining implementation blockers.

## What has been corrected in requirements

- complete work item returned at acquisition; no split context step;
- one random attempt capability; no internal-ID authority;
- one candidature note;
- structured keyword editing;
- distinct Smart View and Detailed View responsibilities;
- no task/state/integration clutter in Smart View;
- no Smart View glossary panel in Detailed View;
- understandable empty state and standard onboarding;
- admin CLI IDs excluded from normal assisted workflows;
- executable wrapper demonstrations required;
- expected errors must not expose tracebacks;
- Windows backup/restore is a release gate;
- privacy acceptance must be structural and behavioral.

## Next review work

Follow the human-review eligibility section in `v1-release-requirement-gap-ledger.md` using the supplied fixtures. Record the exact committed head before changing the PR state.

Do not mark PR #45 ready until those demonstrations are completed and direct maintainer approval is given.
