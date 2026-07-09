# Current Dashboard Implementation Map

## Status

Recommendation: `READY_WITH_CAUTION`

This is a doc-only implementation map for the dashboard redesign. It was prepared from repository files only. No implementation code was changed and no tests were run.

The current code already has a useful Jinja-based dashboard path and a coarse `dashboard_view_model`, but much of the four-view behavior is still assembled inside templates. Detailed View is currently a single-candidature detail/editor view, not a table/grid. Smart View currently uses note-list behavior in its main content, not the required one-primary-note interaction. Static demo export still uses the legacy string renderer rather than the Jinja four-view renderer.

Implementation can proceed, but agents should first consolidate dashboard projection/view-model data around the Jinja path and avoid touching the agent runtime except for boundary tests.

## Files inspected

Planning/docs:

- `docs/planning/dashboard/README.md`
- `docs/planning/dashboard/01-dashboard-requirements-review.md`
- `docs/planning/dashboard/02-dashboard-four-view-ux-spec.md`
- `docs/planning/dashboard/03-dashboard-implementation-plan.md`
- `docs/planning/dashboard/04-codex-worker-prompts.md`
- `docs/planning/dashboard/05-dashboard-test-plan.md`
- `docs/planning/dashboard/06-runtime-boundary-notes.md`
- `docs/planning/dashboard/07-dashboard-requirements-trace.md`
- `docs/security-model.md`
- `docs/openapi.md`
- `docs/agent-workflow.md`
- `docs/mcp.md`
- `AGENTS.md`
- `README.md`

Implementation/tests/assets:

- `aaaat/dashboard.py`
- `aaaat/dashboard_views.py`
- `aaaat/payload.py`
- `aaaat/server.py`
- `aaaat/server_fastapi.py`
- `aaaat/static_export.py`
- `aaaat/security.py`
- `aaaat/schema.sql`
- `aaaat/db.py`
- `aaaat/candidatures.py`
- `aaaat/notes.py`
- `aaaat/cli.py`
- `aaaat/templates_ui/dashboard.html`
- `aaaat/templates_ui/partials/candidature_list.html`
- `aaaat/templates_ui/partials/selected_card.html`
- `aaaat/templates_ui/partials/inspector.html`
- `aaaat/static/htmx.min.js`
- `aaaat/templates_ui/assets/AAAATbanner.png`
- `examples/demo_payload.json`
- `tests/test_dashboard_views.py`
- `tests/test_dashboard_modes.py`
- `tests/test_fastapi_server.py`
- `tests/test_static_export.py`
- `tests/test_cli_mcp.py`
- `pyproject.toml`

## Current dashboard architecture summary

### HTML rendering

There are two dashboard renderers:

1. Current Jinja renderer:
   - `aaaat/dashboard_views.py`
   - `aaaat/templates_ui/dashboard.html`
   - `aaaat/templates_ui/partials/candidature_list.html`
   - `aaaat/templates_ui/partials/selected_card.html`
   - `aaaat/templates_ui/partials/inspector.html`

   `render_dashboard_view()` builds or accepts a view model, creates a Jinja environment, and renders `dashboard.html`. `render_dashboard_fragment()` renders selected partials for htmx fragment updates.

2. Legacy string renderer:
   - `aaaat/dashboard.py`

   `render_dashboard()` constructs an HTML string directly and embeds inline CSS. It is still used by the legacy dashboard route and by static demo export.

The four-view redesign should target the Jinja path. The legacy renderer should not be expanded unless needed for compatibility while static export is migrated.

### Payload/state source

Base dashboard payload comes from `aaaat/payload.py`:

- `dashboard_payload(conn, include_raw=False)` loads applications, glossary, profile variables, missing profile variables, generated artifacts, computed last activity, next-action date, a placeholder call-probability label, optional raw intake, and review queue.
- `application_context(conn, application_id)` builds a legacy application context that includes selected application data, glossary, agent-scope resolved variables, profile context, and artifact slots.

The Jinja view model comes from `aaaat/dashboard_views.py`:

- `dashboard_view_model()` normalizes the current view, selects one application, optionally reloads the selected candidature with related tasks/todos/notes/text blobs/artifacts/raw intake, loads tasks/todos/glossary/profile facts when a connection is supplied, derives selected keyword state, groups profile facts, and optionally performs search.

