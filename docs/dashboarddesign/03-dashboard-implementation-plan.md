# Dashboard Implementation Plan

## Branching

Create a dedicated worker branch:

```text
codex/runtime-split-dashboard-ux
```

Target integration branch:

```text
codex/runtime-split-agent-dashboard
```

This work should be coordinated with the dashboard runtime cleanup but must not weaken the agent/dashboard runtime split.

## Work package name

```text
Dashboard four-view UX replacement
```

## Goals

- Preserve and clarify Welcome View, User View, Smart View, and Detailed View.
- Replace duplicated read/edit boxes with inline editable display sections.
- Convert notes into one primary directly editable note field per candidature.
- Hide input forms inside collapsed expandable panels.
- Implement Smart View as the default recruiter-call-oriented operational view.
- Implement Detailed View as the table/grid-oriented candidature management view.
- Add left-panel toolbox behavior for Detailed View.
- Add right-panel LLM task queue for Detailed View.
- Preserve keyword chip behavior and selected keyword context behavior.
- Preserve dashboard runtime as human-local only.
- Avoid exposing this UI model as agent API.
- Use existing assets for clean accessible light/dark themes.
- Avoid heavy frontend dependencies.

## Non-goals

- Do not implement a frontend framework migration unless required.
- Do not create a dashboard JSON API for agents.
- Do not expose dashboard actions in the agent runtime.
- Do not overbuild saved user-defined views in the first pass.
- Do not implement speculative modules before the base view model is stable.
- Do not rewrite storage architecture for the UX pass unless a minimal field is missing.

## Proposed implementation order

### 1. Define dashboard view-state model

Model the state required by the four views.

Suggested state fields:

```text
current_view: welcome | user | smart | detailed
selected_candidature_ref
selected_right_panel_module
selected_keyword
selected_table_columns
table_column_order
table_filters
table_search
selected_toolbox_action
expanded_panels
theme
```

This state can initially be held in server-rendered query params, form fields, local storage, or minimal JavaScript state depending on current implementation.

Do not create unnecessary persistence until required.

### 2. Refactor dashboard payload shape

The dashboard payload should provide separate structures for the four views without duplicating business logic.

Suggested payload sections:

```text
mode
view_state
welcome
user
smart
detailed
glossary
tasks
theme/assets
permissions
```

Suggested Smart View payload:

```text
candidature_summaries
selected_candidature_detail
selected_context_module
selected_keyword_definition
primary_note
artifact_summary
```

Suggested Detailed View payload:

```text
rows
available_columns
visible_columns
column_order
filters
selected_row
selected_toolbox_actions
general_toolbox_actions
task_queue_summary
```

Suggested User View payload:

```text
personal_data_summary
career_plan_summary
strategy_summary
cv_fields_summary
template_variables_summary
preferences_summary
agent_task_settings_summary
expanded_panels
```

Suggested Welcome View payload:

```text
setup_state
primary_actions
empty_state_summary
onboarding_panels
```

### 3. Preserve/create Welcome View

Implement or preserve a clean first-run/empty-state view.

Requirements:

- Short local-first orientation.
- Clear primary actions.
- No noisy forms visible by default.
- Expandable panels for setup.
- Navigation to User View, Smart View, and Detailed View.

### 4. Preserve/create User View

Implement or preserve a dedicated control center for user/profile/settings.

Requirements:

- Personal data.
- Career path.
- Strategy.
- CV fields.
- Profile variables.
- Template variables.
- Preferences.
- Theme/accessibility settings if represented.
- Agent/task configuration where appropriate.
- Forms grouped in expandable panels.

### 5. Rebuild Smart View

Implement the default operational dashboard view.

Requirements:

- Left panel expanded initially.
- Compact candidature list.
- Selected candidature expands central detail.
- Right panel context selector.
- Always-editable primary note in full local mode.
- Keyword chip behavior.
- No duplicated read/edit boxes.
- Input forms hidden by default.

### 6. Rebuild Detailed View

Implement table/grid-oriented management.

Requirements:

- Central table with candidatures as rows.
- All core fields available as columns.
- Column visibility and ordering state.
- Search/filter by column values.
- Selected row defines current candidature.
- Left toolbox changes based on selection.
- Right panel shows LLM task queue.

### 7. Inline edit and form policy

Replace separate read/edit blocks with inline edit affordances.

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

### 8. Theme and assets pass

Use existing assets for visual continuity.

Requirements:

- Light theme.
- Dark theme.
- Accessible contrast.
- Visible focus states.
- Clear selected candidature state.
- Clear selected keyword state.
- Status/priority indicators not dependent only on color.

### 9. Test pass

Add durable tests for view contracts, runtime boundaries, and mode behavior.

Do not test exact CSS or exact wording.

## Minimal JavaScript policy

Use JavaScript only where it directly supports the UX:

```text
Panel toggles
Inline edit affordances
Column visibility
Column reordering
Search/filter
Selection state
Theme toggle if represented client-side
```

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

This work applies only to the dashboard runtime.

The agent runtime remains separate and capability-scoped.

Dashboard HTML may contain private IDs because it is human-local. Agent runtime must not receive internal IDs as mutation authority.

## Completion criteria

This work is complete when:

- Four views exist or are preserved: Welcome, User, Smart, Detailed.
- Smart View is usable as the default operational call view.
- Detailed View is a table/grid candidature management view.
- Notes are a single primary directly editable field per candidature in full local mode.
- Forms are hidden by default.
- Read-only and static demo modes preserve the correct restrictions.
- Light/dark theme behavior exists using existing assets.
- Tests cover durable UX contracts.
- No dashboard route/action is added to the agent runtime.
