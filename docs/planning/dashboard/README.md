# Dashboard Planning Pack

This directory contains the file-driven dashboard UX planning material for the AAAAT dashboard redesign on branch:

```text
didacll/dashboard-design
```

The dashboard plan preserves four human-facing views:

```text
Welcome View
User View
Smart View
Detailed View
```

Smart View and Detailed View do not replace Welcome View and User View.

## Compatibility amendment

The general architecture review confirms the four-view dashboard direction and adds one implementation constraint: the dashboard should render from structured projection/view-model data where practical.

The projection layer should prepare dashboard-facing state such as candidature summaries, selected candidature detail, primary note state, keyword context, artifact summaries, profile/career summaries, Detailed View table state, toolbox actions, task queue summaries, counters, and permissions for full/read-only/static-demo modes.

This projection layer is not an agent API, not a provider integration, and not a host adapter. It is an internal boundary for the human-local dashboard and possible future UI adapters.

Do not block the dashboard redesign on future work such as a compatibility descriptor, host adapter, privacy consolidation, artifact lifecycle hardening, or provider-specific integration.

## Files

```text
01-dashboard-requirements-review.md
02-dashboard-four-view-ux-spec.md
03-dashboard-implementation-plan.md
04-codex-worker-prompts.md
05-dashboard-test-plan.md
06-runtime-boundary-notes.md
```

Expected audit outputs from the first orchestration prompts:

```text
07-dashboard-requirements-trace.md
08-current-dashboard-implementation-map.md
```

## Orchestration status

Start with doc-only validation and implementation mapping. Implementation should begin only after the orchestrator accepts those summaries.