State is currently split across:

- `dashboard_payload()` for broad application/glossary/profile payload.
- `dashboard_view_model()` for selected candidature, tasks/todos/keyword/profile/search state.
- `server_fastapi.py` route helper `make_view_model()` for request-specific state assembly.
- Jinja templates for many view-specific lists, fields, actions, and grouping rules.
- Legacy `dashboard.py` for a separate renderer-specific state path.

### Dashboard routes

The actual launched server path goes through `aaaat/server.py`, whose `launch()` delegates to `aaaat.server_fastapi.launch()`.

Dashboard routes are registered in `create_dashboard_app()` in `aaaat/server_fastapi.py`:

- `GET /api/health`
- `GET /`
- `GET /legacy`
- `GET /dashboard/fragments/{fragment}`
- `GET /intake`
- `POST /dashboard/actions/raw-offer-intake`
- `POST /dashboard/actions/applications/{application_id}`
- `POST /dashboard/actions/candidatures/{candidature_id}`
- `POST /dashboard/actions/notes`
- `POST /dashboard/actions/todos`
- `POST /dashboard/actions/tasks`
- `POST /dashboard/actions/tasks/{task_id}/complete`
- `POST /dashboard/actions/tasks/{task_id}/apply`
- `POST /dashboard/actions/render/cv`
- `POST /dashboard/actions/render/cover-letter`
- `POST /dashboard/actions/profile/facts`
- `POST /dashboard/actions/profile/facts/{fact_id}`
- `POST /dashboard/actions/profile/facts/{fact_id}/archive`
- `POST /dashboard/actions/profile/variables`
- `POST /dashboard/actions/text-blobs`
- `POST /dashboard/actions/user-view`
- `POST /dashboard/actions/export/static-demo`

`create_dashboard_app()` also mounts `/static` from `aaaat/static`.

The older `AAAATHandler` in `aaaat/server.py` still contains legacy HTTP routes including `/api/dashboard-payload`, `/api/review-queue`, `/api/applications`, `/api/applications/{id}/context`, and `/api/export/static-demo`. It is not the default launched implementation because `launch()` delegates to FastAPI, but it remains a risk if reused directly or treated as architectural guidance.

### Agent routes and runtime boundary

Agent routes are registered separately in `create_agent_app()` in `aaaat/server_fastapi.py`:

- `GET /api/health`
- `GET /api/agent/tasks/next`
- `GET /api/agent/tasks/{task_handle}/context`
- `POST /api/agent/tasks/{task_handle}/result`
- `POST /api/agent/context-bundle`
- `POST /api/agent/actions`

The dashboard redesign must not add dashboard HTML, static assets, fragments, form actions, dashboard payloads, dashboard projections, broad CRUD/list/search, or entity-ID mutation authority to this runtime.

### Mode enforcement

Mode primitives live in `aaaat/security.py`:

- `Mode.FULL`
- `Mode.READ_ONLY`
- `Mode.STATIC_DEMO`
- `can_write(mode)`
- `can_show_raw_intake(mode)`

FastAPI dashboard action routes use a local `writable()` dependency in `create_dashboard_app()`, returning `403` outside full mode. Templates also conditionally render write controls with `can_write(mode)` and raw-intake visibility with `can_show_raw_intake(mode)`.

Read-only enforcement is therefore split between route-level blocking and template-level visibility. Static demo restrictions are currently enforced primarily by rendering the legacy dashboard with `Mode.STATIC_DEMO` and fake payload data.

### Static demo export

Static demo export is implemented in `aaaat/static_export.py`:

- `default_demo_payload_path()` points to `examples/demo_payload.json`.
- `load_demo_payload()` loads fake demo JSON.
- `export_static_demo()` renders the fake payload using legacy `aaaat.dashboard.render_dashboard(payload, Mode.STATIC_DEMO)` and writes a static HTML file.

This is a current mismatch with the four-view Jinja dashboard. The planning requirement says the static demo should be generated by the same dashboard renderer. The next implementation should migrate static export to the Jinja renderer/projection path after the projection model exists.

### CSS/assets/JavaScript

Current CSS is inline:

