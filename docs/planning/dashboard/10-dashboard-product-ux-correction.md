# Dashboard Product UX Correction

## Status

```text
PRODUCT_READY_TO_REVIEW
```

The dashboard branch is CI-green, preserves the intended runtime boundaries, and now implements the planned corrective UX baseline through the final hard UX contract pass.

The previous `BLOCKED_REPLAN_REQUIRED` status applied while the dashboard lacked reusable interaction primitives, scan-safe Smart View behavior, and usable Detailed View column controls. That corrective work has now been completed and covered by hard UX contract tests.

This status means the branch is ready for product review. It does not mean the PR has been product-approved or merged.

## Final reviewed baseline

The completed corrective baseline is:

```text
1. Bounded dashboard shell and left/center/right panel regions: done.
2. Reusable dashboard module primitive: done.
3. Button-based module selector primitive: done.
4. Expandable form/action/configuration panels: done.
5. Smart View scan-safe first screen: done.
6. Detailed View column visibility/order controls: done.
7. Final hard UX contract/review pass across Welcome, User, Smart, and Detailed: done.
```

## Historical product-owner rejection summary

The prior implementation was rejected because it behaved too much like a vertically expanding document with many visible information blocks, not a bounded dashboard.

Rejected behavior included:

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

The current implementation addresses those rejection points through the bounded shell, module primitive, module selector primitive, expandable panels, Smart View first-screen rewrite, Detailed View table controls, and dashboard UX contract tests.

## Accepted dashboard interaction stack

The dashboard remains server-rendered, local-first, and provider-independent. The correction pass did not introduce a SPA framework or table/grid library.

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

Custom JavaScript remains allowed only when Alpine, HTMX, native HTML, and CSS cannot express the needed dashboard primitive cleanly. No custom JavaScript was required for the corrective baseline.

Do not introduce React, Vue, Angular, Svelte, a large UI kit, drag libraries, table/grid libraries, or new frontend build tooling for this dashboard UX line.

## Corrected product requirements

### 1. Dashboard layout primitives

The dashboard defines real layout primitives rather than relying on unconstrained document flow.

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

The dashboard uses a reusable module/card primitive across Welcome, User, Smart, and Detailed views where practical.

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

Context selection uses real controls rather than passive navigation text.

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

Expandable panels are real collapsed dashboard controls, not merely content placed lower in a long document.

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

### 5. Smart View first screen

Smart View is scan-safe and usable during recruiter calls.

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

### 6. Detailed View controls

Detailed View is a usable table/grid management surface, not only a rendered table.

Required behavior:

```text
table/grid in constrained central region
candidatures render as rows
core fields are available as columns
columns can be marked visible/hidden through UI controls
column order can be controlled through explicit up/down/order controls
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

## Final hard UX acceptance checks

The final pass validates:

```text
Welcome View shows first-run/onboarding/orientation state, clear primary actions, and no visible raw-intake/form wall.
User View is a profile/career/template/settings/control-center surface, not candidature operations.
Smart View is scan-safe for recruiter calls, with compact candidature list, central operational detail, one primary note, and right module selector.
Detailed View is a constrained candidature table/grid management surface with usable column visibility/order controls.
Forms/action/configuration surfaces are collapsed by default.
Alpine owns local open/closed/selected/visible state where local state is used.
HTMX remains limited to server-rendered fragment/form/action paths.
No custom Alpine-equivalent JavaScript was added.
No SPA/table/grid/drag/UI-kit dependency was added.
Runtime boundaries remain intact.
```

## Corrected acceptance tests

Hard UX contract tests now cover:

```text
layout shell has bounded dashboard regions
left/center/right panels exist for operational views
full page does not become the primary scroll container for dashboard content
panel-local scroll regions exist where overflow is expected
modules expose collapsed/expanded state
modules expose header, title, action area, body, and optional local scroll region
tab/module controls are buttons with selected state
Alpine state attributes exist for local expanded/selected/visible behavior where local state exists
HTMX attributes exist for server-rendered swaps where used
switching a Smart context module preserves selected candidature context
forms/action panels are collapsed by default
Welcome View first-run/orientation behavior
User View control-center behavior and read-only/static mode behavior
Smart initial render scan-safety and absence of long content/form walls
Detailed View column visibility controls
Detailed View column order controls and explicit up/down controls
Detailed View table in a constrained grid region
Detailed View toolbox changes between general and selected-row states
right task queue remains bounded and human-facing
runtime boundary still prevents dashboard projection/routes/actions/assets from entering agent runtime
forbidden frontend/table/drag dependencies are absent
```

Tests should continue to avoid brittle exact CSS snapshots. They may assert durable layout attributes, roles, state attributes, button semantics, region boundaries, Alpine/HTMX interaction attributes, and absence of uncontrolled form/content walls.

## Corrective implementation order

Corrective implementation order and status:

```text
1. Dashboard shell and bounded three-panel layout. DONE.
2. Reusable module primitive with Alpine-required collapsed/expanded behavior for local state and HTMX-compatible action/body targets. DONE.
3. Button-based tab/module control primitive using Alpine for local selected state and HTMX for server-rendered body swaps where needed. DONE.
4. Expandable form/action/configuration panels using the module primitive. DONE.
5. Smart View scan-safe first-screen rewrite using shell, modules, and tab controls. DONE.
6. Detailed View column visibility/order controls using shell, modules, and tab/control primitives. DONE.
7. Hard UX contract/review pass for layout, modules, tabs, panels, Welcome, User, Smart, and Detailed. DONE.
```

## Non-goals for the correction pass

```text
no static export migration
no agent runtime changes
no MCP descriptor changes
no provider integration
no SPA/frontend framework migration
no large UI kit migration
no table/grid library migration
no drag-and-drop dependency
no broad schema rewrite
no additional speculative application features
```

## Runtime boundary reminder

All dashboard UX correction work remains human-local dashboard work. The projection layer remains internal to dashboard rendering and testing. It must not become an agent API, MCP resource, or broad HTTP dashboard contract.

## Completion criteria

The UX correction baseline is complete when:

```text
the dashboard uses a bounded shell layout
operational views use constrained left/center/right panels
modules are reusable and expandable where needed
tab/module controls are real buttons with selected state
HTMX and Alpine are used according to their required responsibilities
forms/actions/configuration are closed by default
Welcome View satisfies first-run/orientation behavior
User View satisfies profile/settings/control-center behavior
Smart View is scan-safe on first render
Detailed View has usable column visibility/order controls
hard UX contract tests pass
agent/runtime boundaries remain intact
CI and Agent Contract Tests are green
```

Current branch classification after the final hard UX review:

```text
PRODUCT_READY_TO_REVIEW
```
