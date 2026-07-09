# Codex Worker Prompts

These prompts assume GitHub-connector-only agents working on:

```text
Repository: DidacLL/AAAAT
Branch: didacll/dashboard-design
```

Agents should not assume local shell access or internet access. They should work from repository files only.

## Prompt 1: Planning pack validation and requirements trace

```text
You are working on AAAAT.

Repository: DidacLL/AAAAT
Branch: didacll/dashboard-design

You only have GitHub connector access. Do not assume local shell access. Do not assume internet access. Work only from repository files.

Do not implement dashboard code in this task.

Goal:
Validate that the committed dashboard planning files correctly represent the product owner requirements, the four-view model, and the compatibility amendment requiring a dashboard projection/view-model boundary.

Read the dashboard planning files under docs/planning/dashboard/. Also inspect nearby project documentation that defines product/dashboard/runtime requirements.

Create or update:

- docs/planning/dashboard/07-dashboard-requirements-trace.md

The file must contain:

1. A concise summary of the intended dashboard view model: Welcome View, User View, Smart View, Detailed View.
2. A requirements trace table with columns: Requirement, Source planning file, Expected implementation area, Test expectation, Risk if missed.
3. Explicit confirmation that Smart View and Detailed View do not replace Welcome View and User View.
4. Explicit confirmation that notes are one primary always-editable note field per candidature in full local mode, not a primary list-of-notes interaction.
5. Explicit confirmation that forms are hidden by default in expandable panels.
6. Explicit confirmation that dashboard UX work applies only to the human-local dashboard runtime and must not become an agent-facing API.
7. Explicit confirmation that the dashboard should render from structured projection/view-model data where practical.
8. Explicit confirmation that the projection layer is not an agent API, provider integration, or host adapter.
9. Contradictions, ambiguities, or missing requirements found in the planning files.
10. Final recommendation: ACCEPT_PLAN, ACCEPT_WITH_MINOR_FIXES, or BLOCKED_NEEDS_PLAN_REVISION.

Constraints:
- Do not change implementation code.
- Do not rewrite the whole planning pack unless necessary.
- If you find wording problems, patch only the planning docs.
- Do not remove runtime boundary language.
- Do not invent new product scope.
- Do not ask the user questions. Record assumptions and unknowns in the file.
```

## Prompt 2: Current dashboard implementation map

```text
You are working on AAAAT.

Repository: DidacLL/AAAAT
Branch: didacll/dashboard-design

You only have GitHub connector access. Do not assume local shell access. Do not assume internet access. Work only from repository files.

Do not implement dashboard code in this task.

Goal:
Map the current dashboard implementation so the next agents can modify the right files without guessing. Pay special attention to where dashboard state is assembled today and where a minimal projection/view-model layer should live.

Read the dashboard planning files under docs/planning/dashboard/. Then inspect files related to dashboard rendering, payload/view models, routes, templates, assets, JavaScript, static demo export, modes, and tests.

Create or update:

- docs/planning/dashboard/08-current-dashboard-implementation-map.md

The file must contain:

1. Current dashboard architecture summary: HTML rendering, payload/state source, route registration, mode enforcement, static demo export, CSS/assets, tests.
2. A file map table with columns: File/path, Current responsibility, Relevance to four-view redesign, Expected change type, Risk level.
3. Current view/model assessment: Welcome/User/Smart/Detailed existence, duplicated read/edit boxes, notes model, forms default visibility, mode restrictions.
4. Projection assessment: whether projection/view-model builders already exist, whether state is template-only, which transformations should move into projection code, and where the projection layer should live.
5. Minimal implementation strategy: what to change first, what not to touch initially, tests to update, what remains server-rendered, where minimal JavaScript is acceptable.
6. Risks and unknowns.
7. Final recommendation: READY_FOR_PROJECTION_IMPLEMENTATION, READY_WITH_CAUTION, or BLOCKED_NEEDS_REPO_CLEANUP.

Constraints:
- Do not change implementation code.
- Do not run tests or claim tests passed unless the connector provides actual test results.
- Do not assume file paths exist; inspect and report exact existing paths.
- Do not create a frontend framework migration.
- Do not weaken dashboard/agent runtime separation.
- Do not ask the user questions. Record assumptions and unknowns in the file.
```

## Prompt 3: Dashboard projection and view-state model