- `aaaat/templates_ui/dashboard.html` contains inline CSS for the Jinja dashboard.
- `aaaat/dashboard.py` contains separate inline CSS for the legacy string-rendered dashboard.
- `aaaat/dashboard.py` also contains separate inline CSS for the raw-offer intake page.

Static assets:

- `aaaat/static/htmx.min.js` is mounted at `/static/htmx.min.js` by the dashboard runtime.
- `aaaat/templates_ui/assets/AAAATbanner.png` exists and is packaged, but the inspected Jinja dashboard template does not currently use it directly.

JavaScript:

- There is no custom dashboard JavaScript file in the inspected paths.
- The Jinja dashboard uses htmx attributes for fragment updates.

Theme status:

- The current Jinja dashboard has inline light-theme CSS.
- No separate CSS/theme files were found in inspected paths.
- No durable dark-theme implementation was found in the inspected templates.

### Tests

Dashboard and boundary tests currently live in:

- `tests/test_dashboard_views.py`: Jinja dashboard view helper/render tests, stable hooks, read-only controls, user view, smart view, welcome view, detailed view, task toggles, profile panel behavior.
- `tests/test_dashboard_modes.py`: legacy `aaaat.dashboard.render_dashboard()` tests for full/read-only modes and legacy structure.
- `tests/test_fastapi_server.py`: FastAPI dashboard/agent runtime separation, dashboard actions, read-only action blocking, agent route contract.
- `tests/test_static_export.py`: legacy static export fake payload and absence of write/raw/private controls.
- `tests/test_cli_mcp.py`: CLI and MCP/agent contract tests that protect capability-only agent behavior.

No tests were run for this audit.

## File map

