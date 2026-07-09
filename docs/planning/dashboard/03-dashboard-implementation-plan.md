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

The branch has a CI-green architectural base and a completed bounded shell/layout corrective slice, but it is not product-approved and is not technically complete for the required UX behavior.

The current source of truth for the missing UX behavior is:

```text
docs/planning/dashboard/10-dashboard-product-ux-correction.md
```

## Goals

- Preserve and clarify Welcome View, User View, Smart View, and Detailed View.
- Implement the dashboard as a constrained human workspace, not a vertically expanding document.
- Use a fixed/constrained shell with left, center, and right bounded panel regions.
- Use reusable dashboard module primitives instead of unrelated hand-built blocks.
- Use real button controls for actions and tab/module selection.
- Replace duplicated read/edit boxes with inline editable display sections.
- Convert notes into one primary directly editable note field per candidature.
- Hide input forms inside collapsed expandable panels.
- Implement Smart View as the default recruiter-call-oriented operational view.
- Implement Detailed View as the table/grid-oriented candidature management view.
- Add real column visibility and ordering controls for Detailed View.
- Add left-panel toolbox behavior for Detailed View.
- Add right-panel LLM task queue for Detailed View.
- Preserve keyword chip behavior and selected keyword context behavior.
- Preserve dashboard runtime as human-local only.
- Build or preserve a dashboard projection/view-model boundary consumed by the HTML dashboard.
- Avoid exposing this UI model or projection data as an agent API.
- Use existing assets for clean accessible light/dark themes.
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

Custom JavaScript is allowed only when Alpine, HTMX, native HTML, and CSS cannot express the needed dashboard primitive cleanly. The reason must be documented in the worker summary.

This is not a frontend framework migration. Do not introduce React, Vue, Angular, Svelte, a large UI kit, or drag/table libraries unless separately justified and explicitly accepted.

## Non-goals

- Do not implement a frontend SPA migration.
- Do not create a dashboard JSON API for agents.
- Do not expose dashboard actions in the agent runtime.
- Do not overbuild saved user-defined views in the first correction pass.
- Do not implement speculative modules before the base shell/module/tab primitives are stable.
- Do not rewrite storage architecture for the UX pass unless a minimal field is missing.
- Do not implement the future compatibility descriptor, host adapter, artifact lifecycle overhaul, or privacy-schema consolidation in this branch.
- Do not start static export migration while the human dashboard UX is still blocked.

## Compatibility amendment: UI projection boundary

A general architecture review confirms the dashboard direction but changes the implementation emphasis. The dashboard should be projection-first where practical.

This means the implementation should introduce or clarify a structured dashboard projection/view-model layer that prepares state for the four views before HTML rendering. The server-rendered dashboard should consume this projection data. Future embedded UI adapters may later consume similar projections without scraping dashboard HTML.

The projection layer should cover:

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

## Corrective implementation order

### 1. Dashboard shell and bounded three-panel layout

Status: completed as the first corrective slice on branch head `0551f5c9aaba740f31d4d7444c47221788ffdf35`.

The shell establishes a bounded dashboard container, left/center/right panel regions, and panel-local scroll ownership.

### 2. Reusable module primitive

Implement a reusable dashboard module primitive that can host editable dashboard content consistently across Welcome, User, Smart, and Detailed views.

Required behavior:

```text
module header
module title
module action area
real button controls
collapsed/expanded state where applicable
local body region
optional local scroll area
consistent selected/active/disabled states
HTMX-compatible body/action target where server refresh is needed
Alpine-required local expanded/collapsed state where the state is local
no custom JavaScript replacement for Alpine-equivalent local state
```

The module primitive should reduce repeated buttons, repeated content blocks, and inconsistent visual structure.

### 3. Button-based tab/module selector primitive

Implement a reusable control primitive for switching right-panel or module content.

Required behavior:

```text
buttons, not passive links
visible selected state
Alpine-required immediate selected-state feedback where the selected state is local
HTMX-backed server-rendered body swaps where needed
selected candidature context preserved across module switches
reusable for Smart right-panel context and other module groups
```

### 4. Expandable form/action/configuration panels

Move form walls and action clusters into consistent expandable panels using the module primitive.

Required behavior:

```text
creation/import panels closed by default
profile/config panels closed by default
action panels closed by default
advanced forms closed by default
expanded/collapsed state visible in markup and UI
Alpine-required local expanded/collapsed behavior where the state is local
no visible form walls at first render
```

