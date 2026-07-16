# AAAAT v1 release readiness status

Status: AUTOMATED CONNECTED-LLM EVIDENCE COMPLETE; HUMAN REVIEW PENDING; NOT READY.

PR: #45

Current authority:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`

## Superseded automated closure

The previous B1–B15 closure was based on the reversed assisted-use model and is no longer release evidence:

- wx view/editor, one-note, structured-keyword, backup, rendering, and bounded-work evidence remain relevant;
- manual-first onboarding, browser companion, raw storage-argument MCP setup, and tests/docs that treat the LLM only as a constrained task worker are superseded;
- fresh evidence must cover capability-led host onboarding, opaque pairing/revocation, bridge verification, and portable fallback.

Earlier test/build results are historical only. Fresh connected-host evidence is:

- focused host-connection, MCP, onboarding, integration, and expected-error tests;
- full suite: 160 tests passed on Windows/Python 3.13;
- release validator: automated gates passed, including backup/restore into a separate workspace;
- wheel and sdist built outside the checkout and installed into separate fresh environments;
- installed MCP and paired-bridge stdio smoke clients passed claim, progress, submission, and malformed-request paths; the paired smoke requires the installed bridge console command rather than a module fallback;
- installed release validator passed against an external workspace.

## Why human readiness is still pending

The first human review found that the review material and several active documents/tests were not aligned with the actual AAAAT product. They introduced or normalized wrong concepts, including treating the connected LLM as a constrained worker, manual/portable-first setup, browser JSON-paste setup, plural candidature notes, invented fields, Smart/Detailed panel reuse, task-state clutter, internal-ID workflows, unexplained protocol processes, and grep-based privacy checks.

The release remains draft until a human performs the documented wx demonstrations: manual first use, connection-card disclosure and pause/revoke, assisted progress/failure/retry with a real external AI, portable fallback, and rendered-artifact review. Those are acceptance observations, not remaining implementation blockers. The retired browser extension is not an acceptance route.

## What has been corrected in requirements

- complete work item returned at acquisition; no split context step;
- one random attempt capability; no internal-ID authority;
- one candidature note;
- structured keyword editing;
- distinct Smart View and Detailed View responsibilities;
- no task/state/integration clutter in Smart View;
- no Smart View glossary panel in Detailed View;
- understandable empty state and standard onboarding;
- connected LLM host setup is separate from bounded claimed-work authority;
- opaque paired host bridge replaces browser-primary connection guidance;
- admin CLI IDs excluded from normal assisted workflows;
- executable wrapper demonstrations required;
- expected errors must not expose tracebacks;
- Windows backup/restore is a release gate;
- privacy acceptance must be structural and behavioral.

## Next review work

Perform the remaining human demonstrations recorded in `v1-release-requirement-gap-ledger.md`, including a real host's capability-led connection flow. Record the exact committed head before changing the PR state.

Do not mark PR #45 ready until those demonstrations are completed and direct maintainer approval is given.