| File/path | Current responsibility | Relevance to four-view redesign | Expected change type | Risk level |
| --- | --- | --- | --- | --- |
| `aaaat/dashboard_views.py` | Jinja rendering bridge, fragment rendering, coarse dashboard view model, view normalization | Primary current location for view model and rendering handoff | Refactor or split projection builders; keep renderer thin | High |
| `aaaat/templates_ui/dashboard.html` | Jinja page shell, inline CSS, view nav, search, collapsed new-candidature panel, partial includes | Main server-rendered shell for four-view UX | Consume structured projection; reduce view logic in template; later theme cleanup | High |
| `aaaat/templates_ui/partials/candidature_list.html` | Left candidature list partial | Smart View list and future Detailed row/table source | Replace generic list with projection-backed Smart list and Detailed row/table variants | High |
| `aaaat/templates_ui/partials/selected_card.html` | Central panel for Welcome/Smart/Detailed/User branches; currently most view logic lives here | Main current hotspot; Detailed View and notes behavior conflict with plan | Move field lists/actions/task groups into projection; rebuild Detailed as table/grid | High |
| `aaaat/templates_ui/partials/inspector.html` | Right inspector for view-specific panels, profile facts, new-candidature form | Smart context modules and Detailed task queue/toolbox need redesign | Convert to projection-backed context modules; ensure forms collapsed | High |
| `aaaat/dashboard.py` | Legacy string-rendered dashboard and intake page | Still used by `/legacy`, `renderer=legacy`, and static export | Do not expand; eventually retire or keep compatibility after Jinja static export exists | Medium |
| `aaaat/payload.py` | Base dashboard payload and legacy application context | Source of broad application/glossary/profile payload | Keep as low-level data loader; avoid making it the final UI projection | Medium |
| `aaaat/server_fastapi.py` | Main FastAPI dashboard and agent runtime constructors/routes; dashboard actions; fragment routes | Critical route and boundary point | Keep runtime split; update dashboard routes only if needed for projection/fragments | High |
| `aaaat/server.py` | Legacy `BaseHTTPRequestHandler` plus launch delegation to FastAPI | Contains older broad API routes that should not guide new agent work | Do not copy legacy broad routes; consider documenting/deprecating later | Medium |
| `aaaat/static_export.py` | Static fake demo export using legacy renderer | Must eventually use same Jinja/projection renderer as dashboard | Change after projection exists; keep fake payload and no-write guarantees | High |
| `aaaat/security.py` | Mode enum and scope helpers | Central for full/read-only/static-demo permissions | Probably keep; projection should expose permissions derived from these helpers | Medium |
| `aaaat/schema.sql` | Data schema including `applications.notes` and `notes` table | Primary-note storage uncertainty; Detailed columns source | Avoid schema churn initially; project primary note from `applications.notes` first | Medium |
| `aaaat/db.py` | Application CRUD and primary `applications.notes` update field | Existing primary note field lives here | Use `applications.notes` as primary note source unless implementation discovers blocker | Medium |
| `aaaat/notes.py` | List-like notes table functions | Current Smart View quick annotation/list behavior uses this path | Keep as history/call notes; do not make it primary note interaction | Medium |
| `aaaat/candidatures.py` | Candidature aggregate loader with details, raw intake, artifacts, tasks, todos, notes, text blobs | Useful selected-detail source for projection | Use as data source; projection should shape it for human UI | Medium |
| `aaaat/cli.py` | CLI commands, launch flags, static demo export command, broad local human/admin commands, agent commands | Dashboard launch and export entry points; agent boundary tests also rely on CLI | Avoid broad changes; do not use dashboard projection in agent CLI | Medium |
| `aaaat/static/htmx.min.js` | Vendored htmx asset | Fragment updates for server-rendered dashboard | Keep; no framework migration | Low |
| `aaaat/templates_ui/assets/AAAATbanner.png` | Packaged visual asset | Existing asset required by planning theme/branding language | Optional use in theme pass; do not block projection | Low |
| `examples/demo_payload.json` | Fake static demo payload | Static demo and demo-mode projection source | May need fields for four-view demo, primary notes, tasks, columns, fake profile/career summaries | Medium |
| `tests/test_dashboard_views.py` | Jinja view tests | Primary tests to update for projection/four-view contracts | Update before/alongside implementation; avoid exact CSS | High |
| `tests/test_dashboard_modes.py` | Legacy renderer mode tests | Guards old renderer only | Keep until legacy retired; add new Jinja mode/projection tests instead of expanding legacy | Medium |
| `tests/test_fastapi_server.py` | Runtime split, route boundary, dashboard action tests | Protects agent/dashboard separation | Update only to add projection/fragments/mode assertions; do not weaken agent route set | High |
| `tests/test_static_export.py` | Static demo fake/no-write/private-data test | Must migrate when static export moves to Jinja renderer | Update alongside static export migration | High |
| `tests/test_cli_mcp.py` | CLI/MCP/agent capability contract | Protects agent boundary | Do not loosen; ensure projection does not appear in descriptor/agent CLI | High |
| `pyproject.toml` | Dependencies and package data | Confirms Jinja, FastAPI, htmx/static/templates package data | Avoid new heavy frontend dependencies | Low |
| `docs/security-model.md` | Runtime and privacy boundary docs | Must remain consistent after projection work | Update only if implementation changes boundary wording; do not weaken | Medium |
| `docs/openapi.md` | HTTP runtime contract | Defines dashboard vs agent routes | Keep agent contract narrow; do not document projection as agent API | Medium |
| `docs/agent-workflow.md` | Agent workflow and runtime distinction | Protects against agent CRUD/payload leakage | Do not expand with dashboard projection | Medium |
| `docs/mcp.md` | Descriptor-only MCP compatibility | Protects against treating AAAAT as MCP server or provider integration | Do not add UI projection to MCP descriptor in this branch | Medium |

## Current view/model assessment

### Welcome View

Partially exists.

`normalize_view()` defaults to `welcomeView`, and the Jinja `selected_card.html` has a `welcomeView` branch showing open todos, pending agent tasks, and important candidatures. When no candidature exists, the template shows a generic `Local candidature dashboard` empty state rather than a complete first-run/setup Welcome View.

Assessment: present but incomplete. It needs a projection-backed onboarding/setup state, primary actions, and form-collapse guarantees.

### User View

Partially exists, but does not match the target meaning.

The current `userView` branch in `selected_card.html` is a candidature-linked custom user view text blob/editor with reference details. Profile/CV data appears in the inspector panel, not as a dedicated User View control center. This does not yet satisfy the planned profile/career/template/settings workspace.

Assessment: exists as a preset, but needs redesign into a dedicated user/profile/settings view.

### Smart View

Exists but is incomplete.

