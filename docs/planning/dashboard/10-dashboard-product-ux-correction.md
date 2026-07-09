# Dashboard Product UX Correction

## Status

```text
BLOCKED_REPLAN_REQUIRED
```

The dashboard branch is CI-green and points in the intended architectural direction, but the current dashboard implementation is not technically complete for the required UX behavior and is not product-approved.

The previous integration result must not be interpreted as UX completion or as a technically correct implementation of the requested views and interactions. Existing tests prove projection data, route boundaries, and selected DOM hooks. They do not prove that the required dashboard behaviors, controls, panels, modules, or view interactions have been implemented correctly.

The first corrective slice established a bounded dashboard shell/layout contract. The next corrective work should build reusable dashboard interaction primitives on top of that shell.

## Product-owner rejection summary

The current dashboard fails the intended UX because it still behaves too much like a vertically expanding document with many visible information blocks, not a bounded dashboard.

Rejected behavior includes:

```text
uncontrolled vertical page growth
too much information visible at first sight
panels not behaving as real expandable dashboard panels
buttons rendered as links or passive text where action buttons are required
context tabs/modules not behaving as real tab controls
modules not reusable across views
Detailed View lacking usable column hide/show/move controls
forms/actions/configuration not consistently hidden in real collapsed panels
insufficient hard UX tests
```

## Accepted dashboard interaction stack

