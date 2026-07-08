# Security Model

AAAAT binds local servers to `127.0.0.1` by default and stores private data in `.private/`.

AAAAT has two separate runtimes:

- Dashboard runtime: local human UI with server-rendered HTML, static assets, fragments, and `/dashboard/actions/*` form actions.
- Agent runtime: machine-facing capability adapter with only bounded task, context, and action routes.

The dashboard runtime is not an agent API. Its HTML and form URLs may contain private internal identifiers because it is human-local.

The agent runtime exposes only:

```text
GET  /api/health
GET  /api/agent/tasks/next
GET  /api/agent/tasks/{task_handle}/context
POST /api/agent/tasks/{task_handle}/result
POST /api/agent/context-bundle
POST /api/agent/actions
```

Agent access is capability-scoped. A task handle is valid only for fetching bounded context and submitting a JSON result for that task. It is an opaque callback handle, not the local task row identifier and not generic entity authority. AAAAT owns applying task results to internal records.

Agent task context is self-contained for supported task types. It carries instructions, purpose, input context, output contract, response format, allowed actions, and privacy notes. Agent output should match the response format and must not include entity IDs as mutation authority.

The agent runtime must not expose dashboard HTML, static assets, fragments, dashboard actions, generated API docs, OpenAPI JSON, broad lists, broad search, profile dumps, candidature CRUD, application CRUD, note/todo/blob CRUD, artifact CRUD, career-plan CRUD, or entity-ID mutation routes.

The action-session protocol is not CRUD. The agent may request a purpose-scoped context bundle and submit one bounded action, such as creating a new candidature from already-inferred fields, storing form answers, storing cover-letter body text as render input, requesting local rendering, or requesting bounded future work through `requested_tasks`.

`requested_tasks` is accepted only inside `create_candidature`. AAAAT validates the requested task type, binds accepted tasks internally to the new candidature, stores the reason as task instructions/notes, and returns only `queued.count`. It does not return task IDs, application IDs, candidature IDs, artifact IDs, blob IDs, file paths, storage paths, or database row IDs in the acknowledgement.

Agent contexts and acknowledgements should be narrow and should not return application, candidature, profile-fact, career-plan, artifact, storage, file-path, note, todo, task, or blob identifiers as mutation handles. Agent-scoped profile facts use `fact_ref` and non-ID placeholders rather than profile-fact row IDs. Agent-scoped career plans use `plan_ref` rather than career-plan row IDs.

Generated private artifacts remain local. AAAAT renders artifacts from local templates, profile/application data, and explicit render inputs. Agents may provide template data such as cover-letter body text, but they do not provide final generated artifact files as authoritative artifact output.

Private reusable values are stored as variables with stable placeholders. Profile inputs such as `display_name` are canonicalized to `profile.display_name` and represented as `{{ profile.display_name }}` for agent work. Local rendering can resolve real values; agent contexts resolve according to each variable exposure policy (`raw`, `redacted`, `summarized`, `placeholder`, or `denied`); static demos never resolve real values.

## Profile Facts

AAAAT separates two profile data layers:

- `variables`: scalar placeholders and private template values, such as `profile.email`.
- `profile_facts`: structured professional/CV facts, such as skills, projects, education, salary expectations, preferences, and reusable summaries.

Profile facts carry editable `visibility`, `exposure`, and usage flags. Local dashboard contexts may show raw facts and internal row IDs, but agent and market contexts must respect exposure and must not expose profile-fact row IDs. Market research should prefer anonymized or summarized profile facts and must not rely on raw sensitive facts by default.

## Career Plans

Career plans are local first-class records for career strategy, objectives, constraints, target markets, and target roles. They may be managed by local/admin surfaces. Agent exposure is limited to bounded context bundles for `cover_letter`, `cv_generation`, `candidature_fit`, `market_research`, `recruiter_call`, `form_answers`, and `career_plan_review`.

Agent bundles expose active career plans as read-only context with non-ID `plan_ref` labels. They do not expose career-plan row IDs, storage paths, or mutation routes.

Static demos must omit real profile facts and career plans or use fake data only.

AAAAT cannot fully protect private data from an agent with direct `.private/` filesystem access, shell access sufficient to inspect the database, arbitrary localhost access to a running dashboard, or code modification ability. The capability-scoped protocol reduces accidental over-exposure through the supported adapters.