The current `smartView` branch provides recruiter-call framing, search, selected candidature summary, call material, quick annotation/todo/task forms, notes, keywords, pending tasks, and artifacts. It does not yet implement the required right-panel module selector for Notes, Keywords, Artifacts, Call card, Company research, Form answers, and Agent suggestions. It shows notes as a recent-note list and uses a visible quick-annotation form, not the required single primary note field.

Assessment: useful starting point, but must be rebuilt around compact list + selected detail + right context modules + primary note.

### Detailed View

Exists but conflicts with the target model.

The current `detailedView` branch is a selected-candidature detail/editor page with core fields, detail fields, document actions, generative task actions, and completed task results. It is not a table/grid with all candidatures as rows and columns.

Assessment: must be replaced or substantially refactored. Current field/edit logic may be reusable for selected-row detail/toolbox, but the view model is wrong for Detailed View.

### Duplicated read/edit boxes

Current Jinja templates usually render a value once with a collapsed inline edit `<details>` next to it. This is closer to the desired inline-edit model than older duplicated read/edit boxes.

However, field lists and edit controls are assembled inside templates, especially `selected_card.html`, rather than a clear projection. This makes it hard to verify and reuse consistently.

Assessment: mostly acceptable interaction pattern, but implementation should move field metadata and edit permissions into projection/view-model code.

### Notes model

Current storage has both:

- `applications.notes` as a scalar text field.
- `notes` table as list-like note records.

Current Jinja Smart View primarily shows `selected.notes_records[:5]` and the quick annotation form creates rows in `notes`. Current Jinja Detailed View exposes `applications.notes` as one editable field. Legacy `dashboard.py` exposes `notes` and `call_signals` as inline fields in the notes tab.

Assessment: current Jinja Smart View is list-like and conflicts with the target primary-note interaction. Minimal implementation should project `applications.notes` as `primary_note` and keep `notes_records` as history/context only.

### Forms visible by default

Mixed.

Forms hidden by default:

- New candidature in `dashboard.html` is inside `<details>`.
- New candidature in `inspector.html` is inside `<details>`.
- Profile fact add/edit forms are inside `<details>`.
- Many field editors are inside `<details>`.

Forms visible by default:

- Smart View quick annotation, meeting/follow-up, and ask-agent forms are visible as action cards in full mode.
- Detailed View document action and generative task forms are visible as action cards in full mode.
- User View custom editor form is visible in full mode.

Assessment: current code does not fully satisfy the requirement that forms are hidden by default in expandable panels.

### Read-only/static-demo restrictions

Read-only:

- FastAPI dashboard action routes are blocked by the `writable()` dependency in read-only mode.
- Templates omit write controls using `can_write(mode)`.
- Tests cover read-only blocking in `tests/test_fastapi_server.py` and read-only control removal in `tests/test_dashboard_views.py` and `tests/test_dashboard_modes.py`.

Static demo:

- `export_static_demo()` uses fake `examples/demo_payload.json` and renders with `Mode.STATIC_DEMO` through the legacy renderer.
- Tests verify fake demo content and absence of raw intake, write controls, private paths, unresolved variables, email-like strings, and phone-like strings.

Assessment: read-only is relatively well enforced. Static demo restrictions are tested, but static export is currently tied to the legacy renderer rather than the Jinja four-view path.

## Projection assessment

### Do projection/view-model builders already exist?

Yes, partially.

`dashboard_view_model()` in `aaaat/dashboard_views.py` is an existing view-model builder. It normalizes view, selection, keyword, search, tasks, todos, glossary, profile facts, selected candidature, and selected user view.

However, it is not yet the structured projection required by the planning pack. It returns broad shared context, not clear per-view projections such as `welcome`, `user`, `smart`, `detailed`, `permissions`, `view_state`, `smart.primary_note`, `detailed.rows`, `detailed.columns`, or `detailed.task_queue_summary`.

### Where is dashboard state assembled today?

- Service/data functions:
  - `aaaat/db.py`, `aaaat/candidatures.py`, `aaaat/notes.py`, `aaaat/tasks.py`, `aaaat/todos.py`, `aaaat/profile_facts.py`, `aaaat/artifacts.py`, `aaaat/keywords.py` provide raw domain data.

- Payload builder:
  - `aaaat/payload.py` builds base dashboard payload and review queue.

- Route helper:
  - `create_dashboard_app().make_view_model()` in `aaaat/server_fastapi.py` calls `dashboard_payload()` then `dashboard_view_model()`.