The dashboard remains server-rendered, local-first, and provider-independent. The correction pass should not attempt a SPA rewrite, but it should also not hand-roll dynamic behavior that the accepted dashboard stack already covers.

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
HTMX owns server interactions: fragment swaps, selected context refreshes, form submissions, server-rendered module bodies.
Alpine.js owns local UI state: expanded/collapsed modules, selected tab/module state, dropdowns, button groups, local visibility toggles.
Jinja owns durable structure and initial render.
CSS owns bounded layout, panel sizing, visual hierarchy, and density.
```

Alpine.js is not merely permitted. For local dashboard interaction state, do not hand-roll custom JavaScript or duplicate local open/closed/selected/visible state in templates when Alpine can express the behavior directly.

Use Alpine directly for local dashboard state:

```text
x-data for component-local state
x-show or equivalent Alpine binding for collapsed/expanded visibility
@click or equivalent Alpine event binding for local toggles
x-bind / :aria-expanded / :aria-selected for accessibility and state markers
class/data-state bindings for selected, active, disabled, collapsed, and expanded states
```

Use HTMX only where the behavior requires server-rendered state or server-side action handling:

```text
hx-get / hx-post for server requests
hx-target for fragment targets
hx-swap for server-rendered body replacement
```

Custom JavaScript is allowed only when Alpine, HTMX, native HTML, and CSS cannot express the needed dashboard primitive cleanly. The worker must document the reason before or in the completion summary.

Do not introduce React, Vue, Angular, Svelte, a large UI kit, or drag/table libraries in this correction pass unless separately justified and explicitly accepted.

## Corrected product requirements

### 1. Dashboard layout primitives

The dashboard must define real layout primitives rather than relying on an unconstrained document flow.

Required behavior:

```text
fixed dashboard shell
constrained viewport
left/center/right panel regions
bounded panel dimensions
no uncontrolled full-page vertical scroll
panel-local scrolling only where needed
clear selected candidature state
clear current view state
```

Failure condition:

```text
The page grows vertically as more modules, forms, rows, or details render.
```

### 2. Reusable module primitive

The dashboard needs a reusable module/card primitive used consistently across Welcome, User, Smart, and Detailed views.

Required behavior:

```text
module header
module title
module action area
button controls
collapsed/expanded state where applicable
local body region
optional local scroll area
consistent selected/active/disabled states
HTMX-compatible body/action targets where server refresh is needed
Alpine-required local expanded/collapsed state where the state is local
no custom JavaScript replacement for Alpine-equivalent local state
```

Failure condition:

```text
Each view hand-builds unrelated blocks with inconsistent behavior, controls, and overflow.
```

### 3. Real tab/module controls

Context selection must use real controls, not passive navigation links that merely reload or scroll the page.

Required behavior:

```text
button-based tab/module controls
visible selected state
module body swaps without losing selected candidature
right-panel context can change while central selected candidature remains visible
controls are reusable for Smart right-panel modules and other module groups
Alpine-required local selected-state feedback where the selected state is local
HTMX swaps for server-rendered module bodies where needed
```

Failure condition:

```text
Tabs appear as links, do not expose selected state, or do not behave as a reusable module selector.
```

### 4. Actual expandable panels

Expandable panels must be real collapsed dashboard controls, not merely content placed lower in a long document.

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

Failure condition:

```text
Forms, configuration areas, or action bodies are visible by default or cause the screen to become a long form document.
```

### 5. Detailed View controls

Detailed View must be a usable table/grid management surface, not only a rendered table.

Required behavior:

```text
table/grid in constrained central region
columns can be marked visible/hidden through UI controls
column order can be controlled through UI controls, or at minimum through explicit up/down/order controls
selected row drives toolbox context
left toolbox shows general actions when no row is selected
left toolbox shows candidature-specific actions when a row is selected
right panel shows human-facing task queue in a bounded region
no full vertical document editor behavior
```

Failure condition:

```text
Column visibility/order exists only in projection state or tests but not as usable dashboard controls.
```

### 6. Smart View first screen

Smart View must be scan-safe and usable during recruiter calls.

Required behavior:

```text
compact left candidature list visible on entry
central selected candidature summary constrained to operational call details
primary note directly available without turning into a notes list
right context module selector available without overwhelming the screen
no visible quick-action/form wall
no long descriptions, research blocks, or large artifact lists visible on first screen
```

Failure condition:

```text
The first screen presents too many modules, large text blocks, forms, or vertical sections to be useful during a call.
```

## Corrected acceptance tests

Existing data-hook tests are not enough. The test plan must include hard UX contracts that verify structure and behavior.

Required test coverage:

```text
layout shell has bounded dashboard regions
left/center/right panels exist for operational views
full page does not become the primary scroll container for dashboard content
panel-local scroll regions exist where overflow is expected
modules expose collapsed/expanded state
modules expose header, title, action area, body, and optional local scroll region
tab/module controls are buttons with selected state
Alpine state attributes exist for local expanded/selected behavior where local state exists
HTMX attributes exist for server-rendered swaps where used
switching a Smart context module preserves selected candidature context
forms/action panels are collapsed by default
Smart initial render is scan-safe and excludes long content/form walls
Detailed View exposes column visibility controls
Detailed View exposes column order controls or explicit ordering controls
Detailed View table is in a constrained grid region
Detailed View toolbox changes between general and selected-row states
runtime boundary still prevents dashboard projection/routes/actions from entering agent runtime
```

Tests should still avoid brittle exact CSS snapshots. They may assert durable layout attributes, roles, state attributes, button semantics, region boundaries, Alpine/HTMX interaction attributes, and absence of uncontrolled form/content walls.

## Corrective implementation order

The next implementation should build on the bounded shell/layout baseline and establish reusable dashboard primitives before rewriting Smart or Detailed content.

Recommended order:

```text
1. Dashboard shell and bounded three-panel layout. DONE as first corrective slice.
2. Reusable module primitive with Alpine-required collapsed/expanded behavior for local state and HTMX-compatible action/body targets.
3. Button-based tab/module control primitive using Alpine for local selected state and HTMX for server-rendered body swaps where needed.
4. Expandable form/action/configuration panels using the module primitive.
5. Smart View scan-safe first-screen rewrite using shell, modules, and tab controls.
6. Detailed View column visibility/order controls using shell, modules, and tab/control primitives.
7. Hard UX contract tests for layout, modules, tabs, panels, Smart, and Detailed.
```

## Non-goals for the correction pass

```text
no static export migration
no agent runtime changes
no MCP descriptor changes
no provider integration
no SPA/frontend framework migration
no large UI kit migration
no broad schema rewrite
no additional speculative application features
```

## Runtime boundary reminder

All dashboard UX correction work remains human-local dashboard work. The projection layer remains internal to dashboard rendering and testing. It must not become an agent API, MCP resource, or broad HTTP dashboard contract.

## Completion criteria

The UX correction is complete only when:

```text
the dashboard uses a bounded shell layout
operational views use constrained left/center/right panels
modules are reusable and expandable where needed
tab/module controls are real buttons with selected state
HTMX and Alpine are used according to their required responsibilities
forms/actions/configuration are closed by default
Smart View is scan-safe on first render
Detailed View has usable column visibility/order controls
hard UX contract tests pass
agent/runtime boundaries remain intact
```
