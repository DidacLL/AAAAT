# AAAAT MCP server

AAAAT ships an operational dependency-free MCP server over stdio:

```bash
aaaat-mcp --storage /path/to/private-aaaat
```

The external AI host starts this process as its MCP server. The host owns the provider, model, credentials, network policy and reasoning runtime. AAAAT owns the local queue, bounded context, validation, persistence and artifact rendering.

## Tool surface

```text
get_next_agent_work
report_agent_task_progress
submit_agent_task_result
submit_agent_action
```

`get_next_agent_work` atomically claims one queued task attempt and returns one complete bounded work item containing:

- a random attempt-scoped `task_capability`;
- task type, purpose, title and instructions;
- all purpose-scoped `input_context` required for that task;
- the permitted result schema;
- privacy/disclosure notes;
- permitted callback actions.

There is no separate context-fetch tool. The external host must not use the capability to enumerate or inspect other records.

## Capability semantics

`task_capability` is a random callback capability stored privately against one internal task attempt. It is not a task ID, candidature ID, database key, file path, or stable entity identifier.

It may be used only to:

- report progress for the claimed attempt;
- submit one result for that attempt.

Completed, cancelled and superseded attempts reject further progress or results.

## Progress

`report_agent_task_progress` accepts:

```json
{
  "task_capability": "taskcap_...",
  "phase": "working",
  "message": "Drafting the result",
  "percent": 40
}
```

Supported phases are bounded and task-scoped. Progress is persisted locally and cannot mutate candidature data.

## Result submission

`submit_agent_task_result` accepts one JSON object matching the work item's `response_format`. Every result enters the same canonical ingestion and domain-application path used by browser and portable wrappers.

Results containing internal IDs, storage paths, file paths, or unsupported authority are rejected.

## Resources

The server exposes one read-only guide resource:

```text
aaaat://agent-guide
```

Work acquisition is a tool, not a resource read, because it atomically claims an attempt.

## Descriptor and validation

```bash
aaaat mcp-descriptor
aaaat mcp-validate
```

The descriptor is generated from the same operational tool definitions. It does not describe unavailable prompts, split context resources, broad CRUD operations, or provider-specific behavior.

## Connection configuration

A shell-capable external host typically needs only:

```json
{
  "command": "aaaat-mcp",
  "args": ["--storage", "/path/to/private-aaaat"]
}
```

The configuration belongs to the external host. AAAAT does not ingest or install generated connector packages.

## Boundaries

The MCP server must never expose:

- SQLite or arbitrary local files;
- internal IDs as mutation authority;
- broad candidature/profile listing or search;
- dashboard projections;
- provider credentials or model configuration;
- a generic command catalogue;
- a second queue or result-application path.
