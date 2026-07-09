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
- Payload/state semantics.
- Major panel roles.
- Runtime separation.

## View tests

### Welcome View

Test cases:

```text
Welcome View renders for first-run/empty-state.
Welcome View exposes primary setup actions.
Welcome View does not expose noisy raw forms by default.
Welcome View provides navigation to User, Smart, and Detailed views where appropriate.
Welcome View in static demo mode does not expose private/write controls.
```

### User View

Test cases:

```text
User View renders profile/career/template/settings sections.
User View groups forms in expandable panels.
User View does not show operational candidature clutter by default.
User View write controls are disabled or absent in read-only mode.
User View private data is not present in static public demo mode.
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
Clicking/selecting a keyword renders the glossary definition while preserving selected candidature context.
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
Column visibility state can hide columns.
Column ordering state can reorder columns.
Rows can be searched or filtered by column values.
Selecting a row sets selected candidature context.
Detailed View is not a single-candidature detail page.
```

### Detailed View toolbox

Test cases:

```text
When no candidature is selected, left toolbox shows general configuration actions.
When a candidature is selected, left toolbox shows candidature-specific actions.
Candidature-specific actions include artifact/report generation actions where implemented or represented.
General actions include career path, strategy, personal data, CV fields, template config, view config, agent/task settings, and import/create candidature where implemented or represented.
```

### Detailed View task queue

Test cases:

```text
Detailed View right panel renders the LLM task queue.
Task queue shows pending tasks.
Task queue shows review-needed outputs where represented.
Task queue shows failed/deferred/recently completed groups where represented.
Task queue is human-facing dashboard state only.
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
Selected candidature has a durable selected-state marker.
Selected keyword has a durable selected-state marker.
```

## Suggested test organization

Possible files:

```text
tests/test_dashboard_views.py
tests/test_dashboard_modes.py
tests/test_dashboard_notes.py
tests/test_dashboard_detailed_view.py
tests/test_dashboard_runtime_boundaries.py
```

Keep tests small and contract-oriented.
