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

The planned corrective dashboard UX baseline is complete through the final hard UX contract pass.

Current readiness classification:

```text
PRODUCT_READY_TO_REVIEW
```

The current source of truth for final corrective UX status is:

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

Custom JavaScript is allowed only when Alpine, HTMX, native HTML, and CSS cannot express the needed dashboard primitive cleanly. No custom JavaScript was required for the corrective dashboard baseline.

This is not a frontend framework migration. Do not introduce React, Vue, Angular, Svelte, a large UI kit, drag libraries, table/grid libraries, or new frontend build tooling unless separately justified and explicitly accepted.

## Non-goals

- Do not implement a frontend SPA migration.
- Do not create a dashboard JSON API for agents.
- Do not expose dashboard actions in the agent runtime.
- Do not overbuild saved user-defined views in the correction pass.
- Do not implement speculative modules beyond the base shell/module/tab/panel primitives.
- Do not rewrite storage architecture for the UX pass unless a minimal field is missing.
- Do not implement the future compatibility descriptor, host adapter, artifact lifecycle overhaul, or privacy-schema consolidation in this branch.
- Do not start static export migration from this dashboard UX line.

## Compatibility amendment: UI projection boundary

A general architecture review confirms the dashboard direction but changes the implementation emphasis. The dashboard should be projection-first where practical.

This means the implementation introduces and preserves a structured dashboard projection/view-model layer that prepares state for the four views before HTML rendering. The server-rendered dashboard consumes this projection data. Future embedded UI adapters may later consume similar projections without scraping dashboard HTML.

The projection layer covers:

```text
Welcome setup state and primary actions
User/profile/career/template/settings summaries
Smart View candidature summaries
selected candidature operational detail
primary note state
keyword/glossary context
artifact state summaries
Detailed View rows
available and visible columns
column order/filter/search state
selected row context
Detailed View toolbox actions
human-facing task queue summaries
dashboard counters and next actions
permissions for full/read-only/static-demo modes
```

Constraints:

- The projection layer is not an agent API.
- The projection layer is not an LLM/provider adapter.
- The projection layer is not a new HTTP contract by default.
- The dashboard remains human-local.
- The agent runtime remains bounded task/context/action only.
- Avoid a broad domain-service rewrite in this dashboard branch.

## Corrective implementation order and result

### 1. Dashboard shell and bounded three-panel layout

Status: complete.

The shell establishes a bounded dashboard container, left/center/right panel regions, and panel-local scroll ownership.

### 2. Reusable module primitive

Status: complete.

Reusable dashboard modules expose headers, titles, action areas, button controls, local body regions, optional local scroll areas, and Alpine-owned collapsed/expanded state.

### 3. Button-based tab/module selector primitive

Status: complete.

The module selector uses button controls, visible selected state, Alpine local selected-state feedback, and HTMX-backed server-rendered body swaps where server state is needed.

### 4. Expandable form/action/configuration panels

Status: complete.

Creation/import, profile/configuration, action, and advanced surfaces are grouped into collapsed expandable panels with Alpine-owned open/closed state.

### 5. Smart View scan-safe rewrite

Status: complete.

Smart View now provides a compact candidature list, central recruiter-call operational detail, one primary note interaction, right context modules, and no visible quick-action/form wall on first render.

### 6. Detailed View column controls

Status: complete.

Detailed View now provides a constrained candidature table/grid with rows as candidatures, core fields as columns, UI column visibility controls, explicit up/down column order controls, selected-row toolbox context, and a bounded human-facing LLM task queue.

### 7. Final hard UX contract/review pass

Status: complete.

The final review pass confirms Welcome, User, Smart, and Detailed views against the planning contract; updates stale status language; and leaves further changes for product-review follow-up unless a new blocker is found.

## Final readiness decision

```text
PRODUCT_READY_TO_REVIEW
```