### 5. Smart View scan-safe rewrite

Rebuild Smart View first-screen behavior using the shell, module primitive, and tab/module controls.

Requirements:

- Compact candidature list in the left panel.
- Selected candidature central detail constrained to recruiter-call operational detail.
- Primary note directly available without becoming a notes list.
- Right context selector available without overwhelming the screen.
- No quick-action/form wall on first render.
- No long descriptions, research blocks, or large artifact lists visible on first render.
- HTMX refreshes server-rendered context bodies where server state is needed.
- Alpine manages local selected/open state where the state is local.
- Do not hand-roll Alpine-equivalent local state.

### 6. Detailed View column controls

Implement table/grid-oriented management using the shell, module primitive, and control primitives.

Requirements:

- Central table/grid in constrained region.
- Core fields available as columns.
- Column visibility can be controlled through UI controls.
- Column ordering can be controlled through UI controls, at least with explicit up/down/order controls.
- Search/filter by column values.
- Selected row defines candidature context.
- Left toolbox changes based on selection.
- Right panel shows human-facing LLM task queue in a bounded region.

### 7. Inline edit and form policy

Replace separate read/edit blocks with inline edit affordances where supported.

Required behavior:

- Full local mode: edit controls available.
- Read-only mode: data visible, edit controls disabled or absent.
- Static demo mode: fake data only, no write/raw-intake controls.

Forms that must be hidden by default:

```text
Create candidature
Import source material
Raw intake
Profile edit
Career plan edit
Strategy edit
Template variable edit
CV fields edit
Agent/task config
Advanced view config
```

### 8. Theme and visual hierarchy pass

Use existing assets for visual continuity.

Requirements:

- Light theme.
- Dark theme.
- Accessible contrast.
- Visible focus states.
- Clear selected candidature state.
- Clear selected keyword state.
- Status/priority indicators not dependent only on color.
- Reduced information density on first render.
- Consistent module spacing and button hierarchy.

### 9. Test pass

Add durable tests for view contracts, runtime boundaries, mode behavior, and interactive dashboard primitives.

Do not test exact CSS or exact wording.

Tests may assert durable attributes, roles, button semantics, Alpine state attributes, HTMX targets, panel boundaries, and absence of uncontrolled form/content walls.

## Minimal JavaScript policy

The dashboard must use the accepted interaction stack instead of hand-rolling Alpine-equivalent behavior.

Use Alpine.js for local UI state:

```text
module collapsed/expanded state
selected tab/module state
dropdowns
local button-group state
local visibility toggles
```

Use HTMX where server-rendered dashboard state is the problem:

```text
fragment swaps
selected context refreshes
form submissions
module body refreshes
partial dashboard panel updates
```

Use small project-owned JavaScript only if Alpine, HTMX, native HTML, and CSS do not cover the specific primitive cleanly. Document the reason in the worker summary.

Avoid heavy dependencies and frontend frameworks for the MVP.

## Data model notes

The UX pass may require or clarify these fields:

```text
primary_note per candidature
priority
next_action
last_contact_at
deadline_at
source/channel
artifact state summary
keyword chips
selected/saved visible columns if persisted later
```

Do not add speculative tables unless needed.

If the current model stores notes as a list, introduce a primary note projection or field without deleting historical notes unless explicitly decided.

## Integration with runtime split

This work applies only to the dashboard runtime and its internal projection/view-model layer.

The agent runtime remains separate and capability-scoped.

Dashboard HTML may contain private IDs because it is human-local. Agent runtime must not receive internal IDs as mutation authority.

## Completion criteria

This work is complete when:

- Four views exist or are preserved: Welcome, User, Smart, Detailed.
- The dashboard uses a bounded shell with constrained left/center/right panel regions.
- Reusable modules exist with header, actions, body, and collapsed/expanded behavior.
- Tab/module controls are button-based and preserve selected context.
- Local open/closed/selected/visible state uses Alpine rather than custom Alpine-equivalent JavaScript.
- Smart View is usable as the default operational call view.
- Detailed View is a table/grid candidature management view with usable column visibility/order controls.
- Notes are a single primary directly editable field per candidature in full local mode.
- Forms are hidden by default in real expandable panels.
- Read-only and static demo modes preserve the correct restrictions.
- Light/dark theme behavior exists using existing assets.
- Tests cover durable UX contracts, including shell, module, tab/control, projection, and view-state semantics.
- No dashboard route/action is added to the agent runtime.
- No projection output is exposed as a broad agent-facing API.
