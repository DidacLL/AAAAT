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

## Current product status

The current branch is CI-green and points in the intended architectural direction, but the dashboard implementation is **not technically complete for the required UX behavior** and is **not product-approved**.

CI currently proves that the code compiles, runtime boundaries are guarded, and the implemented tests pass. It does not prove that the required dashboard behaviors, views, controls, panel model, or interaction model have been implemented correctly.

The product-owner rejection is recorded in:

```text
10-dashboard-product-ux-correction.md
```

That file is the current source of truth for missing required dashboard behavior:

```text
fixed dashboard shell
constrained viewport
left/center/right panel layout
panel-local scrolling
reusable expandable module primitive
real button-based tab/module controls
actual collapsed panels for forms/actions/configuration
Detailed View column visibility/order controls
hard UX acceptance tests beyond data-hook presence
```

Do not merge the dashboard PR as product-complete until those UX requirements are implemented or explicitly deferred by product decision.

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
07-dashboard-requirements-trace.md
08-current-dashboard-implementation-map.md
09-dashboard-integration-review.md
10-dashboard-product-ux-correction.md
```

## Orchestration status

Implementation reached a CI-green architectural base, but product UX review rejected the result as incomplete for required behavior.

Current status:

```text
BLOCKED_REPLAN_REQUIRED
```

The next implementation direction must be derived from `10-dashboard-product-ux-correction.md`, not from the earlier green integration result alone.
