# Codex Worker Prompts

## Prompt 1: Dashboard four-view UX replacement

```text
You are working on AAAAT.

Repository: DidacLL/AAAAT
Base branch: codex/runtime-split-agent-dashboard
Create worker branch: codex/runtime-split-dashboard-ux

Read these planning files before changing code:

- docs/planning/dashboard/01-dashboard-requirements-review.md
- docs/planning/dashboard/02-dashboard-four-view-ux-spec.md
- docs/planning/dashboard/03-dashboard-implementation-plan.md
- docs/planning/dashboard/05-dashboard-test-plan.md
- docs/planning/dashboard/06-runtime-boundary-notes.md

Replace the current dashboard UX direction while preserving four human-facing views:

- Welcome View
- User View
- Smart View
- Detailed View

Do not reduce the dashboard to only Smart View and Detailed View.

The current dashboard does not satisfy the product requirements: it is unclear, visually noisy, and makes it hard to understand where the user is. Do not polish the existing box-based read/edit layout. Refactor toward a clear operational dashboard.

Global dashboard behavior:

- Do not render separate read boxes and edit boxes for the same data.
- Display data once and allow inline editing after clicking edit.
- Input forms are hidden by default in expandable panels.
- Raw intake/create/import/profile forms must not dominate the primary view.
- Notes are one primary note field per candidature, always directly editable in full local mode.
- Notes are not a list of notes in the primary interaction.
- Read-only mode preserves visibility but disables write controls.
- Static demo mode uses fake data and excludes write/raw-intake controls.
- Keep dashboard runtime human-local only.
- Do not make dashboard actions part of the agent runtime.
- Use existing assets for a clear accessible light/dark theme.
- Avoid heavy frontend dependencies.

Welcome View:

- Used for first-run, onboarding, empty-state, and orientation.
- Shows the product purpose briefly.
- Offers clean primary actions:
  - create/import first candidature
  - configure personal data
  - configure career path/strategy
  - configure templates/CV fields
  - open Smart View
  - open Detailed View
- Avoids dense documentation and visual noise.
- Hides advanced setup forms inside expandable panels.

User View:

- Dedicated user/profile/settings/control view.
- Manages:
  - personal data
  - career path
  - strategy
  - CV fields
  - profile variables
  - template variables
  - preferences
  - theme/accessibility settings if represented
  - agent/task configuration where appropriate
- Does not show candidature operational clutter by default.
- Forms are allowed here but must be grouped into expandable panels.
- Must remain local-first and private.

Smart View:

- Default recruiter-call-oriented view.
- Starts with the left panel expanded.
- Left panel lists candidatures with only compact identifying data:
  company, role, status, priority, next action, useful date/source, small keyword chips, artifact state.
- No verbosity and no visual noise.
- Selecting a candidature reduces left-panel dominance and expands the central panel.
- Central panel shows useful selected-candidature detail:
  company, role, status, priority, location/remote, source URL, next action, pitch, risk to avoid, smart question, prepare first, prepare later, call card, offer snapshot, artifact states.
- Right panel acts as a compact context selector:
  Notes, Keywords, Artifacts, Call card, Company research, Form answers, Agent suggestions.
- Clicking Notes shows one primary note field, always directly editable in full local mode.
- Clicking a keyword shows the glossary definition while keeping selected candidature visible.

Detailed View:

- Not the existing detail page.
- Central panel is a direct table/grid with all candidatures.
- All relevant candidature fields are available as columns.
- Columns can be hidden and reordered.
- Rows can be searched/filtered by column values.
- Selected row defines current candidature context.
- This is the base for user-defined views.
- Supports future dedicated modules/panels for specific data inspection.

Detailed View left panel:

- If a candidature is selected, acts as toolbox for actions:
  generate CV, generate cover letter, job-market adequacy report, interview guide, recruiter call prep, fit review, form answers, attach artifact.
- If no candidature is selected, shows general configuration:
  career path edit, strategy, personal data, CV fields, template config, view config, agent/task settings, import/create candidature.

Detailed View right panel:

- Shows the LLM task queue:
  pending, queued/running if represented, review-needed, failed, deferred, recently completed.

Add or update tests for durable UX contracts, not exact CSS:

- Welcome View renders for first-run/empty-state.
- Welcome View exposes first-run actions without noisy forms visible by default.
- User View exposes profile/career/template configuration.
- User View keeps forms grouped in expandable panels.
- Smart View starts with left candidature panel expanded.
- Smart View candidature list is compact and identifiable.
- Selecting a candidature expands central details.
- Notes are a single directly editable field in full local mode.
- Input forms are hidden by default.
- Detailed View renders a candidature table/grid.
- Configured columns can be hidden/reordered at the state/model level.
- Selected candidature changes Detailed View toolbox actions.
- No selection shows general config actions.
- Detailed View right panel shows LLM task queue.
- Read-only mode disables editing.
- Static demo excludes private/write/raw-intake controls.

Keep the implementation small, server-rendered where practical, with minimal JavaScript only for panel toggles, inline edit affordances, column visibility/reorder, search/filter, and selection state.
```

## Prompt 2: Dashboard UX review after implementation

```text
You are reviewing AAAAT branch codex/runtime-split-dashboard-ux.

Do not implement new features unless required to satisfy the stated dashboard architecture.

Review against these planning files:

- docs/planning/dashboard/01-dashboard-requirements-review.md
- docs/planning/dashboard/02-dashboard-four-view-ux-spec.md
- docs/planning/dashboard/03-dashboard-implementation-plan.md
- docs/planning/dashboard/05-dashboard-test-plan.md
- docs/planning/dashboard/06-runtime-boundary-notes.md

Verify:

- Welcome View still exists and is suitable for first-run/empty-state orientation.
- User View still exists and is suitable for profile/career/template/settings work.
- Smart View is the default operational recruiter-call view.
- Smart View starts with a compact left candidature list.
- Selecting a candidature expands useful central details.
- Notes are one primary directly editable field per candidature in full local mode.
- Notes are not primarily a list in the main interaction.
- Input forms are hidden by default in expandable panels.
- Detailed View is a table/grid with candidatures as rows and fields as columns.
- Column visibility/reorder/search/filter are represented at least at the state/model level.
- Detailed View left panel acts as a toolbox.
- Detailed View right panel shows the LLM task queue.
- Light and dark themes work using existing assets.
- Read-only mode preserves visibility and disables write controls.
- Static demo mode uses fake data and excludes write/raw-intake controls.
- Dashboard runtime remains human-local.
- Agent runtime is not expanded with dashboard HTML/actions.
- Tests cover durable behavior and avoid brittle exact CSS checks.

Produce a concise review with:

- blockers
- non-blockers
- missing tests
- architecture risks
- merge / no-merge recommendation
```

## Prompt 3: Documentation sync after UX implementation

```text
You are working on AAAAT.

After the dashboard UX implementation, update only concise operational documentation.

Do not add large documentation pages.

Update the relevant docs to reflect:

- The dashboard has four human-facing views: Welcome, User, Smart, Detailed.
- Smart View is the default operational call-oriented view.
- Detailed View is the table/grid management view and base for user-defined views.
- User View owns profile/career/template/settings configuration.
- Welcome View owns first-run/empty-state orientation.
- Dashboard runtime is human-local and separate from the agent runtime.
- Agent runtime does not expose dashboard UI/actions.

Keep docs short and practical.
```
