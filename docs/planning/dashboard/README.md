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

The current branch is CI-green and has completed the planned corrective dashboard UX baseline through the final hard UX contract pass.

Current readiness classification:

```text
PRODUCT_READY_TO_REVIEW
```

This means the branch is ready for product review. It does not mean the PR has been product-approved or merged.

The final product UX correction status is recorded in:

```text
10-dashboard-product-ux-correction.md
```

That file remains the current source of truth for the corrective dashboard behavior and final review decision:

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
hard UX acceptance tests beyond data-hook presence
runtime boundary preservation
```

Do not merge the dashboard PR as product-approved until the product owner explicitly accepts the review-ready branch.

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

Implementation reached a CI-green architectural base, then product UX review rejected the result as incomplete for required behavior. The corrective sequence has now completed:

```text
1. Bounded dashboard shell and left/center/right panel regions: done.
2. Reusable dashboard module primitive: done.
3. Button-based module selector primitive: done.
4. Expandable form/action/configuration panels: done.
5. Smart View scan-safe first screen: done.
6. Detailed View column visibility/order controls: done.
7. Final hard UX contract/review pass: done.
```

Current status:

```text
PRODUCT_READY_TO_REVIEW
```

Future work should be product-review follow-up, not another corrective feature slice, unless a new blocker is found.
