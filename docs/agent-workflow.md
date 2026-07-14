# Agent workflow

AAAAT is provider-agnostic. It does not require a specific model, provider, SDK, or external agent. Agent-compatible workflows are optional and bounded.

Do not treat AAAAT as an agent runtime, a chat application, or a broad CRUD API. AAAAT stores local data and exposes limited task/context/action capabilities so external tooling can help without receiving unrestricted access to the local job-search database.

## Local runtime

The wx desktop app is the human working UI:

```bash
aaaat-desktop
```

The desktop may show rich local private state because it is for the user on the local machine. Agent-compatible commands must remain narrow and task-scoped.

## Task workflow

AAAAT-originated work follows this shape:

1. AAAAT or the user creates a task.
2. An external tool asks for the next queued task or queued task envelopes.
3. The tool requests context for one task handle.
4. AAAAT returns bounded task context.
5. The external tool produces a result outside AAAAT.
6. The tool submits that result to the same task handle.
7. AAAAT stores the result with provenance.
8. AAAAT applies results only through local deterministic review/apply logic.

Useful CLI commands:

```bash
aaaat task create --application-id <application_id> --type company_research --title "Research company"
aaaat agent next
aaaat agent context <task_handle>
aaaat agent packet <task_handle>
aaaat agent submit <task_handle> --result-file result.json
aaaat task apply <task_id>
```

A task handle is a task callback handle. It is not authority to browse or mutate arbitrary local records.

## Action-session workflow

When work starts outside AAAAT, the external tool can use a bounded action-session flow:

```bash
aaaat agent context-bundle --purpose cover_letter
aaaat agent action submit --input-file action.json
```

The action packet can request a supported bounded action, such as creating a candidature from already-derived fields, storing research/form-answer material, storing cover-letter body text as render input, requesting local rendering, or asking AAAAT to queue supported follow-up tasks.

Action acknowledgements should remain narrow. They must not return application IDs, candidature IDs, artifact IDs, file paths, storage paths, note IDs, todo IDs, blob IDs, or broad database handles as mutation authority.

## MCP-compatible descriptor

AAAAT currently provides a dependency-free MCP-compatible descriptor and validation command:

```bash
aaaat mcp-descriptor
aaaat mcp-validate
```

This is descriptor/tool-schema compatibility for local adapters. It is not a full MCP server implementation. AAAAT does not currently provide stdio, SSE, or streamable HTTP MCP server transport.

External tooling can consume the descriptor and map its resources/tools to the CLI commands above. Do not document AAAAT as a direct MCP server unless an actual MCP transport is implemented.

## Artifact boundary

External agents or tools may provide draft content or structured results. AAAAT renders final local artifacts from local templates and stored data.

For cover letters, an external tool may supply the body text that fills the local render input. AAAAT renders the output locally and records the artifact.

For CVs, external tools should supply or improve bounded data used by the local template. They should not submit final generated files as authoritative AAAAT artifacts.

## Provider-agnostic metadata

Some commands accept optional provenance fields such as `agent_name`, `agent_runtime`, or `model_provider`. These are metadata only. They do not configure a provider, call a provider, or make AAAAT dependent on any provider.

## Safety rule

The agent is not the user. Agent-supplied text should land in explicit task results, candidature fields, form answers, research/preparation fields, render inputs, or bounded future-task requests. Human notes and desktop actions remain local user operations unless a future bounded action explicitly defines otherwise.
