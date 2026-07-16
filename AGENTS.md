# AAAAT Agent Instructions

AAAAT is a local-first job-application workspace. It is not an LLM runtime, provider SDK, general agent orchestrator, or broad CRUD API.

## Connected LLMs

A connected LLM is the user's intelligent setup and assistance surface. It should
discover its own host capabilities and, with the user's approval, choose and
configure the best host-native connection: MCP first when available, otherwise
a host tool, skill, approved script, browser/native bridge, or host-owned
automation. It may give provider-specific instructions or create host-side
configuration when its host permits it. Do not turn this into a provider SDK or
credential store inside AAAAT.

AAAAT keeps the local product boundary: it supplies a concise connection brief,
validates the bounded work/result protocol, applies results locally, and never
requires a normal user to know a storage path, a database, an internal ID, or a
command. Portable copy/file exchange is a last fallback, not the primary setup.

The distinction matters: host setup is user-directed intelligence; a claimed
work item is deliberately limited local authority. Do not apply the task-worker
limits to the host's own setup work.

The canonical human runtime is the wx desktop application. External AI hosts consume one bounded queue through thin adapters.

## Bounded work

Use one acquisition operation:

```bash
aaaat agent next
```

It atomically claims one eligible task and returns the complete purpose-scoped work item, including instructions, input context, response schema, privacy notes, allowed actions, and a random attempt-scoped `task_capability`.

Do not request a second context or packet. Those split surfaces do not exist.

Submit one structured result through the same capability:

```bash
aaaat agent submit <task_capability> --result-file result.json
```

The capability is not a database ID or entity mutation handle. Never return internal IDs, storage paths, arbitrary file paths, or broad local records.

## Bounded actions

External hosts may submit explicitly supported actions, currently including creation of a new candidature from supplied source material and outputs:

```bash
aaaat agent action submit --input-file action.json
```

AAAAT validates the action, creates local records and follow-up tasks internally, renders local artifacts, and returns a narrow acknowledgement.

## MCP

AAAAT ships a dependency-free stdio MCP server:

```bash
aaaat-mcp --storage .private
```

Its operational tools map to the same services: claim next work, report task progress, submit a task result, and submit a bounded action. MCP is not a second queue or mutation path.

## Boundaries

Provider/model selection, credentials, inference, research tooling, network policy,
and host-specific configuration belong to the external host. AAAAT must not
request or store those credentials. Provider or model names may be returned only
as optional provenance.

The agent is not the user. Human notes and desktop edits remain human operations. Do not place private values in source templates, public examples, demo data, or documentation.
