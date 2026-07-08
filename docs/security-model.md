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

Agent access is capability-scoped. A task handle is valid only for fetching bounded context and submitting a JSON result for that task. AAAAT owns applying task results to internal records.

The agent runtime must not expose dashboard HTML, static assets, fragments, dashboard actions, broad lists, broad search, profile dumps, candidature CRUD, application CRUD, note/todo/blob CRUD, artifact CRUD, or entity-ID mutation routes.

The action-session protocol is not CRUD. The agent may request a purpose-scoped context bundle and submit one bounded action, such as creating a new candidature from already-inferred fields, storing form answers, storing cover-letter body text as render input, or requesting local rendering.

Agent acknowledgements should be narrow and should not return application, candidature, profile-fact, artifact, storage, file-path, note, todo, or blob identifiers as mutation handles.

Generated private artifacts remain local. AAAAT renders artifacts from local templates, profile/application data, and explicit render inputs. Agents may provide template data such as cover-letter body text, but they do not provide final generated artifact files as authoritative artifact output.

Private reusable values are stored as variables with stable placeholders. Profile inputs such as `display_name` are canonicalized to `profile.display_name` and represented as `{{ profile.display_name }}` for agent work. Local rendering can resolve real values; agent contexts resolve according to each variable exposure policy (`raw`, `redacted`, `summarized`, `placeholder`, or `denied`); static demos never resolve real values.

## Profile Facts

AAAAT separates two profile data layers:

- `variables`: scalar placeholders and private template values, such as `profile.email`.
- `profile_facts`: structured professional/CV facts, such as skills, projects, education, salary expectations, preferences, and reusable summaries.

Profile facts carry editable `visibility`, `exposure`, and usage flags. Local dashboard contexts may show raw facts, but agent and market contexts must respect exposure. Market research should prefer anonymized or summarized profile facts and must not rely on raw sensitive facts by default.

Static demos must omit real profile facts or use fake profile facts only.

AAAAT cannot fully protect private data from an agent with direct `.private/` filesystem access, shell access sufficient to inspect the database, arbitrary localhost access to a running dashboard, or code modification ability. The capability-scoped protocol reduces accidental over-exposure through the supported adapters.
