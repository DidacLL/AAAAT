# Security Model

AAAAT binds the local server to `127.0.0.1` by default and stores private data in `.private/`.

Modes:
- Full local: normal local working dashboard with viewing, annotations, queue inspection, contextual edits, and raw-offer intake.
- Read-only: same private data without write/raw intake controls; write requests return `403`.
- Static demo: fake data only, no backend, no write/raw intake controls.
- Agent API: capability-scoped HTTP adapter exposing `/api/health` and `/api/agent/*`.

Agent access is capability-scoped. The implemented capability is the task protocol: agents receive task envelopes and task-specific context from `aaaat.agent_access`; they submit task results with provenance. Agents do not receive database browsing or generic object-mutation surfaces.

Future LLM-app integration should use an action-session protocol:

1. The agent requests a purpose-scoped context bundle using existing profile exposure policy.
2. The agent submits one bounded action, such as creating a candidature from already-inferred fields, storing form answers, storing cover-letter body text as render input, requesting local rendering, or submitting an existing task result.

This is not CRUD. The supported contract should not depend on internal AAAAT object identifiers.

The dashboard is server-rendered from SQLite through Python. Browser actions use narrow form/htmx routes under `/dashboard/actions/*` and are local human UI internals, not an agent API.

Aggregate candidature lists are private behavioral data.

Generated private artifacts remain local. AAAAT renders artifacts from local templates, profile/application data, and explicit render inputs. Agents may provide template data such as cover-letter body text, but they do not provide final generated artifact files as the authoritative artifact output.

Private reusable values are stored as variables with stable placeholders. Profile inputs such as `display_name` are canonicalized to `profile.display_name` and represented as `{{ profile.display_name }}` for agent work. Local rendering can resolve real values; agent contexts resolve according to each variable exposure policy (`raw`, `redacted`, `summarized`, `placeholder`, or `denied`); static demos never resolve real values.

# Profile Facts

AAAAT separates two profile data layers:

- `variables`: scalar placeholders and private template values, such as `profile.email`.
- `profile_facts`: structured professional/CV facts, such as skills, projects, education, salary expectations, preferences, and reusable summaries.

Profile facts carry editable `visibility`, `exposure`, and usage flags. Local dashboard contexts may show raw facts, but agent and market contexts must respect exposure. Market research should prefer anonymized or summarized profile facts and must not rely on raw sensitive facts by default.

Static demos must omit real profile facts or use fake profile facts only.

AAAAT cannot fully protect private data from an agent with direct `.private/` filesystem access, shell access sufficient to inspect the database, arbitrary localhost access to a running dashboard, or code modification ability. The capability-scoped protocol reduces accidental over-exposure through the supported adapters.
