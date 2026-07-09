# Dashboard Four-View UX Specification

## Overview

The dashboard has four human-facing views:

```text
Welcome View
User View
Smart View
Detailed View
```

These views are part of the dashboard runtime only. They are local human UI surfaces and must not be treated as the agent contract.


## Projection/view-model boundary

The four views should be rendered from structured dashboard projection data where practical. HTML templates should consume already-prepared view models instead of becoming the only place where dashboard state, selection, column configuration, task summaries, or primary note behavior is assembled.

The projection layer should include, at minimum:

```text
current view state
permissions for full/read-only/static-demo mode
Welcome View setup state and primary actions
User View profile/career/template/settings summaries
Smart View candidature summaries
selected candidature detail
primary note state
selected keyword/glossary context
artifact state summary
Detailed View rows
available/visible columns
column order/filter/search state
selected row context
Detailed View toolbox actions
human-facing task queue summary
```

This layer is still dashboard runtime infrastructure. It must not be exposed as a broad agent API and must not become a provider-specific integration surface.

The immediate dashboard branch should add or prepare this boundary only as far as needed for the four-view redesign. It should not attempt a full domain-service rewrite.

## Shared layout principles

The dashboard may use a three-region layout where useful:

```text
left panel | central panel | right panel
```

Panel meaning changes by view. Do not force all views to use the same panel semantics.

Shared rules:

- Avoid duplicated read/edit boxes.
- Data is displayed once and edited inline where appropriate.
- Input forms are hidden by default in expandable panels.
- Notes are a special always-editable primary field per candidature.
- Preserve selected candidature context when switching secondary panels.
- Keep visual density compact but readable.
- Avoid long static lists in primary operational space.

## 1. Welcome View

### Purpose

Welcome View is the first-run, onboarding, empty-state, and orientation view.

It should help the user start without exposing the full operational dashboard too early.

### When shown

Welcome View should be shown when:

- The app is opened before initial setup.
- There are no candidatures yet.
- The user explicitly opens the welcome/onboarding view.
- The app needs to guide setup completion.

### Content

Welcome View should briefly explain:

- AAAAT is local-first.
- Candidature data is stored locally.
- The user can operate manually or with external agents.
- The dashboard is for tracking applications and generating artifacts.

Keep this brief. Do not make Welcome View a documentation page.

### Primary actions

Welcome View should expose clean entry actions:

```text
Create first candidature
Import candidature/source material
Configure personal data
Configure career path/strategy
Configure CV fields/templates
Open Smart View
Open Detailed View
```

### Forms

Any setup forms in Welcome View must be inside expandable panels.

Default visible state should show actions and orientation, not full forms.

### Restrictions

Welcome View must not:

- Show noisy raw intake forms by default.
- Dump profile variables by default.
- Show the full application-management table unless the user navigates to Detailed View.
- Become a documentation-heavy page.

## 2. User View

### Purpose

User View is the profile, strategy, template, and settings control center.

It is separate from candidature operations.

### Content areas

User View manages:

```text
Personal data
Career path
Job-search strategy
CV fields
Profile variables
Template variables
Writing/style preferences
Theme/accessibility preferences if represented
Agent/task configuration where appropriate
Local storage/status information if useful
```

### Interaction model

Forms are allowed in User View, but they must be grouped into clean expandable panels.

Recommended panel groups:

```text
Personal data
Career strategy
CV fields
Template variables
Writing preferences
Agent/task settings
Theme/accessibility
Storage/privacy
```

### Restrictions

User View must not:

- Mix operational candidature clutter into the profile/settings workspace.
- Show raw application intake controls as a primary element.
- Expose private data in static public demo mode.
- Expose write controls in read-only mode.

## 3. Smart View

### Purpose

Smart View is the default operational view for day-to-day usage and recruiter calls.

It must allow the user to identify an application, select it, read the useful detail, take notes, and inspect keywords/artifacts quickly.

### Initial layout

Smart View starts as:

```text
left panel expanded | central panel detail-ready | right panel visible
```

The left panel is dominant initially because fast identification is the first task.

### Left panel: candidature list

The left panel lists candidatures with compact identifying data.

Each row/card should include only useful fast-identification fields:

