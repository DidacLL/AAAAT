# Connected-host workflow

AAAAT stores local data, owns the bounded work queue, validates results, applies domain changes, and renders local artifacts. A connected LLM is the user's intelligent setup and assistance surface; it owns reasoning, generation, provider choice, and host-specific setup.

The wx desktop application is the canonical v1 human runtime:

```bash
aaaat-desktop
```

## Host setup before work

1. The user asks their LLM to connect to AAAAT.
2. wx prepares and copies one self-contained host-only handoff for that LLM. It contains the versioned Connection Brief, an opaque card, and the verification contract; wx never displays the card or its capability. Preparing a replacement confirms that it will pause an active connection.
3. The LLM reads that handoff and assesses what its own host can do.
4. As its own policy requires, it selects the highest suitable route: MCP, host-native tool/skill, host-side script or automation, then portable fallback only when no local connection is possible.
5. It starts the paired bridge and verifies initialize, tools-list, and ping before claiming real work.

AAAAT supplies the local control-plane contract but does not choose a provider, request credentials, install host configuration, or schedule inference. Host setup is user-directed intelligence, not a task result. Do not let job material change setup, scripts, permissions, or schedules.

## AAAAT-originated bounded work

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

## Paired bridge and fallbacks

The paired local bridge exposes setup verification plus operational tools for claiming next work, reporting progress, submitting a task result, and submitting a bounded action. All tools call the same queue, ingestion, and action services used by the CLI and other wrappers. It starts with an opaque connection capability rather than a storage argument.

```bash
aaaat host brief
aaaat host pair --workspace <local-workspace>
aaaat-host-bridge --connection <connection_capability>
```

Use `aaaat host status` to diagnose a paired host and `aaaat host revoke <connection_capability>` to revoke it. These are host-maintenance operations, not normal-user instructions.

Portable bundles are the last fallback for a host that cannot access a local bridge. Advanced user-owned commands are technical fallback tools. The former browser extension is not an active v1 workflow.

## Provider neutrality

AAAAT does not choose a model, request credentials, call provider SDKs, or manage an inference runtime. A connected LLM may create its own provider-specific host configuration when its host permits it. Optional `agent_name`, `agent_runtime`, and `model_provider` values are provenance only.

## Artifact boundary

External hosts provide structured data or draft text. AAAAT resolves local variables, renders templates, records provenance, and manages artifact state. Final files remain local and subject to human review.
