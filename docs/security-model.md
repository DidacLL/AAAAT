# Security Model

AAAAT is local-first. It binds local servers to `127.0.0.1` by default and stores private data in `.private/` or an explicitly configured local storage path.

AAAAT has two separate runtimes.

## Dashboard runtime

The dashboard runtime is the local human UI. It renders private server-side HTML from SQLite, serves dashboard static assets, serves dashboard fragments, and accepts local form actions such as raw-offer intake, candidature edits, profile-fact edits, note/todo/task actions, local rendering, and static-demo export.

The dashboard runtime is not an agent API. Its HTML and form URLs may contain private internal identifiers because the dashboard is human-local only. Do not use dashboard identifiers, fragments, or `/dashboard/actions/*` as part of the agent contract.

Read-only dashboard mode renders the same private local data but blocks dashboard write actions with `403`. Static demo mode uses fake data only, has no backend, and has no write/raw-intake controls.

## Agent runtime

The agent runtime is a separate machine-facing capability adapter. It exists for bounded agent work only. It must not expose dashboard HTML, static UI assets, dashboard fragments, dashboard actions, broad JSON dashboard payloads, broad search, profile dumps, candidature CRUD, application CRUD, note/todo/blob CRUD, artifact CRUD, or entity-ID mutation routes.

The agent may only:

1. obtain the next pending task and a task handle;
2. fetch bounded task context for that task handle;
3. submit a JSON result for that task handle;
4. obtain bounded user/style/career context, including CareerPlan where relevant;
5. create a new candidature from source material or user conversation;
6. request bounded future tasks for deferred work;
7. perform LLM-owned reasoning using bounded context.

A task handle is not a database ID authority. It is valid only for the current task capability: context retrieval and result submission. AAAAT owns applying task results to internal records.

The LLM must not receive `application_id`, `candidature_id`, `profile_fact_id`, `artifact_id`, note IDs, todo IDs, blob IDs, storage paths, or task-related internal IDs as authority to mutate arbitrary local state. Agent acknowledgements should be narrow status packets, for example `status`, `action`, `created`, `rendered`, `queued`, and `next`.

## Profile, CareerPlan, and context exposure

AAAAT separates local user data from agent context. Profile variables and profile facts carry exposure policy. Agent context bundles must be purpose-scoped and bounded. CareerPlan is part of bounded career context where relevant, not a broad profile dump.

Private reusable values are stored as variables with stable placeholders. Profile inputs such as `display_name` are canonicalized to `profile.display_name` and represented as `{{ profile.display_name }}` for agent work. Local rendering can resolve real values; agent contexts resolve according to each exposure policy (`raw`, `redacted`, `summarized`, `placeholder`, or `denied`); static demos never resolve real values.

## Artifact boundary

Generated private artifacts remain local. AAAAT renders artifacts from local templates, profile/application data, and explicit render inputs. Agents may provide template data such as cover-letter body text, but they do not provide final generated artifact files as authoritative artifact output.

## Limits

Docs are descriptive, not enforcement. Runtime separation, route absence, narrow service functions, and capability-scoped adapters reduce accidental over-exposure. AAAAT cannot fully protect private data from an agent with direct `.private/` filesystem access, shell access sufficient to inspect the database, arbitrary localhost access to a running dashboard runtime, or code modification ability.

Generated guardrails and tests should be updated when they conflict with this security model. The durable invariant is capability-bounded agent access, not blacklist maintenance for every private dashboard route.
