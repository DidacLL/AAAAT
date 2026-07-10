# Local Desktop Dashboard Implementation Plan

Branch: `didacll/local-desktop-dashboard`
Base: `main`

Status: planning baseline for a complete dashboard replacement.

## Decision

Discard the current browser/dashboard UI direction for this branch.

This branch should not try to rescue the previous Jinja/HTMX/Alpine dashboard implementation. The previous work produced useful requirements and failure evidence, but the UI substrate is not the target product. AAAAT needs a readable local desktop application, not a browser dashboard, not a web app, not a webview shell, and not a terminal/TUI application.

The recommended implementation path is a native desktop UI built with `wxPython`, using `wx.aui` for dockable/resizable dashboard regions where it provides value.

## Why start from `main`

Start from `main` to avoid inheriting browser-dashboard implementation debt:

- no template/refactor coupling from the discarded UI;
- no Alpine/HTMX/static-asset local-state dependency;
- no pressure to preserve broken browser interaction behavior;
- lower risk of confusing human dashboard code with agent runtime code;
- cleaner review surface for a new desktop UI adapter.

Only keep the product contracts and stable backend concepts:

- local-first SQLite storage;
- bounded agent/runtime separation;
- candidature/task/artifact/profile/keyword domain behavior;
- local artifact rendering;
- static fake-demo safety requirements where still relevant;
- dashboard projection/view-model concept, but as an internal UI adapter boundary.

## Product target

AAAAT should provide a local desktop workspace for managing job applications and preparing recruiter interactions.

The dashboard must support four human-facing modes:

- Welcome View: onboarding, empty state, setup entry points.
- Smart View: fast operational recruiter-call support.
- Detailed View: table/grid candidature management.
- User View: user-configured profile, career, template, settings, and workspace controls.

The UI must be easy to read and use by non-developers. It must not require command-line interaction after installation/launch.

## Recommended stack

Use `wxPython` for the local desktop UI.

Expected primitives:

- `wx.Frame` for the main desktop window;
- `wx.aui.AuiManager` or `wx.SplitterWindow` for resizable dashboard regions;
- `wx.dataview.DataViewCtrl` or `wx.grid.Grid` for Detailed View tables;
- `wx.TextCtrl` for the primary note editor;
- `wx.SearchCtrl` for search;
- `wx.Notebook` or `wx.aui.AuiNotebook` for right-side context modules;
- `wx.Dialog` / `wx.Panel` for support surfaces such as profile, imports, settings, and templates.

Keep wx-specific code inside the UI adapter. Do not let wx widgets leak into domain services, agent routes, storage, or artifact rendering.

## Non-goals

Do not implement any of the following on this branch:

- browser dashboard recovery;
- webview desktop shell;
- React/Vue/Svelte/Angular migration;
- HTMX/Alpine-based local dashboard behavior;
- CLI/TUI dashboard;
- provider-specific LLM integration;
- broad agent CRUD;
- compatibility descriptor work unless directly needed for local UI boundaries;
- full drag-and-drop layout builder in the first vertical slice.

## Architecture

Target layering:

```text
aaaat/domain and existing services
  Own candidature, tasks, artifacts, notes, profile, keywords, rendering.

Dashboard projection
  Converts domain state into UI-facing view models.
  Contains no wx widgets.
  Contains no agent-facing API contract.

wx desktop UI adapter
  Renders projection data.
  Owns windows, panes, tables, controls, shortcuts, dialogs, and local interaction state.

Layout state
  Persists selected view, pane sizes, visible modules, column visibility/order, selected candidature, and selected keyword.
```

Suggested package shape:

```text
aaaat/
  dashboard_projection.py
  ui_desktop/
    __init__.py
    app.py
    main_window.py
    commands.py
    layout_state.py
    module_registry.py
    view_models.py
    views/
      welcome.py
      smart.py
      detailed.py
      user.py
    modules/
      candidature_list.py
      selected_candidature.py
      primary_note.py
      keyword_context.py
      artifacts.py
      call_card.py
      company_research.py
      form_answers.py
      task_queue.py
      detailed_table.py
```

The exact file names can change during implementation, but the boundary must remain stable:

```text
Domain/projection code must be UI-toolkit-neutral.
wxPython code must remain inside the desktop UI adapter.
Agent runtime must not import the desktop UI adapter.
```

