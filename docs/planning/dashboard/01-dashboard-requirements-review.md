# Dashboard Requirements Review

## Status

The current dashboard direction does not satisfy the product owner requirements.

The issue is not only visual polish. The current model makes the user work too hard to understand where they are, which candidature is selected, what matters now, and what action should be taken next.

The dashboard should be treated as an operational interface for job search execution, especially during recruiter calls. It should not behave like a generic CRUD admin page.


## Compatibility amendment: UI projection boundary

The general architecture review confirms the four-view dashboard direction and adds one implementation constraint: dashboard state should be assembled through structured projection/view-model data where practical, not only inside HTML templates.

The dashboard projection boundary should prepare structured data for human UI rendering, including:

```text
Welcome setup state
User/profile/career summaries
Smart View candidature summaries
Selected candidature operational detail
Primary note
Keyword/glossary context
Artifact state summaries
Detailed View rows and column state
Detailed View toolbox actions
Human-facing task queue summaries
Dashboard counters and next actions
```

This projection boundary is not an agent API, not a provider integration, and not a host adapter. It is an internal dashboard-facing view-model layer so the server-rendered dashboard and any future embedded UI can consume structured state without scraping HTML.

Do not block the dashboard redesign on broader future-compatibility work such as a compatibility descriptor, host adapter, artifact lifecycle overhaul, privacy-schema consolidation, or provider-specific integration. Those are future branches.

## Core problems to correct

### 1. Duplicated read/edit boxes

The dashboard must not have separate boxes for reading and editing the same data.

Required behavior:

- Show each piece of data once.
- Allow inline editing after the user clicks an edit affordance.
- Preserve read-only visibility when editing is disabled.
- Avoid duplicating the same field in read mode and form mode.

Exception:

- Notes are special. See the notes requirement below.

### 2. Notes model is wrong

Notes must not be represented primarily as a list of note entries.

Required behavior:

- Each candidature has one primary note field.
- This note field is always directly editable in full local mode.
- It is optimized for fast writing during recruiter calls.
- It should be visible without forcing the user through a form.
- It may have provenance/history later, but that must not be the primary interaction.

The primary note is operational scratch space, not an archive widget.

### 3. Input forms are too visible

Creation, intake, import, raw edit, profile, strategy, and configuration forms must not dominate the default dashboard.

Required behavior:

- Input forms are hidden by default.
- Forms live inside expandable panels.
- Primary views show useful state first.
- Empty controls should not create visual noise.

### 4. Views are not accurate enough

The dashboard must preserve and clarify four human-facing views:

```text
Welcome View
User View
Smart View
Detailed View
```

Smart View and Detailed View are not replacements for Welcome View and User View.

### 5. Smart View is currently insufficient

Smart View must be the fast operational view.

It should start with the left panel expanded and show a compact list of candidatures with enough data to identify an application in seconds.

It must avoid verbosity, dense text, and decorative visual noise.

### 6. Detailed View is currently conceptually wrong

Detailed View should not be a single-candidature detail page.

It should be a table/grid view with all candidatures and all relevant columns available. It is the base for user-defined views, saved column sets, filters, and future dedicated modules.

### 7. Dashboard panels need clearer roles

The same left/center/right layout can serve different purposes by view.

In Smart View:

- Left panel: candidature list.
- Center panel: selected candidature operational detail.
- Right panel: context selector for notes, keywords, artifacts, call card, company research, form answers, and agent suggestions.

In Detailed View:

- Left panel: toolbox.
- Center panel: candidature table/grid.
- Right panel: LLM task queue.

### 8. Style needs to be clear and accessible

The dashboard should be clean, readable, and accessible.

Required behavior:

- Light theme.
- Dark theme.
- Use existing assets.
- High contrast readable text.
- Clear focus states.
- Keyboard-accessible panels and actions.
- Compact spacing without cramped density.
- Minimal color dependence.
- No decorative cards where a table/list is clearer.

## Operational questions the dashboard must answer quickly

The dashboard must answer these questions without requiring navigation through noisy UI:

```text
Where am I?
Which candidature is selected?
What company is this?
What role is this?
What status is it in?
What should I do next?
What did I already send?
What is the pitch?
What should I avoid saying?
What notes did I capture?
What keyword/company/role context matters now?
What artifacts exist?
What LLM tasks are pending or need review?
```

## Non-goals

Do not use this dashboard redesign to:

- Introduce a heavy frontend framework by default.
- Turn dashboard actions into agent API actions.
- Expose dashboard runtime routes to the agent runtime.
- Create a documentation-heavy UI.
- Add speculative modules before the base view model is stable.
- Polish the current read/edit box layout instead of replacing it.

## Required conclusion

The next dashboard work should be a replacement-level UX refactor of the human-local dashboard runtime.

It must preserve Welcome View and User View, rebuild Smart View and Detailed View, and keep agent-facing contracts separate.
