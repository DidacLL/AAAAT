# Dashboard Implementation Plan

## Branching

Primary orchestration branch:

```text
didacll/dashboard-design
```

This branch is the canonical dashboard-design branch for PR #36. Do not leave dashboard work stranded outside this branch.

## Work package name

```text
Dashboard four-view UX replacement
```

## Current implementation status

The previous product-ready classification was wrong. The dashboard referenced `/static/alpine.min.js`, but that asset was missing, so Alpine-owned local dashboard behavior did not execute in the browser.

Current readiness classification:

```text
BLOCKED_BY_UX_REGRESSION
```

The current source of truth for corrective UX status is:

```text
docs/planning/dashboard/10-dashboard-product-ux-correction.md
```

## Goals

- Preserve and clarify Welcome View, User View, Smart View, and Detailed View.
- Implement the dashboard as a constrained human workspace, not a vertically expanding document.
- Use a fixed/constrained shell with left, center, and right bounded panel regions.
- Use reusable dashboard module primitives instead of unrelated hand-built blocks.
- Use real button controls for actions and tab/module selection.
- Replace visible form walls with collapsed expandable panels.
- Convert notes into one primary directly editable note field per candidature in Smart View.
- Implement Smart View as the recruiter-call-oriented operational view.
- Implement Detailed View as the table/grid-oriented candidature management view.
- Add real column visibility and ordering controls for Detailed View.
- Add left-panel toolbox behavior for Detailed View.
- Add right-panel LLM task queue for Detailed View.
- Preserve keyword chip behavior and selected keyword context behavior.
- Preserve dashboard runtime as human-local only.
- Build or preserve a dashboard projection/view-model boundary consumed by the HTML dashboard.
- Avoid exposing this UI model or projection data as an agent API.
- Avoid heavy frontend dependencies and avoid SPA migration.

## Accepted dashboard interaction stack

The dashboard remains server-rendered and local-first, but dynamic behavior should not be hand-rolled when the accepted stack already covers it.

Accepted stack:

```text
Jinja for server-rendered structure
existing HTMX for server-rendered partial updates and button-triggered fragment swaps
Alpine.js as the required mechanism for dashboard-local interaction state where Alpine can express the behavior
project-owned CSS for layout, density, visual hierarchy, and themes
small project-owned JavaScript only where Alpine/HTMX/native HTML cannot express the specific primitive cleanly
```

Required responsibility split:

```text
Jinja: durable structure and initial render
HTMX: server interactions, partial refreshes, selected context swaps, form submissions, server-rendered module bodies
Alpine.js: collapsed/expanded modules, selected tabs/modules, dropdowns, local button-group state, local visibility toggles
CSS: bounded shell, panel sizing, density, visual hierarchy, theme behavior
```

Alpine.js is not merely permitted. For local dashboard interaction state, do not hand-roll custom JavaScript or duplicate local open/closed/selected/visible state in templates when Alpine can express the behavior directly.

Use Alpine directly for local dashboard state:

```text
x-data for component-local state
x-show or equivalent Alpine binding for collapsed/expanded visibility
@click or equivalent Alpine event binding for toggles
x-bind / :aria-expanded / :aria-selected for accessibility and state markers
class/data-state bindings for selected, active, disabled, collapsed, and expanded states
```

Use HTMX only where server-rendered state or server-side action handling is required:

```text
hx-get / hx-post for server requests
hx-target for fragment targets
hx-swap for server-rendered body replacement
```

## Corrective implementation order and result

### 1. Dashboard shell and bounded three-panel layout

Status: implemented.

### 2. Reusable module primitive

Status: implemented.

### 3. Button-based tab/module selector primitive

Status: implemented.

### 4. Expandable form/action/configuration panels

Status: implemented.

### 5. Smart View scan-safe rewrite

Status: implemented.

### 6. Detailed View column controls

Status: implemented.

### 7. Alpine runtime asset regression

Status: fixed, pending browser verification.

The dashboard now includes `aaaat/static/alpine.min.js` so local open/closed/selected/visible state can execute. This corrective asset should be reviewed against the accepted stack. If strict third-party Alpine is required, replace the current local runtime asset with a vendored official Alpine distribution.

### 8. Detailed View row selection affordance

Status: fixed, pending browser verification.

Detailed View now has a stable row Select column outside the configurable data-column set, so selected-row/toolbox context remains reachable even when data columns are hidden or reordered.

## Final readiness decision

```text
BLOCKED_BY_UX_REGRESSION
```

Product-ready status should be restored only after browser-level verification proves the local-state controls actually work.