```text
Company
Role
Status
Priority
Next action
Deadline or last contact date if relevant
Source/channel if useful
Small keyword chips
Artifact/state indicator
```

Avoid:

- Long descriptions.
- Multi-paragraph summaries.
- Dense company research.
- Decorative metrics with no action value.
- Large cards that reduce scan speed.

### Selection behavior

When a candidature is selected:

```text
left panel remains available but less dominant
central panel expands with selected candidature details
right panel becomes a compact context selector
```

The selected candidature must remain clear at all times.

### Central panel: selected candidature detail

The central panel shows operationally useful information:

```text
Company
Role
Status
Priority
Location / remote mode
Source URL
Next action
Last contact / deadline
Pitch
Risk to avoid
Smart question
Prepare first
Prepare later
Call card
Offer snapshot
Current artifacts
Submitted/reviewed/draft states
```

Do not show all possible fields here. Use Detailed View for full-column inspection.

### Right panel: context selector

The right panel should offer compact context modules:

```text
Notes
Keywords
Artifacts
Call card
Company research
Form answers
Agent suggestions
```

Selecting a module updates the context area without losing the selected candidature.

### Notes behavior

Notes are special.

Required behavior:

- One primary note field per candidature.
- Always directly editable in full local mode.
- Visible from the Notes context module.
- Optimized for rapid note taking during calls.
- Not displayed as a list of notes by default.

Read-only mode:

- Note remains visible.
- Editing is disabled.

Static demo mode:

- Fake note content may be shown.
- No real private note data.
- No write controls.

### Keyword behavior

Keywords appear as clickable chips.

When the user clicks a keyword:

- The glossary/keyword definition appears in the right context area.
- The selected candidature remains visible.
- The selected keyword should be visually identifiable.

## 4. Detailed View

### Purpose

Detailed View is the table/grid-oriented candidature management view.

It is not the existing single-candidature detail page.

Detailed View is the base for user-defined views.

### Central panel: candidature table/grid

The central panel shows a direct table/grid with candidatures as rows.

Required behavior:

```text
All candidatures visible as rows
All core fields available as columns
Columns can be hidden
Columns can be reordered
Rows can be searched/filtered by column values
Selected row defines current candidature context
Inline edit can be supported where safe
```

### Columns

Candidate core columns:

```text
Company
Role
Status
Priority
Next action
Deadline
Last contact
Source
Source URL
Location
Remote mode
Keywords
Artifacts state
Cover letter state
CV variant state
Interview state
Notes excerpt
Created at
Updated at
```

Do not require all columns to be visible at once by default. They should be available.

### User-defined views foundation

Detailed View should eventually allow saved configurations:

```text
Saved column set
Saved filters
Saved sort order
Saved grouping if implemented
Optional dedicated modules/panels
```

Do not overbuild this immediately. The base state model should make it possible.

### Left panel: toolbox

In Detailed View, the left panel is a toolbox.

If a candidature is selected, show candidature-specific actions:

```text
Generate CV
Generate cover letter
Generate job-market adequacy report
Generate interview guide
Prepare recruiter call
Review fit
Create/update form answers
Attach artifact
Archive candidature
```

If no candidature is selected, show general configuration actions:

```text
Career path edit
Strategy
Personal data
CV fields
Template config
View config
Agent/task settings
Import/create candidature
```

### Right panel: LLM task queue

In Detailed View, the right panel shows the human-facing LLM task queue.

Recommended queue groups:

```text
Pending
Queued/running if represented
Review needed
Failed
Deferred
Recently completed
```

Each task row should be compact and action-oriented:

```text
Task type
Related candidature label if safe for human UI
Status
Created/updated time
Review action if needed
```

The queue is dashboard state only. It must not imply broad agent runtime access.

## Theme and accessibility

Required:

```text
Light theme
Dark theme
Existing assets used for branding/theme consistency
Readable text contrast
Clear focus states
Keyboard accessible panel toggles
Keyboard accessible table navigation where practical
Visible selected candidature state
Visible selected keyword state
Status/priority indicators not dependent only on color
```

Avoid:

- Decorative UI that hides operational information.
- Low-contrast typography.
- Tiny controls.
- Excessive nesting.
- Heavy frontend dependencies unless clearly justified.