```text
You are working on AAAAT.

Repository: DidacLL/AAAAT
Base branch: didacll/dashboard-design
Create worker branch only if your workflow requires it; target didacll/dashboard-design.

Implement the minimal dashboard projection/view-state model needed for the four-view redesign.

Read first:
- docs/planning/dashboard/01-dashboard-requirements-review.md
- docs/planning/dashboard/02-dashboard-four-view-ux-spec.md
- docs/planning/dashboard/03-dashboard-implementation-plan.md
- docs/planning/dashboard/05-dashboard-test-plan.md
- docs/planning/dashboard/06-runtime-boundary-notes.md
- docs/planning/dashboard/07-dashboard-requirements-trace.md if present
- docs/planning/dashboard/08-current-dashboard-implementation-map.md if present

Goal:
Create or refactor a small internal dashboard projection layer that prepares structured view data for Welcome, User, Smart, and Detailed views before HTML rendering.

The projection should include where practical:
- current view state
- permissions for full/read-only/static-demo mode
- Welcome setup state and primary actions
- User/profile/career/template/settings summaries
- Smart View candidature summaries
- selected candidature detail
- primary note state
- selected keyword/glossary context
- artifact state summary
- Detailed View rows
- available/visible columns
- column order/filter/search state
- selected row context
- Detailed View toolbox actions
- human-facing task queue summary

Constraints:
- Keep server-rendered HTML.
- Use minimal JavaScript only where needed later.
- Do not expose the projection as an agent API.
- Do not add broad dashboard JSON endpoints for agents.
- Do not add provider-specific logic.
- Do not perform a broad storage/domain-service rewrite.
- Preserve full/read-only/static-demo restrictions.

Add or update tests for projection/view-state semantics without asserting exact CSS.
```

## Prompt 4: Welcome View and User View cleanup

```text
You are working on AAAAT.

Repository: DidacLL/AAAAT
Base branch: didacll/dashboard-design

Implement or clean up Welcome View and User View using the dashboard projection/view-state model.

Welcome View must remain first-run/onboarding/empty-state orientation with clean primary actions and no noisy forms visible by default.

User View must remain the profile/career/template/settings control center. Forms are allowed there, but grouped in expandable panels. It must not mix operational candidature clutter into the profile workspace.

Constraints:
- Do not reduce the dashboard to only Smart View and Detailed View.
- Do not expose write controls in read-only mode.
- Do not expose private data or write controls in static demo mode.
- Do not turn dashboard actions into agent API actions.
- Keep implementation server-rendered with minimal JavaScript.

Add or update durable tests for Welcome/User behavior and mode restrictions.
```

## Prompt 5: Smart View and Detailed View implementation

```text
You are working on AAAAT.

Repository: DidacLL/AAAAT
Base branch: didacll/dashboard-design

Implement Smart View and Detailed View using the dashboard projection/view-state model.

Smart View:
- default operational recruiter-call view
- starts with left candidature panel expanded
- compact candidature list with only fast identification data
- selected candidature expands central operational detail
- right panel context selector: Notes, Keywords, Artifacts, Call card, Company research, Form answers, Agent suggestions
- Notes is one primary note field per candidature, directly editable in full local mode
- keyword chips update glossary context without losing selected candidature

Detailed View:
- central table/grid with candidatures as rows
- core fields available as columns
- column visibility/order/search/filter represented at projection/state level
- selected row defines candidature context
- left panel toolbox changes based on selection
- right panel shows human-facing LLM task queue

Constraints:
- No duplicated read/edit boxes.
- Input forms hidden by default in expandable panels.
- Read-only disables editing.
- Static demo excludes private/write/raw-intake controls.
- Do not expose dashboard projection or routes as agent API.
- Avoid heavy frontend dependencies.

Add or update durable UX tests.
```

## Prompt 6: Dashboard UX review after implementation

```text
You are reviewing AAAAT branch didacll/dashboard-design.

Do not implement new features unless required to satisfy the stated dashboard architecture.

Verify:
- Four views exist or are preserved: Welcome, User, Smart, Detailed.
- Dashboard HTML consumes structured projection/view-model data where practical.
- Projection layer is not exposed as broad agent API.
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
- Light and dark themes use existing assets where represented.
- Read-only mode preserves visibility and disables write controls.
- Static demo mode uses fake data and excludes write/raw-intake controls.
- Dashboard runtime remains human-local.
- Agent runtime is not expanded with dashboard HTML/actions.
- Tests cover durable behavior and avoid brittle exact CSS checks.

Produce a concise review with blockers, non-blockers, missing tests, architecture risks, and merge/no-merge recommendation.
```
