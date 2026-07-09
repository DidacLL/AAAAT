# Dashboard Test Plan

## Testing philosophy

Tests should verify durable UX contracts and runtime boundaries.

Do not test:

- Exact CSS.
- Exact wording.
- Exact fake company names.
- Temporary DOM structure unless it represents a durable contract.
- Implementation details of a specific JavaScript approach.

Prefer tests that verify:

- View availability.
- Mode restrictions.
- Presence/absence of write controls.
- Projection/view-state semantics.
- Major panel roles.
- Bounded shell and panel-local scroll ownership.
- Reusable module structure.
- Button-based tab/module semantics.
- Alpine-backed local state attributes where Alpine is used.
- HTMX targets/swaps where server-rendered partial updates are used.
- Runtime separation.

## Accepted interaction-stack test policy

The dashboard accepted interaction stack is:

```text
Jinja
existing HTMX
Alpine.js
project-owned CSS
small project-owned JavaScript only where needed
```

Tests may assert durable Alpine/HTMX contracts when those attributes define required product behavior.

Examples:

```text
x-data exists on reusable local-state components where Alpine owns module/tab/panel state
x-show / x-bind / @click or equivalent Alpine markers exist where collapsed/selected behavior is local
hx-get / hx-post / hx-target / hx-swap exist where server-rendered fragments or actions are expected
button elements are used for actions and tab/module controls
aria-selected / aria-expanded / data-selected or equivalent durable state markers are present
```

Do not assert exact Alpine expression strings unless the expression itself is the durable behavior contract.

## Projection/view-state tests

Test cases:

```text
Dashboard projection can be built without rendering HTML templates.
Projection includes current view state: welcome, user, smart, or detailed.
Projection includes permissions for full local, read-only, and static demo modes.
Projection includes Welcome View setup state and primary actions.
Projection includes User View profile/career/template/settings summaries without exposing operational candidature clutter by default.
Projection includes Smart View compact candidature summaries.
Projection includes selected candidature detail when a candidature is selected.
Projection includes one primary note state per selected candidature.
Projection includes selected keyword/glossary context without losing selected candidature context.
Projection includes Detailed View rows and available/visible column state.
Projection includes Detailed View toolbox actions based on selected-row state.
Projection includes human-facing task queue summary for Detailed View.
Projection is not exposed through the agent runtime as a broad dashboard payload.
```

These tests should target durable state semantics, not exact class names, CSS layout, or full rendered markup.

## Layout shell tests

Test cases:

```text
Dashboard renders a bounded shell/container.
Operational views expose left, center, and right bounded panel regions.
Dashboard content is not modeled as uncontrolled full-page vertical document growth.
Panel-local scroll containers exist where overflow is expected.
Detailed table/grid overflow is owned by the table/grid region, not the full page.
Selected candidature and current view markers remain visible inside the bounded shell.
Agent runtime does not expose dashboard shell, dashboard assets, dashboard fragments, dashboard actions, or dashboard projection.
```

## Reusable module primitive tests

Test cases:

```text
Dashboard module primitive exposes a durable module boundary.
Module exposes a header.
Module exposes a title.
Module exposes an action area.
Module actions are real buttons where they trigger UI behavior.
Module exposes a body region.
Module can represent collapsed and expanded state.
Module can declare a local scroll body where overflow is expected.
Alpine-backed module state exists where expansion/collapse is local.
HTMX-compatible module targets exist where server-rendered refresh is expected.
Reusable module markup is shared or consistently applied across Welcome/User/Smart/Detailed surfaces where practical.
```

## Tab/module control tests

Test cases:

```text
Tab/module selectors use button elements, not passive links, for UI selection.
Selected tab/module state is visible through durable attributes.
Alpine-backed selected state exists where immediate local feedback is expected.
HTMX targets/swaps exist where selected module content is server-rendered.
Switching a Smart context module preserves selected candidature context.
Right-panel module body can change without removing central selected-candidature detail.
```

## View tests

### Welcome View

Test cases:

```text
Welcome View renders for first-run/empty-state.
Welcome View exposes primary setup actions.
Welcome View does not expose noisy raw forms by default.
Welcome View provides navigation to User, Smart, and Detailed views where appropriate.
Welcome View in static demo mode does not expose private/write controls.
Welcome View uses reusable modules/panels where setup content is expandable.
```

### User View

Test cases:

