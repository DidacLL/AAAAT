# Security Model

AAAAT v1 is a single-user local desktop application. The canonical human runtime is the wx desktop app:

```bash
aaaat-desktop
```

Private local data lives under `.private/` by default, or another explicit local storage path supplied by the user.

## Runtime boundary

AAAAT has two supported access planes:

- Human/local desktop plane: the wx desktop UI for the local user.
- Agent-compatible plane: bounded CLI/descriptor operations for task/context/action work.

The desktop plane may show and edit rich local private state because it is the user's own local UI. The agent-compatible plane is capability-scoped and must not become broad CRUD over the job-search database.

## Agent-compatible commands

The supported agent-compatible operations are exposed through local commands and descriptors, not through a browser dashboard runtime:

```bash
aaaat agent next
aaaat agent context <task_handle>
aaaat agent packet <task_handle>
aaaat agent submit <task_handle> --result-file result.json
aaaat agent context-bundle --purpose cover_letter
aaaat agent action submit --input-file action.json
aaaat mcp-descriptor
aaaat mcp-validate
```

A task handle is valid only for fetching bounded context and submitting a JSON result for that task. It is an opaque callback handle, not the local task row identifier and not generic entity authority. AAAAT owns applying task results to internal records.

Agent task context is self-contained for supported task types. It carries instructions, purpose, input context, output contract, response format, allowed actions, and privacy notes. Agent output should match the response format and must not include entity IDs as mutation authority.

The agent-compatible plane must not expose broad lists, broad search, profile dumps, candidature CRUD, application CRUD, note/todo/blob CRUD, artifact CRUD, career-plan CRUD, or entity-ID mutation routes.

## Action-session boundary

The action-session protocol is not CRUD. The agent may request a purpose-scoped context bundle and submit one bounded action, such as creating a new candidature from already-inferred fields, storing form answers, storing cover-letter body text as render input, requesting local rendering, or requesting bounded future work through `requested_tasks`.

`requested_tasks` is accepted only inside `create_candidature`. AAAAT validates the requested task type, binds accepted tasks internally to the new candidature, stores the reason as task instructions/notes, and returns only `queued.count`. It does not return task IDs, application IDs, candidature IDs, artifact IDs, blob IDs, file paths, storage paths, or database row IDs in the acknowledgement.

Agent contexts and acknowledgements should be narrow and should not return application, candidature, profile-fact, career-plan, artifact, storage, file-path, note, todo, task, or blob identifiers as mutation handles. Agent-scoped profile facts use `fact_ref` and non-ID placeholders rather than profile-fact row IDs. Agent-scoped career plans use `plan_ref` rather than career-plan row IDs.

Generated private artifacts remain local. AAAAT renders artifacts from local templates, profile/application data, and explicit render inputs. Agents may provide template data such as cover-letter body text, but they do not provide final generated artifact files as authoritative artifact output.

## Profile variables

Private reusable values are stored as variables with stable placeholders. Profile inputs such as `display_name` are canonicalized to `profile.display_name` and represented as `{{ profile.display_name }}` for agent work. Local desktop and render code paths resolve real values; agent contexts resolve according to each variable exposure policy: `raw`, `redacted`, `summarized`, `placeholder`, or `denied`.

## Profile facts

AAAAT separates two profile data layers:

- `variables`: scalar placeholders and private template values, such as `profile.email`.
- `profile_facts`: structured professional/CV facts, such as skills, projects, education, salary expectations, preferences, and reusable summaries.

Profile facts carry editable `visibility`, `exposure`, and usage flags. Local desktop code paths may use raw facts and internal row IDs, but agent and market contexts must respect exposure and must not expose profile-fact row IDs. Market research should prefer anonymized or summarized profile facts and must not rely on raw sensitive facts by default.

## Career plans

Career plans are local first-class records for career strategy, objectives, constraints, target markets, and target roles. They may be managed by local/admin surfaces. Agent exposure is limited to bounded context bundles for `cover_letter`, `cv_generation`, `candidature_fit`, `market_research`, `recruiter_call`, `form_answers`, and `career_plan_review`.

Agent bundles expose active career plans as bounded context with non-ID `plan_ref` labels. They do not expose career-plan row IDs, storage paths, or mutation routes.

AAAAT cannot fully protect private data from an agent with direct `.private/` filesystem access, shell access sufficient to inspect the database, or code modification ability. The capability-scoped protocol reduces accidental over-exposure through the supported adapters.
