# Dashboard Integration Review

Date: 2026-07-09

Recommendation: `ACCEPT_INTEGRATION`

## PR / branch / head reviewed

Repository: `DidacLL/AAAAT`

Canonical draft PR: `#36`

Canonical branch: `didacll/dashboard-design`

Code head reviewed: `a48bf08813b90bb29997c18a3ee75764f95751e1`

PR state at review start: open draft PR, mergeable, head branch `didacll/dashboard-design`.

Branch-discipline finding: PR `#36` points to the canonical dashboard branch. The review inspected the canonical branch only. Old worker branches were not used as sources of truth. A connector search for open dashboard PRs found only PR `#36`, so no additional open dashboard PR was found competing with the canonical branch.

## CI status

For reviewed code head `a48bf08813b90bb29997c18a3ee75764f95751e1`:

- `CI`: completed successfully.
- `Agent Contract Tests`: completed successfully.

This file is a documentation-only audit artifact added after the reviewed code head.

## Files inspected

Planning and requirements:

- `docs/planning/dashboard/README.md`
- `docs/planning/dashboard/01-dashboard-requirements-review.md`
- `docs/planning/dashboard/02-dashboard-four-view-ux-spec.md`
- `docs/planning/dashboard/03-dashboard-implementation-plan.md`
- `docs/planning/dashboard/04-codex-worker-prompts.md`
- `docs/planning/dashboard/05-dashboard-test-plan.md`
- `docs/planning/dashboard/06-runtime-boundary-notes.md`
- `docs/planning/dashboard/07-dashboard-requirements-trace.md`
- `docs/planning/dashboard/08-current-dashboard-implementation-map.md`

Implementation:

- `aaaat/dashboard_projection.py`
- `aaaat/dashboard_views.py`
- `aaaat/server_fastapi.py`
- `aaaat/mcp_server.py`
- `aaaat/static_export.py`
- `aaaat/dashboard.py`
- `aaaat/templates_ui/dashboard.html`
- `aaaat/templates_ui/partials/candidature_list.html`
- `aaaat/templates_ui/partials/selected_card.html`
- `aaaat/templates_ui/partials/inspector.html`

Tests:

- `tests/test_dashboard_projection.py`
- `tests/test_dashboard_welcome_user_views.py`
- `tests/test_dashboard_smart_view.py`
- `tests/test_dashboard_detailed_view.py`
- `tests/test_dashboard_views.py`
- `tests/test_fastapi_server.py`
- `tests/test_static_export.py`
- `tests/test_cli_mcp.py`

## Projection status

`dashboard_view_model()` delegates dashboard state construction to `build_dashboard_projection()` while keeping rendering in `aaaat/dashboard_views.py`.

The projection contains the required major surfaces:

- `permissions`
- `view_state`
- `welcome`
- `user`
- `smart`
- `detailed`
- `glossary`

The projection builder states that the projection is for the human-local dashboard only and is intentionally not registered as an agent route, MCP resource, or broad JSON API.

Rendering functions remain rendering functions: `render_dashboard_view()` and `render_dashboard_fragment()` render Jinja templates from a supplied or constructed model.

Status: complete for integration.

## Welcome View status

Welcome View is projection-backed through `welcome.primary_actions`, `welcome.setup_state`, task/todo summaries, and limited important-candidature summaries.

Confirmed behavior:

- first-run and empty-state behavior exists;
- primary setup actions are visible;
- setup and creation forms are collapsed by default;
- the standard operational candidature list is not shown by default;
- read-only/static-demo write restrictions inherit from projection permissions and template checks.

Status: integrated.

## User View status

User View is projection-backed through `user.summary_sections`, profile summary data, career summary data, template-variable summary data, and settings summary data.

Confirmed behavior:

- profile, career strategy, CV/template, writing preference, and settings sections exist;
- forms are grouped in collapsed expandable panels;
- the operational candidature list is not shown by default;
- read-only mode hides write controls;
- static-demo mode hides private profile facts and private career strategy content.

