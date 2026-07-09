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

## Dashboard interaction stack decision

The dashboard remains server-rendered and local-first, but the interaction layer is no longer expected to be hand-rolled from templates alone.

Accepted dashboard interaction stack:

```text
Jinja for server-rendered structure
existing HTMX for server-rendered partial updates and button-triggered fragment swaps
Alpine.js for dashboard-local interaction state
project-owned CSS for layout, density, visual hierarchy, and themes
small project-owned JavaScript only where Alpine/HTMX/native HTML are insufficient
```

HTMX and Alpine.js should be used deliberately where they fit:

```text
HTMX: server interactions, partial refreshes, selected context swaps, form submissions, dashboard fragments
Alpine.js: collapsed/expanded state, selected module/tab state, local dropdowns, local button state, local visibility toggles
```

This is not a frontend framework migration. Do not introduce React, Vue, Angular, Svelte, a large UI kit, or drag/table libraries unless separately justified and explicitly accepted.

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

The first corrective slice completed the bounded shell/layout contract on branch head `0551f5c9aaba740f31d4d7444c47221788ffdf35`.

Current status:

```text
BLOCKED_REPLAN_REQUIRED
```

The next implementation direction must be derived from `10-dashboard-product-ux-correction.md`, the accepted HTMX+Alpine interaction stack, and the current bounded-shell baseline.