- View-model builder:
  - `aaaat/dashboard_views.py.dashboard_view_model()` assembles broad state and selected related records.

- Templates:
  - `dashboard.html`, `selected_card.html`, and `inspector.html` assemble many view-specific decisions, including field lists, panel branches, form visibility, Smart View notes, Detailed View fields/actions, User View editor, profile panel, and task/result group rendering.

- Legacy renderer:
  - `aaaat/dashboard.py` assembles an independent HTML/state path for legacy dashboard and static export.

### Transformations that should move into projection/view-model code

Move these out of templates first:

- Current view state object: `current_view`, selected candidature reference, selected keyword, search query, selected right-panel module, selected table row, visible columns, column order, filters.
- Permissions object: `can_write`, `can_show_raw_intake`, `is_static_demo`, `show_private_data`, `allow_dashboard_actions`.
- Welcome projection: setup state, empty-state status, primary actions, open todo/task summaries, important/recent candidatures.
- User projection: profile/career/template/settings summaries, profile facts grouped for dashboard, editable panel descriptors.
- Smart projection: compact candidature summaries, selected candidature operational detail, primary note state, right context modules, selected keyword definition, artifact summary, call-card summary.
- Detailed projection: row list, available columns, visible columns, column order, filter/search state, selected row, selected-row action toolbox, general toolbox actions, task queue summary.
- Field metadata: labels, editable fields, destination action, textarea vs input, missing/fallback text.
- Task/action grouping: pending/review/failed/deferred/completed summaries for human dashboard.
- Artifact summary: current vs archived artifacts and review state labels.
- Static demo projection: fake-only data, no write/raw controls, no private profile facts or career plans.

### Where the projection layer should live

Recommended minimal path:

1. Add a new internal module `aaaat/dashboard_projection.py` for projection builders, or split projection functions into `aaaat/dashboard_views.py` only if a new file is considered unnecessary.
2. Keep `aaaat/dashboard_views.py` responsible for Jinja environment, template rendering, and fragment rendering.
3. Make `dashboard_view_model()` either move into `aaaat/dashboard_projection.py` or become a thin compatibility wrapper around projection builders.
4. Keep `aaaat/payload.py` as a lower-level data payload loader, not the final UI projection.
5. Do not expose projection builders through agent routes, MCP descriptor, or broad HTTP JSON routes.

Preferred shape:

```text
aaaat/dashboard_projection.py
  build_dashboard_projection(...)
  build_view_state(...)
  build_permissions(...)
  build_welcome_projection(...)
  build_user_projection(...)
  build_smart_projection(...)
  build_detailed_projection(...)
```

Then:

```text
aaaat/dashboard_views.py
  dashboard_view_model(...) -> build_dashboard_projection(...)
  render_dashboard_view(...)
  render_dashboard_fragment(...)
```

### Projection outputs to create first

First projection outputs should be small and directly tied to planned tests:

```text
mode
permissions
view_state
welcome
user
smart
detailed
glossary
assets/theme metadata if represented
```

Minimum useful nested outputs:

```text
permissions:
  can_write
  can_show_raw_intake
  is_static_demo
  allow_dashboard_actions

view_state:
  current_view
  selected_application_id
  selected_keyword
  selected_context_module
  search_query

smart:
  candidature_summaries
  selected_candidature_detail
  primary_note
  context_modules
  selected_keyword_definition
  artifact_summary

user:
  profile_summary
  career_summary
  template_summary
  settings_panels

welcome:
  setup_state
  primary_actions
  open_todo_summary
  open_task_summary
  important_candidatures

detailed:
  rows
  available_columns
  visible_columns
  column_order
  filters
  selected_row
  toolbox_actions
  task_queue_summary
```

### Projection outputs that must not become public/agent API

Do not expose any of these as agent-facing outputs:

- Full dashboard projection dump.
- Full dashboard payload.
- Full Detailed View table/grid export.
- Full candidature rows with internal IDs as mutation authority.
- Full profile/career summaries for agent use outside existing bounded context bundles.
- Profile fact IDs, career-plan IDs, artifact IDs, task IDs, note IDs, todo IDs, blob IDs as mutation handles.
- Dashboard action URLs as machine contract.
- Static asset or fragment routes as machine contract.

