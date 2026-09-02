---
name: aaaat-engineering
description: Enter and execute bounded AAAAT repository development work under the canonical SPEC, current Mission, GitHub Issue, security boundaries, review policy, and anti-speculation rules. Use for implementation, review, architecture, testing, CI, packaging, or documentation changes in the AAAAT source repository; do not use it as the installed AAAAT product integration skill.
---

# AAAAT Engineering

Read, in order:

1. `AGENTS.md`
2. `docs/SPEC.md`
3. `.agentic/CONSTITUTION.md`
4. `.agentic/CURRENT_MISSION.md`
5. `.agentic/ROUTING.md`
6. `docs/engineering/EXECUTION.md` when execution behavior matters
7. the current GitHub Issue
8. relevant accepted ADRs

Implement only the smallest complete scope justified by the current Mission and Issue. GitHub Issues, branches, Pull Requests, reviews, Actions, and milestones hold dynamic engineering state; do not create a repository task database or `STATE.json`.

Use the available execution surface according to the evidence required. Use local, browser, visual, runtime, packaging, and multi-agent capabilities when they materially improve evidence; return normal results to GitHub CI and review.

Before integration:

- run `npm run verify` and Issue-specific checks;
- obtain an independent Reviewer result;
- invoke the Skeptical Simplifier for material new complexity;
- use a minimal expert committee only for genuine unresolved Class B/C disagreement;
- escalate only Class D decisions;
- remove speculative infrastructure.

> **Subagents are a reasoning resource, not an organizational goal. Do not spawn multiple agents merely to satisfy a process.**

> **A simple change does not require a committee.**
