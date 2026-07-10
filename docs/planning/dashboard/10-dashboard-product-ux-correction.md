# Dashboard Product UX Correction

## Status

```text
BLOCKED_BY_UX_REGRESSION
```

The previous `PRODUCT_READY_TO_REVIEW` status was premature. The dashboard templates loaded `/static/alpine.min.js`, but that runtime asset was missing, so Alpine-owned local state did not execute in the browser. That made module toggles, expandable panels, Smart context state, and Detailed View column visibility/order controls inert despite CI passing markup-level contract tests.

This file now records the actual state after the regression fix pass:

```text
1. Bounded dashboard shell and left/center/right panel regions: implemented.
2. Reusable dashboard module primitive: implemented.
3. Button-based module selector primitive: implemented.
4. Expandable form/action/configuration panels: implemented.
5. Smart View scan-safe first screen: implemented.
6. Detailed View column visibility/order controls: implemented.
7. Alpine runtime asset missing: fixed by adding a local dashboard runtime asset.
8. Detailed View row selection hidden when Company column was hidden: fixed with a stable row selector column.
9. Browser-level UX still needs human verification before product-ready status is restored.
```

## Regression summary

The blocking issue was not in projection data. It was in the client interaction layer:

```text
/static/alpine.min.js was referenced by dashboard.html
/static/alpine.min.js did not exist in aaaat/static
all x-data / x-show / @click / x-bind behavior was inert
controls appeared in markup but did not work in the browser
x-cloak bodies could remain hidden forever without an Alpine-compatible runtime
```

The Detailed View also had a usability defect:

```text
row selection was only reachable through the Company cell
hiding the Company column could remove the row-selection affordance
```

The fix adds a stable Select column outside the configurable data-column set so selection remains available even when data columns are hidden or reordered.

## Required acceptance before product-ready status

Do not restore `PRODUCT_READY_TO_REVIEW` until a browser-level check confirms:

```text
module Collapse/Expand buttons open and close panels
expandable form/config/action panels open and close
Smart View right context buttons visibly update selected state and preserve selected candidature
Detailed View column checkboxes hide/show table columns
Detailed View Up/Down buttons reorder table columns
Detailed View row Select links preserve selected-row/toolbox context
x-cloak content becomes available after the runtime initializes
HTMX fragment swaps still initialize local dashboard state after replacement
```

## Accepted dashboard interaction stack

The accepted stack remains:

```text
Jinja for server-rendered structure
existing HTMX for server-rendered partial updates and button-triggered fragment swaps
Alpine.js as the required mechanism for dashboard-local interaction state where Alpine can express the behavior
project-owned CSS for layout, density, visual hierarchy, and themes
small project-owned JavaScript only where Alpine/HTMX/native HTML cannot express the specific primitive cleanly
```

The current local runtime asset is a corrective stopgap to make the existing Alpine-style directives execute in the local dashboard. It should be reviewed against the accepted stack. If strict third-party Alpine is required, replace this stopgap with a vendored official Alpine distribution before restoring product-ready status.

## Corrected product requirements

The intended dashboard requirements remain unchanged:

```text
bounded dashboard shell
left/center/right panel regions for operational views
reusable dashboard module primitive
button-based module selector primitive
collapsed expandable panels for forms/actions/configuration
Welcome View first-run/onboarding/orientation behavior
User View profile/settings/control-center behavior
Smart View scan-safe recruiter-call behavior
Detailed View constrained candidature table/grid behavior
usable Detailed View column visibility controls
usable Detailed View explicit column order controls
selected row drives Detailed View toolbox context
right task queue remains bounded and human-facing
runtime boundaries remain separate from agent runtime and MCP descriptors
no SPA/table/grid/drag/UI-kit dependency
```

## Runtime boundary reminder

All dashboard UX correction work remains human-local dashboard work. The projection layer remains internal to dashboard rendering and testing. It must not become an agent API, MCP resource, or broad HTTP dashboard contract.

## Current branch classification

```text
BLOCKED_BY_UX_REGRESSION
```
