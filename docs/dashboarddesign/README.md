# AAAAT Dashboard UX Planning Pack

This folder contains file-driven planning artifacts for the next dashboard development phase of AAAAT.

The purpose is to avoid relying on transient LLM chat context. Each file is intended to be committed or copied into the repository as durable orchestration material for Codex/LLM workers and human review.

## Files

- `01-dashboard-requirements-review.md`  
  Product and UX review of the current dashboard direction, including corrected requirements.

- `02-dashboard-four-view-ux-spec.md`  
  Functional UX specification for Welcome View, User View, Smart View, and Detailed View.

- `03-dashboard-implementation-plan.md`  
  Development plan, implementation order, data/view-state model, and branch strategy.

- `04-codex-worker-prompts.md`  
  Ready-to-use Codex prompts for file-driven orchestration.

- `05-dashboard-test-plan.md`  
  Durable UX/runtime tests to add or update.

- `06-runtime-boundary-notes.md`  
  Notes to keep the dashboard UX work aligned with the dashboard/agent runtime split.

## Intended use

Use this pack as a planning input for the worker branch:

```text
codex/runtime-split-dashboard-ux
```

Target integration branch:

```text
codex/runtime-split-agent-dashboard
```

The dashboard redesign must not weaken the separate agent runtime contract.
