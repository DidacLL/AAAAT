# AAAAT Agent Instructions

Before working:

1. Read `docs/SPEC.md`.
2. Read `.agentic/CONSTITUTION.md`.
3. Read `.agentic/CURRENT_MISSION.md`.
4. Read `.agentic/ROUTING.md`.
5. Read `.agentic/DECISION_POLICY.md`.
6. Read `.agentic/REVIEW_POLICY.md`.
7. Read `docs/engineering/EXECUTION.md` when execution behavior matters.
8. Read the relevant GitHub Issue.
9. Read relevant accepted ADRs.

The SPEC, Constitution, and accepted ADRs are authoritative. The current Mission, routing/decision/review policies, and the bounded current Issue constrain execution. GitHub Issues, branches, Pull Requests, reviews, Actions, and milestones contain dynamic engineering state. Pre-canonical bootstrap inputs, ignored legacy assets, old Issue/PR prose, prior implementation documents, and audits are advisory or research evidence only; they do not override current canonical authority.

Build only what the current Mission and Issue require. Do not introduce speculative future infrastructure. Manual workflows remain independent from AI. Generated LaTeX remains portable. Durable product mutations use application services. The Electron renderer remains sandboxed and unprivileged.

Use the cheapest adequate execution surface, but use available local, browser, visual, runtime, packaging, and multi-agent capabilities when they materially strengthen evidence. GitHub Actions remains the independent cross-platform evidence plane.

Before completion:

- run the impact-appropriate verification selected by `.github/workflows/verify.yml`; runtime/source changes include `npm run verify`, while documentation/governance-only changes do not require unrelated product, TeX, or package execution;
- run Issue-specific checks;
- obtain independent review;
- invoke the Simplifier for material new complexity;
- resolve Class A/B/C decisions autonomously;
- escalate only Class D decisions.

Do not commit temporary prompts, sprint reports, handoffs, acceptance ledgers, generated review transcripts, personal data, or private workspace material.