## Minimal implementation strategy

### Change first

1. Add projection tests before or alongside code:
   - Projection can be built without rendering HTML templates.
   - Projection has `permissions`, `view_state`, `welcome`, `user`, `smart`, and `detailed` sections.
   - Smart projection exposes `primary_note` from `applications.notes`.
   - Detailed projection exposes rows/columns, not only selected-candidature fields.
   - Projection is not available from `create_agent_app()` routes.

2. Introduce `aaaat/dashboard_projection.py` or refactor `dashboard_view_model()` into projection builder functions.

3. Keep the Jinja renderer as the primary dashboard path and make templates consume projection sections.

4. Build Smart View projection first:
   - compact candidature summaries;
   - selected operational detail;
   - primary note state;
   - context module descriptors.

5. Build Detailed View projection next:
   - candidature rows;
   - available/visible columns;
   - selected row context;
   - toolbox actions;
   - task queue summary.

6. Migrate static export to use Jinja/projection only after projection tests are stable.

### Do not touch initially

- Do not change `create_agent_app()` route set except tests that assert absence of dashboard leakage.
- Do not add a dashboard projection HTTP endpoint.
- Do not add projection data to MCP descriptor or agent CLI commands.
- Do not implement a compatibility descriptor or host adapter.
- Do not rewrite storage/schema unless primary note cannot be projected from `applications.notes`.
- Do not replace FastAPI/Jinja/htmx with a frontend framework.
- Do not remove legacy renderer until static export and tests are safely migrated.

### Tests to update before or alongside implementation

Add or update:

- `tests/test_dashboard_projection.py` for projection contract.
- `tests/test_dashboard_views.py` for four-view rendering using projection sections.
- `tests/test_dashboard_modes.py` should eventually move from legacy renderer to Jinja/projection mode checks, or remain as legacy compatibility only.
- `tests/test_static_export.py` when static export migrates to Jinja/projection.
- `tests/test_fastapi_server.py` to keep agent runtime route set narrow and prove dashboard projection is not mounted in the agent app.

Do not test exact CSS, exact copy, or transient DOM structure. Prefer stable markers and projection keys.

### What should remain server-rendered

- Overall dashboard page.
- Dashboard fragments.
- Forms and dashboard actions.
- Read-only/full/static-demo mode rendering.
- Static demo export.

### Where minimal JavaScript is acceptable

Use the existing htmx pattern or minimal client-side behavior for:

- Fragment updates.
- Panel expand/collapse behavior where native `<details>` is insufficient.
- View-state query parameter updates.
- Detailed View column visibility/reorder/search/filter if server-rendered controls are too heavy.
- Theme toggle if added later.

Do not introduce a frontend framework in this branch.

## Runtime boundary risks

### Dashboard payload/projection leakage

Potential leakage paths to avoid:

- Adding `GET /api/dashboard-projection` to the agent app.
- Adding full projection output to `POST /api/agent/context-bundle`.
- Adding projection resources/tools to the MCP descriptor.
- Reusing `dashboard_payload()` or `dashboard_view_model()` inside `create_agent_app()`.
- Copying legacy `/api/dashboard-payload` or `/api/applications` behavior into the agent runtime.

### Broad CRUD/list/search routes not to copy into agent runtime

Dashboard/local-human surfaces may use broad local operations, but the agent runtime must not copy or expose:

- `/api/dashboard-payload`
- `/api/applications`
- `/api/applications/{id}/context`
- `/dashboard/fragments/*`
- `/dashboard/actions/*`
- application/candidature CRUD by ID
- note/todo/blob/artifact/profile fact CRUD by ID
- dashboard table/grid search/list routes
- raw profile/career dumps

The legacy `AAAATHandler` in `aaaat/server.py` still contains some broad `/api/*` routes. Treat them as legacy/local-dashboard history, not as agent architecture.

### Internal IDs safe in human-local HTML but unsafe for agents

The current dashboard uses internal IDs in human-local HTML/form URLs:

- `selected.id` / application ID in links and forms.
- `candidature_id` in `/dashboard/actions/candidatures/{candidature_id}`.
- `task.id` in `/dashboard/actions/tasks/{task_id}/apply` and `/complete`.
- `fact.id` in profile fact edit/archive forms.
- `artifact.id` in legacy artifact state forms.
- `application_id` hidden inputs in dashboard forms.
- note/todo/blob/task/profile/artifact IDs from related records where templates display or submit actions.

