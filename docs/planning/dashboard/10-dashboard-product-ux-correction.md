# Dashboard Product UX Correction

## Status

```text
BLOCKED_REPLAN_REQUIRED
```

The dashboard branch is technically integrated and CI-green, but the current dashboard implementation is not product-approved.

The previous integration result must not be interpreted as UX completion. Existing tests prove projection data, route boundaries, and selected DOM hooks. They do not prove that the dashboard is usable as a constrained human workspace during recruiter calls or candidature management.

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
tab/module controls are buttons with selected state
switching a Smart context module preserves selected candidature context
forms/action panels are collapsed by default
Smart initial render is scan-safe and excludes long content/form walls
Detailed View exposes column visibility controls
Detailed View exposes column order controls or explicit ordering controls
Detailed View table is in a constrained grid region
Detailed View toolbox changes between general and selected-row states
runtime boundary still prevents dashboard projection/routes/actions from entering agent runtime
```

Tests should still avoid brittle exact CSS snapshots. They may assert durable layout attributes, roles, state attributes, button semantics, region boundaries, and absence of uncontrolled form/content walls.

## Corrective implementation order

The next implementation should not start by adding more data to the projection. It should first establish usable dashboard primitives.

Recommended order:

```text
1. Dashboard shell and bounded three-panel layout
2. Reusable module primitive with collapsed/expanded behavior
3. Button-based tab/module control primitive
4. Expandable form/action/configuration panels
5. Smart View scan-safe first-screen rewrite using primitives
6. Detailed View column visibility/order controls using primitives
7. Hard UX contract tests for layout, modules, tabs, panels, and table controls
```

## Non-goals for the correction pass

```text
no static export migration
no agent runtime changes
no MCP descriptor changes
no provider integration
no frontend framework migration
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
forms/actions/configuration are closed by default
Smart View is scan-safe on first render
Detailed View has usable column visibility/order controls
hard UX contract tests pass
agent/runtime boundaries remain intact
```