Status: integrated.

## Smart View status

Smart View is projection-backed through `smart.candidature_summaries`, `smart.selected_candidature_detail`, `smart.primary_note`, context modules, keyword context, artifact summary, call card, company research, form answers, and agent suggestions.

Confirmed behavior:

- left list is compact and projection-backed;
- left list avoids full notes, long descriptions, and full offer text;
- central panel uses selected-candidature operational detail;
- primary note uses `smart.primary_note`;
- full mode allows primary note editing;
- read-only mode shows the primary note without edit controls;
- historical/list-like notes are secondary metadata, not the primary interaction;
- quick annotation, todo, and agent task forms are not visible in the central Smart View by default;
- right inspector exposes context modules;
- keyword context keeps the selected candidature visible.

Status: integrated.

## Detailed View status

Detailed View is projection-backed through `detailed.rows`, column definitions, visible columns, column order, filters, selected row state, toolbox actions, and human-facing task queue groups.

Confirmed behavior:

- central panel is a table/grid from projected rows and columns;
- old single-candidature field editor is not the main Detailed View;
- no selected row shows the general toolbox;
- selected row shows candidature-specific toolbox actions;
- left panel is a toolbox, not the standard candidature list;
- right panel shows human-facing task queue groups;
- document/generative forms are not visible by default;
- read-only and static-demo restrictions remain intact.

Status: integrated.

## Runtime boundary status

The runtime boundary remains intact.

Confirmed behavior:

- `create_agent_app()` does not mount dashboard HTML;
- the agent app does not mount dashboard static assets;
- the agent app does not expose dashboard fragments;
- the agent app does not expose dashboard actions;
- the agent app does not expose dashboard projection;
- the agent app route set remains capability-scoped: health, next task, task context, task result, context bundle, and bounded actions;
- the agent app does not gain broad candidature/profile CRUD/list/search routes;
- MCP descriptor resources and tools remain capability-scoped and do not expose dashboard projection;
- legacy `aaaat/dashboard.py` was not expanded for this integration.

Status: integrated.

## Static export status

Static export was intentionally not migrated in the dashboard integration pass.

Confirmed behavior:

- `aaaat/static_export.py` still renders static demo output through legacy `aaaat.dashboard.render_dashboard()` with `Mode.STATIC_DEMO`;
- `tests/test_static_export.py` still protects fake-payload behavior, absence of write/raw controls, absence of private storage paths, absence of unresolved template markers, and absence of email/phone-like private data;
- no static export implementation work was performed during this audit.

Static export migration should be planned next only after this integration review is accepted.

Status: accepted as intentional follow-up.

## Missing tests

No blocker-class missing tests were found for the current integration state.

Non-blocking gaps to cover when static export migration is planned:

- explicit test that static export uses the Jinja/projection dashboard path after migration;
- explicit test that the migrated static export still has no write controls, raw controls, private data, private paths, or unresolved template markers;
- optional descriptor assertion that MCP text does not include `dashboard-projection` or equivalent dashboard projection resources.

## Blockers

None.

## Non-blocking cautions

- Static export remains on the legacy renderer. This is expected and should be handled in a separate migration-planning pass, not as part of this integration audit.
- Welcome View includes a limited latest/important-candidature summary. This is not the standard operational list, but it should be checked during manual visual review for clutter.
- The legacy dashboard route and renderer still exist for compatibility. Do not expand them unless static export migration or compatibility work explicitly justifies it.
- `create_app(..., surface=...)` remains as compatibility plumbing. It currently delegates to explicit runtime builders; future work should avoid restoring the old conceptual surface model.

## Final recommendation

`ACCEPT_INTEGRATION`

The canonical branch is coherent, test-backed, and bounded. Do not invent additional dashboard feature work. The next valid options are manual/visual dashboard review or static export migration planning.
