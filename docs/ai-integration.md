# Optional AI integration

AAAAT is complete without an AI connection. This document explains the optional boundary used when an external LLM supplies research, extraction, evaluation, strategy, or writing for the local workspace.

## Responsibility split

AAAAT owns private local data, purpose-scoped context construction, validation, candidature and profile updates, templates, rendering, artifact paths, and bridge authority.

The external host owns model and provider selection, credentials, network access, research policy, reasoning, generated language, and host-specific tool configuration. AAAAT does not call a provider SDK or select a model.

## One installed skill

`aaaat/SKILL.md` is the only installed LLM-facing instruction and its skill name is `AAAAT`.

The copied connection request embeds that exact document. Packaged desktop and bridge applications contain the same skill as application data. Repository files such as `AGENTS.md`, `CLAUDE.md`, tests, development documentation, and build tooling are not part of the installed runtime contract.

## V1 bridge routes

AAAAT uses one bounded task/result contract over three carriers:

1. direct MCP or an equivalent live tool connection when the host can genuinely reach and initialize it;
2. watched-folder JSON task and result files when a live route is unavailable;
3. one tagged JSON result in chat text only when the host cannot create files.

The host selects one route it can actually use. It must not claim access to a local executable, drive, folder, or machine that is outside its environment.

## Direct connection

When the user chooses **Connect my AI**, AAAAT creates one revocable opaque connection capability and one self-contained request. The request includes the exact stdio bridge command, its `--connection` argument, and the complete bounded tool schemas without exposing the workspace path.

A local-capable host performs ordinary initialization and tool discovery. A remote host that cannot launch or reach the command continues through AI exchange rather than sending the user into an unusable local setup path. AAAAT does not ask the user to run a connector test suite.

The direct connection states shown to the user are Ready to connect, Connected, Needs attention, and Paused.

## Bounded tool catalogue

The paired host can:

- read the connection state;
- open or focus the desktop;
- start a bounded profile task;
- create a new candidature from supplied source material and completed outputs;
- claim one complete ready work item;
- submit one structured result for that claimed item.

Creating a candidature through the bridge is a bounded direct action. It stores the supplied candidature first and creates follow-up work only when the host explicitly requests it in the same bounded action.

The host cannot enumerate arbitrary records, use internal IDs as general mutation handles, execute the repository CLI, browse files, read the database, learn the workspace path, or control desktop widgets.

## AI exchange

AAAAT creates a workspace-owned `AAAAT Exchange` directory with four subdirectories:

- `pending` contains uploadable task JSON files;
- `results` is watched for returned result JSON files;
- `processed` receives fully accepted task and result files;
- `rejected` receives invalid files and concise error reports.

Creating a task file atomically claims the eligible work for the selected candidature and writes complete bounded work items, the exact expected result envelope, and the required result filename. The returned file is processed only after it has remained stable long enough to avoid reading a partial download.

Each result section is applied through the same transport-neutral ingestion function used by the live bridge. Invalid authority fields, schemas, capabilities, duplicate callbacks, and malformed envelopes are rejected. A partially valid file applies independent valid sections but keeps the original task file pending so omitted work can be corrected. Successfully used task capabilities cannot be reused.

## Tagged text compatibility

Some AI hosts cannot generate files. Their task file instructs them to return the same result envelope once between `<AAAAT_RESULT>` and `</AAAAT_RESULT>`.

AAAAT may receive the complete conversational response, but it extracts only one uniquely tagged JSON object and ignores surrounding prose. Multiple tagged objects, invalid JSON, or ambiguous content are rejected. This carrier exists for compatibility and is not preferred over result files.

## Work items and capabilities

A work item contains its purpose, task-specific context, instructions, permitted fields, result schema, privacy notes, and one opaque callback capability.

That capability exists only for the current claimed attempt. It is not a record identifier. AAAAT invalidates it when the task completes, fails, is cancelled, or is returned to the queue.

There is no progress-reporting tool, lease, heartbeat, persistent thought stream, or general agent workflow protocol.

## Autonomous application

Once a result satisfies the declared contract, AAAAT applies it directly to the intended local data. It does not create a mandatory approval, suggestion acceptance, or thought-review step.

The LLM asks for a missing fact only when that fact is material and cannot be grounded safely in the supplied source, existing bounded context, or clearly identified research. A candidature may exist indefinitely before the profile is complete or an AI is connected.

## Privacy enforcement

Before data leaves AAAAT:

- profile values are resolved according to exposure rules;
- only purpose-relevant candidature context is included;
- workspace and artifact paths remain local;
- database and desktop command surfaces remain unavailable;
- internal identifiers are removed from public contracts;
- result payloads are bounded and schema-validated.

Privacy therefore does not depend on a person inspecting hidden reasoning or approving every generated field.

Without a connection, candidatures continue to save, manual editing and rendering remain available, queued work may remain queued indefinitely, and backup, search, Smart View, and Detailed View continue to work.