## Dashboard projection contract

The first implementation should introduce or preserve a small projection layer independent from wx.

Minimum projection sections:

```text
permissions
view_state
welcome
user
smart
detailed
glossary
```

Minimum Smart View projection:

```text
smart.candidature_summaries
smart.selected_candidature_detail
smart.primary_note
smart.context_modules
smart.selected_keyword_definition
smart.artifact_summary
smart.call_card
smart.company_research
smart.form_answers
smart.agent_suggestions
```

Minimum Detailed View projection:

```text
detailed.rows
detailed.available_columns
detailed.visible_columns
detailed.column_order
detailed.search_query
detailed.filters
detailed.selected_row
detailed.toolbox_actions
detailed.task_queue_summary
```

Minimum User View projection:

```text
user.profile_summary
user.career_summary
user.template_summary
user.settings_summary
user.workspace_modules
```

Minimum Welcome View projection:

```text
welcome.setup_state
welcome.primary_actions
welcome.recent_or_important_candidatures
welcome.open_todos_summary
welcome.pending_tasks_summary
```

## Module model

Every desktop dashboard module should have a stable declaration:

```text
module_id
title
purpose
supported_views
default_visibility_by_view
default_region_by_view
minimum_useful_size
contextual_actions
state_persistence_policy
```

First modules:

```text
candidature_list
selected_candidature_summary
primary_note
keyword_context
artifacts
call_card
company_research
form_answers
agent_suggestions
detailed_table
detailed_toolbox
task_queue
profile_summary
career_summary
template_summary
settings_summary
```

Do not begin by building free-form drag-and-drop. Start with module visibility, ordering, resizable panes, and persisted presets. Add drag/dock behavior only where wx AUI provides it without custom framework work.

## View behavior

### Welcome View

Purpose: first-run, onboarding, empty-state orientation.

Requirements:

- show clear primary actions;
- keep forms inside dialogs or collapsed support surfaces;
- avoid raw form walls;
- navigate to Smart, Detailed, and User View;
- show local-first/privacy status briefly;
- work without any agent runtime.

### Smart View

Purpose: default operational recruiter-call view.

First vertical slice must implement Smart View before the other views.

Layout:

```text
left: compact candidature list
center: selected candidature operational detail
right: context modules
```

Requirements:

- fast search/filter over candidatures;
- compact list rows with company, role, status, priority, next action, last contact/deadline, source, artifact indicator, keyword chips;
- selected candidature remains visible while context modules change;
- one primary note field per candidature;
- primary note is directly editable in full local mode;
- keyword selection updates the right context area;
- forms/actions stay out of the primary call-support area unless explicitly opened.

### Detailed View

Purpose: dense candidature management and comparison.

Layout:

```text
left: toolbox
center: candidature table/grid
right: human-facing task queue
```

Requirements:

- candidatures are rows;
- fields are columns;
- column visibility and order are represented in persisted state;
- search/filter is available;
- selected row drives toolbox context;
- task queue is human-facing only and does not imply agent enumeration authority.

### User View

Purpose: profile, career, template, settings, and user-configured workspace.

Requirements:

- separate from operational candidature management;
- support profile/career/template/settings panels;
- persist visible modules and pane sizes;
- avoid forcing the Detailed View table layout;
- no private data in any future static/public demo path.

## Persistence

Persist local UI state either in SQLite or `.private/ui_state.json`.

Recommended initial shape:

```json
{
  "selected_view": "smart",
  "selected_candidature_ref": null,
  "selected_keyword": null,
  "pane_layout": {
    "smart": {"left": 320, "right": 360},
    "detailed": {"left": 280, "right": 340}
  },
  "modules": {
    "smart": {
      "visible": ["candidature_list", "selected_candidature_summary", "primary_note", "keyword_context", "artifacts"],
      "right_context": "primary_note"
    }
  },
  "detailed_columns": {
    "visible": ["company", "role", "status", "priority", "next_action", "artifacts_state"],
    "order": ["company", "role", "status", "priority", "next_action", "artifacts_state"]
  }
}
```

Do not persist private professional values in UI state. Store only layout and selection state.

## Launch behavior

Add a desktop launch command only after the first vertical slice exists.

Candidate commands:

```bash
aaaat desktop
aaaat launch-desktop
```

