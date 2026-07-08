# Annex D — Docs and MCP Contract Updates

Update these files when the agent/MCP contract changes:

```text
AGENTS.md
docs/agent-guide.md
docs/agent-workflow.md
docs/security-model.md
docs/openapi.md
docs/cli.md
docs/mcp.md
aaaat/mcp_server.py
tests/test_cli_mcp.py
```

## Required content shape

Agent-facing docs must present a capability-scoped agent contract. The implemented capabilities are task packets, bounded task-result submission, purpose-scoped context bundles, and bounded action-session packets. They are not CRUD and not raw-offer upload.

Recommended wording:

> Agents interact with AAAAT through capability-scoped operations with explicit input/output schemas. Agents may request purpose-scoped context, then submit one bounded task result or one bounded action. Agents must not browse, list, search, or patch the user's candidature database.

## Required actor split

Docs must distinguish two directions:

```text
AAAAT-originated work: AAAAT creates task -> agent returns task result -> AAAAT applies deterministically.
LLM-app-originated work: LLM already did the reasoning -> AAAAT receives bounded action data -> AAAAT stores/renders locally.
```

Docs must state that the LLM is not the user and does not create final artifacts. AAAAT renders CVs and cover letters locally from templates, profile/application data, and explicit render inputs.

## Remove from agent-facing contract

Do not advertise broad object-style routes/resources/tools as agent capabilities. Dashboard/local human commands may still exist, but they are not the agent contract.

Avoid docs that frame agent integration as:

```text
agent raw-offer upload
structured extraction proposal endpoint
generic candidature create/update/list/show
LLM-generated final artifact file submission
agent-written human notes
```

## MCP descriptor

AAAAT currently implements MCP-compatible descriptor and tool-schema metadata only. It does not implement a full MCP server transport.

Implemented resources:

```text
aaaat://agent/tasks/next
aaaat://agent/tasks/{task_handle}/context
aaaat://agent/context-bundle
aaaat://agent-guide
```

Implemented tools:

```text
get_next_agent_task
get_agent_task_context
submit_agent_task_result
get_agent_context_bundle
submit_agent_action
```

Implemented prompts:

```text
complete_agent_task
review_task_context
```

The descriptor is exposed through:

```text
python -m aaaat.cli mcp-descriptor
python -m aaaat.cli mcp-validate
```

Do not describe AAAAT as providing an MCP server unless a real transport exists. Current non-implemented MCP transports include stdio, SSE, and streamable HTTP.

A local adapter may consume the descriptor and map its tools/resources to AAAAT CLI commands or local agent HTTP routes.

Prompts may remain capability-oriented, but should produce task results or bounded action payloads rather than call broad CRUD.

## Documentation must be honest

State clearly:

- docs do not enforce security;
- route absence and narrow service functions enforce the agent surface;
- if an agent has `.private/`, shell, or arbitrary localhost access, AAAAT cannot fully constrain it;
- aggregate candidature lists are private behavioral data;
- MCP compatibility means descriptor/tool-schema compatibility until a real MCP server transport is implemented.