These are acceptable in the human-local dashboard runtime. They must not become agent mutation authority, agent acknowledgements, MCP resources, or agent context bundle handles.

## Risks and unknowns

### Missing fields

- The current schema has `applications.notes` and `notes` table, but no explicit `primary_note` field name. Projection should initially map `applications.notes` to `smart.primary_note`.
- Detailed View column metadata is not centralized. Core/detail field lists currently live in `selected_card.html`.
- Career plan/profile/template summaries for User View are not yet shaped as dashboard projection sections.
- Agent suggestions are listed in planning as a Smart context module, but no clear current dashboard projection source was identified in inspected files beyond tasks/text blobs/review queue.

### Unclear templates

- `selected_card.html` contains most view-specific branching and should be decomposed cautiously.
- `inspector.html` mixes view-specific inspector content, new-candidature form, and profile/CV data.
- `candidature_list.html` is reused for both candidature list and search fragments and does not yet distinguish Smart compact list from Detailed table rows.

### Brittle tests

- Some tests assert specific strings and DOM hooks in the current templates. They are useful but may need rewriting around projection semantics.
- `tests/test_dashboard_modes.py` tests the legacy renderer, not the Jinja renderer that should receive new work.
- Static export tests currently validate the legacy renderer path.

### Asset/theme uncertainty

- CSS is inline and duplicated between legacy and Jinja renderers.
- No standalone CSS/theme asset was found in inspected files.
- No durable dark-theme implementation was found.
- `AAAATbanner.png` is packaged but not visibly used by the inspected Jinja dashboard template.

### Mode enforcement uncertainty

- Read-only mode is guarded by FastAPI dependencies and template `can_write` checks.
- Static demo mode is currently tested only through legacy static export.
- Jinja rendering with `Mode.STATIC_DEMO` should get explicit tests once static export migrates.

### Primary-note storage uncertainty

- Current data model supports a scalar `applications.notes` field and list-like `notes` records.
- Smart View currently privileges `notes_records` list behavior.
- Minimal implementation should avoid schema migration by projecting `applications.notes` as the primary note and keeping `notes_records` as optional history/call-note context.

### Legacy renderer uncertainty

- `aaaat/dashboard.py` is still covered by tests and used by static export.
- Removing it immediately would likely create unnecessary churn.
- The safer path is to build projection/Jinja first, migrate static export, then decide whether legacy renderer remains as compatibility only.

## Final recommendation

`READY_WITH_CAUTION`

The repository is ready for projection implementation, but the next agent should treat the current Jinja `dashboard_view_model()` as a starting point, not as the final projection boundary. The first implementation pass should add an internal projection builder, move view-specific state out of templates, project `applications.notes` as the primary note, rebuild Detailed View as a row/column model, and preserve the existing dashboard/agent runtime split.

Suggested next implementation prompt:

```text
You are working on AAAAT.

Repository: DidacLL/AAAAT
Base branch: didacll/dashboard-design

Implement the minimal internal dashboard projection/view-state layer needed for the four-view redesign.

Read first:
- docs/planning/dashboard/07-dashboard-requirements-trace.md
- docs/planning/dashboard/08-current-dashboard-implementation-map.md
- aaaat/dashboard_views.py
- aaaat/templates_ui/dashboard.html
- aaaat/templates_ui/partials/selected_card.html
- aaaat/templates_ui/partials/inspector.html
- aaaat/server_fastapi.py
- tests/test_dashboard_views.py
- tests/test_fastapi_server.py

Goal:
Create an internal dashboard projection builder that prepares structured state for Welcome, User, Smart, and Detailed views before HTML rendering.

Constraints:
- Keep server-rendered Jinja HTML.
- Do not expose projection as an agent API, MCP resource, broad HTTP JSON route, or provider integration.
- Do not change `create_agent_app()` route set except for tests proving absence of dashboard/projection leakage.
- Do not implement a frontend framework migration.
- Do not rewrite storage/schema unless unavoidable.
- Use `applications.notes` as the initial primary-note source and keep list notes as history/context.
- Add projection tests before or alongside template changes.
```
