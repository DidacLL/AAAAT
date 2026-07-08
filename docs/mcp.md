# MCP descriptor compatibility

AAAAT currently implements MCP-compatible descriptor and tool-schema metadata for its local agent adapter. It does not implement a full MCP server transport.

## What is implemented

Run:

```bash
python -m aaaat.cli mcp-descriptor
python -m aaaat.cli mcp-validate
```

`mcp-descriptor` emits a dependency-free JSON descriptor containing:

- `protocolVersion`
- capability sections for resources, tools, and prompts
- `aaaat://` resource names for the bounded agent task/context surfaces
- tool schemas with `inputSchema`
- prompt metadata for task-oriented prompts

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

The descriptor exposes AAAAT capabilities only. It does not call an LLM, choose a provider, configure model credentials, or bypass AAAAT privacy scopes.

## What is not implemented

AAAAT does not currently ship an MCP server process or transport. In particular, it does not provide:

- stdio MCP server transport
- SSE MCP server transport
- streamable HTTP MCP transport
- a bundled MCP SDK dependency
- provider-specific LLM calls

Do not document or configure AAAAT as a direct MCP server unless a real server transport is added later. For now, external tooling should consume the descriptor and map its tools/resources to AAAAT's CLI or local agent HTTP routes.

## Local adapter mapping

A lightweight adapter can map descriptor tools to existing commands or routes:

```text
get_next_agent_task          -> aaaat agent next
get_agent_task_context       -> aaaat agent context <task_handle>
submit_agent_task_result     -> aaaat agent submit <task_handle> --result-file result.json
get_agent_context_bundle     -> aaaat agent context-bundle --purpose <purpose>
submit_agent_action          -> aaaat agent action submit --input-file action.json
```

HTTP equivalents are documented in `docs/openapi.md`:

```text
GET  /api/agent/tasks/next
GET  /api/agent/tasks/{task_handle}/context
POST /api/agent/tasks/{task_handle}/result
POST /api/agent/context-bundle
POST /api/agent/actions
```

## Contract boundaries

The MCP-compatible descriptor is capability-scoped. It must not expose dashboard HTML, dashboard actions, broad CRUD/list/search APIs, profile dumps, candidature database browsing, artifact mutation by ID, or internal object identifiers as mutation authority.

`task_handle` is the only agent-facing handle for task context/result flow. It is an opaque callback handle, not an application ID, candidature ID, task row ID, profile fact ID, career plan ID, artifact ID, file path, or storage path.

Action acknowledgements remain narrow. They may say that work was accepted, rendered, or queued, but they must not return internal IDs or storage paths by default.

## Validation

`aaaat mcp-validate` is the contract test for the descriptor shape. The test validates that resources, tools, prompts, and tool input schemas are present and that the descriptor stays capability-only.

Adding a full MCP server later is acceptable only if it remains small, dependency-justified, provider-agnostic, and consistent with the same task/action/context contract.
