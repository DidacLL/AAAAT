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

The previous `PRODUCT_READY_TO_REVIEW` status was premature. A browser-blocking UX regression was found: `dashboard.html` loaded `/static/alpine.min.js`, but that asset was missing, so Alpine-owned local dashboard state did not execute.

Current readiness classification:

```text
BLOCKED_BY_UX_REGRESSION
```

The regression fix pass has added the missing local runtime asset and stabilized Detailed View row selection, but product-ready status should not be restored until the dashboard is manually verified in a browser.

The current product UX correction status is recorded in:

```text
10-dashboard-product-ux-correction.md
```

That file remains the current source of truth for the corrective dashboard behavior and review decision:

```text
fixed dashboard shell
constrained viewport
left/center/right panel layout
panel-local scrolling
reusable expandable module primitive
real button-based tab/module controls
actual collapsed panels for forms/actions/configuration
Smart View scan-safe first screen
Detailed View column visibility/order controls
Alpine runtime asset available to execute local state
runtime boundary preservation
browser-level verification still required
```

Do not merge the dashboard PR as product-approved until the product owner explicitly accepts the branch.

## Dashboard interaction stack decision

The dashboard remains server-rendered and local-first, but the interaction layer is no longer expected to be hand-rolled from templates alone.

Accepted dashboard interaction stack:

```text
Jinja for server-rendered structure
existing HTMX for server-rendered partial updates and button-triggered fragment swaps
Alpine.js as the required mechanism for dashboard-local interaction state where Alpine can express the behavior
project-owned CSS for layout, density, visual hierarchy, and themes
small project-owned JavaScript only where Alpine/HTMX/native HTML cannot express the specific primitive cleanly
```

HTMX and Alpine.js must be used deliberately according to their responsibilities:

```text
HTMX: server interactions, partial refreshes, selected context swaps, form submissions, dashboard fragments
Alpine.js: collapsed/expanded state, selected module/tab state, local dropdowns, local button-group state, local visibility toggles
```

Do not recreate Alpine-equivalent local state manually in project-owned JavaScript or duplicated template logic. If Alpine can express local open/closed/selected/visible state directly, use Alpine.

Custom JavaScript is allowed only when Alpine, HTMX, native HTML, and CSS cannot express the needed dashboard primitive cleanly. The reason must be documented in the worker summary.

This is not a frontend framework migration. Do not introduce React, Vue, Angular, Svelte, a large UI kit, drag libraries, table/grid libraries, or new frontend build tooling unless separately justified and explicitly accepted.

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

Implementation reached a CI-green architectural base, then product UX review rejected the result as incomplete for required behavior. A later final-pass review incorrectly marked the branch as product-ready while missing the actual Alpine runtime asset. That has been corrected.

Current status:

```text
BLOCKED_BY_UX_REGRESSION
```

Next required work is browser verification of the fixed local-state behavior.