Do not remove existing server launch behavior in the first PR unless the project owner explicitly asks. The new branch should prove the desktop dashboard first, then decide what to deprecate.

For non-developer users, add a platform launcher later:

```text
Open AAAAT Desktop.cmd
open-aaaat-desktop.sh
```

## Testing strategy

Do not over-test wx widget internals.

Test contracts instead:

- projection builds without UI toolkit imports;
- projection contains Welcome/User/Smart/Detailed sections;
- Smart View projection exposes one primary note per candidature;
- Detailed View projection exposes rows/columns instead of selected-detail-only data;
- layout state serializes/deserializes safely;
- module registry validates module ids, supported views, and defaults;
- agent runtime does not import or expose desktop UI state;
- read-only mode disables write commands at the command handler level;
- static/demo mode cannot expose private data if represented.

Manual verification is required for the desktop UI slice:

```text
app window starts
Smart View renders
candidature list is readable
selecting a candidature updates central detail
primary note editing works in full mode
right context module switching works
keyword selection preserves selected candidature
pane resizing works
layout state persists after restart
agent runtime remains unchanged
```

## Implementation phases

### Phase 0: branch baseline

- Branch from `main`.
- Add this planning document.
- Do not import previous dashboard branch code.

### Phase 1: projection and contracts

- Add dashboard projection module if absent.
- Add module registry model.
- Add layout state model.
- Add tests for projection, module registry, layout state, and runtime separation.
- No wx dependency required yet if the projection is developed first.

### Phase 2: wx Smart View vertical slice

- Add optional desktop UI dependency.
- Add `aaaat/ui_desktop` package.
- Implement main window and Smart View only.
- Implement read-only/full local behavior for primary note editing.
- Persist pane sizes and selected view.
- Add launch command.

### Phase 3: Detailed View

- Implement table/grid view over projected candidature rows.
- Add column visibility/order state.
- Add selected-row toolbox.
- Add human-facing task queue panel.

### Phase 4: User and Welcome Views

- Implement Welcome View as onboarding/empty-state orientation.
- Implement User View as profile/career/template/settings workspace.
- Keep support forms in dialogs/panels, not primary operational space.

### Phase 5: desktop packaging and deprecation decision

- Add platform launchers.
- Decide whether old browser dashboard remains legacy, is hidden, or is removed.
- Do not make this decision before the desktop UI proves Smart and Detailed View.

## Worker prompt

Use this prompt for the first implementation worker:

```text
You are working on AAAAT.

Repository: DidacLL/AAAAT
Base branch: didacll/local-desktop-dashboard

Implement the first local desktop dashboard architecture slice.

Important product decision:
- The browser/dashboard UI direction is discarded for this branch.
- This is a local desktop app direction, not a web app, not a webview shell, not a CLI/TUI dashboard.
- Use wxPython only inside a desktop UI adapter.

Read first:
- README.md
- docs/security-model.md
- docs/agent-guide.md
- docs/planning/local-desktop-dashboard.md
- aaaat/db.py
- aaaat/payload.py
- aaaat/security.py
- aaaat/server_fastapi.py
- existing dashboard/rendering files only as historical context, not as source architecture.

Goal:
Create the toolkit-neutral projection/layout/module foundation for a wxPython desktop dashboard.

Implement:
- dashboard projection builder for Welcome/User/Smart/Detailed sections;
- module registry declarations;
- layout state serialization/deserialization;
- tests for projection, module registry, layout state, and runtime separation.

Do not implement the full wx UI yet unless the projection foundation is already clean.
Do not import wxPython into domain, agent, storage, or projection modules.
Do not expose projection or layout state as an agent API.
Do not add provider-specific LLM logic.
Do not rescue the previous browser dashboard.
```

## Acceptance for the first implementation PR

The first PR is acceptable only if:

- it starts from this branch;
- it does not copy the discarded UI implementation;
- projection is UI-toolkit-neutral;
- module registry and layout state exist;
- tests prove the projection/model contracts;
- agent runtime boundaries are unchanged;
- no browser/dashboard framework work is added.

Classification options:

```text
READY_FOR_WX_SMART_VIEW
BLOCKED_BY_PROJECTION_COUPLING
BLOCKED_BY_AGENT_BOUNDARY_REGRESSION
BLOCKED_BY_BROWSER_UI_LEAKAGE
BLOCKED_BY_TEST_FAILURE
```