```text
User View renders profile/career/template/settings sections.
User View groups forms in expandable panels.
User View does not show operational candidature clutter by default.
User View write controls are disabled or absent in read-only mode.
User View private data is not present in static public demo mode.
User View uses module/panel primitives for profile, career, template, and settings sections.
```

### Smart View

Test cases:

```text
Smart View renders as the default operational view after setup.
Smart View starts with the left candidature panel expanded.
Smart View candidature list contains compact identifying fields.
Smart View candidature list avoids long detail fields in the primary list.
Selecting a candidature renders central selected-candidature detail.
Selected candidature remains visible when switching right-panel modules.
Right panel exposes context modules: Notes, Keywords, Artifacts, Call card, Company research, Form answers, Agent suggestions.
Right panel context modules are selected through real button/module controls.
Clicking/selecting a keyword renders the glossary definition while preserving selected candidature context.
Smart initial render is scan-safe and excludes long content walls and visible form walls.
```

### Notes

Test cases:

```text
Each candidature exposes one primary note field in Smart View.
Primary note is directly editable in full local mode.
Primary note is visible but not editable in read-only mode.
Static demo mode never exposes real private notes.
The primary note is not rendered as a list of notes in the main interaction.
```

### Detailed View

Test cases:

```text
Detailed View renders a candidature table/grid.
Candidatures are rows.
Core candidature fields are available as columns.
Column visibility controls exist in the UI.
Column visibility state can hide columns.
Column ordering controls exist in the UI.
Column ordering state can reorder columns.
Rows can be searched or filtered by column values.
Selecting a row sets selected candidature context.
Detailed View is not a single-candidature detail page.
Detailed table/grid lives in a constrained central region.
```

### Detailed View toolbox

Test cases:

```text
When no candidature is selected, left toolbox shows general configuration actions.
When a candidature is selected, left toolbox shows candidature-specific actions.
Candidature-specific actions include artifact/report generation actions where implemented or represented.
General actions include career path, strategy, personal data, CV fields, template config, view config, agent/task settings, and import/create candidature where implemented or represented.
Toolbox action groups use module/panel primitives and real buttons.
```

### Detailed View task queue

Test cases:

```text
Detailed View right panel renders the LLM task queue.
Task queue shows pending tasks.
Task queue shows review-needed outputs where represented.
Task queue shows failed/deferred/recently completed groups where represented.
Task queue is human-facing dashboard state only.
Task queue is bounded inside the right panel and does not grow the full page.
```

## Mode tests

### Full local mode

```text
Full local mode allows inline editing where supported.
Full local mode allows primary note editing.
Full local mode may expose raw intake/create/import controls, but only inside collapsed expandable panels by default.
```

### Read-only mode

```text
Read-only mode preserves data visibility.
Read-only mode disables or removes write controls.
Read-only mode disables primary note editing.
Read-only mode does not show active raw intake/write form controls.
```

### Static demo mode

```text
Static demo mode uses fake demo data.
Static demo mode excludes raw intake controls.
Static demo mode excludes write controls.
Static demo mode contains no real private data.
Static demo mode can demonstrate Welcome, Smart, Detailed, and keyword behavior with fake data.
```

## Runtime boundary tests

```text
Dashboard app renders dashboard HTML.
Dashboard app can perform required human-local workflows.
Agent app does not mount dashboard HTML.
Agent app does not mount static dashboard assets.
Agent app does not expose dashboard form actions.
Agent app does not expose dashboard fragments.
Agent app does not expose dashboard projection.
Agent app does not expose broad candidature/profile CRUD because of dashboard needs.
Dashboard UX changes do not add entity-ID mutation authority to the agent runtime.
```

## Accessibility/theme tests

Where practical and not brittle:

```text
Light theme can be selected or rendered.
Dark theme can be selected or rendered.
Theme uses existing assets where represented.
Interactive controls have labels or accessible names.
Expandable panels expose expanded/collapsed state where practical.
Tab/module controls expose selected state where practical.
Selected candidature has a durable selected-state marker.
Selected keyword has a durable selected-state marker.
Status/priority indicators are not dependent only on color.
```

## Suggested test organization

Possible files:

```text
tests/test_dashboard_projection.py
tests/test_dashboard_layout_contract.py
tests/test_dashboard_modules.py
tests/test_dashboard_tabs.py
tests/test_dashboard_views.py
tests/test_dashboard_modes.py
tests/test_dashboard_notes.py
tests/test_dashboard_detailed_view.py
tests/test_dashboard_runtime_boundaries.py
```

Keep tests small and contract-oriented.
