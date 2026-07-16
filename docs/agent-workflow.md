# Agent workflow

AAAAT stores local data, owns the task queue, validates results, applies domain changes, and renders local artifacts. External hosts own reasoning and generation.

The wx desktop application is the canonical v1 human runtime:

```bash
aaaat-desktop
```

## AAAAT-originated work

1. AAAAT creates a bounded task.
2. An external host atomically claims the next eligible task.
3. AAAAT returns one complete purpose-scoped work item.
4. The host reasons outside AAAAT and may report task-scoped progress.
5. The host submits one structured result using the returned random capability.
6. AAAAT validates and applies the result through its canonical domain path.

CLI acquisition and submission:

```bash
aaaat agent next
aaaat agent submit <task_capability> --result-file result.json
```

There is no separate context-fetch, packet-build, or dispatch operation. A work item already contains its instructions, bounded context, output contract, response schema, privacy notes, and allowed actions.

`task_capability` is random, stored, and attempt-scoped. It is not a task row ID, application ID, candidature ID, artifact ID, file path, or general mutation authority.

## External-host-originated work

An external host may submit one explicitly supported bounded action:

```bash
aaaat agent action submit --input-file action.json
```

The initial action is `create_candidature`. It may contain source material, inferred candidature fields, generated text inputs, local render requests, and supported follow-up task requests. AAAAT creates and binds records internally and returns no internal IDs or paths.

## MCP

Start the dependency-free stdio server with:

```bash
aaaat-mcp --storage .private
```

MCP exposes operational tools for claiming next work, reporting progress, submitting a task result, and submitting a bounded action. All tools call the same queue, ingestion, and action services used by the CLI and other wrappers.

## Provider neutrality

AAAAT does not choose a model, request credentials, call provider SDKs, or manage an inference runtime. Optional `agent_name`, `agent_runtime`, and `model_provider` values are provenance only.

## Artifact boundary

External hosts provide structured data or draft text. AAAAT resolves local variables, renders templates, records provenance, and manages artifact state. Final files remain local and subject to human review.
