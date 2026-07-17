# Optional AI integration

AAAAT is complete without an AI connection. This document explains the optional boundary used when an external LLM supplies research, extraction, evaluation, strategy, or writing for the local workspace.

## Responsibility split

AAAAT owns private local data, purpose-scoped context construction, validation, candidature and profile updates, templates, rendering, artifact paths, and bridge authority.

The external host owns model and provider selection, credentials, network access, research policy, reasoning, generated language, and host-specific tool configuration. AAAAT does not call a provider SDK or select a model.

## One installed skill

`aaaat/SKILL.md` is the only installed LLM-facing instruction and its skill name is `AAAAT`.

The copied connection request embeds that exact document. File-capable hosts receive the same document as `AAAAT/SKILL.md`. Repository files such as `AGENTS.md`, tests, development documentation, and build tooling are not part of the installed contract.

## Connect my AI

When the user chooses **Connect my AI**, AAAAT creates one revocable opaque connection capability and one self-contained request. The request tells the current host to choose the strongest local route it supports without exposing the workspace path.

For a normal MCP or equivalent stdio route, the request contains the exact bridge command, its `--connection` argument, and the complete bounded tool schemas. The host performs its ordinary initialization and tool discovery. AAAAT does not ask the user to run a connector test suite.

The connection states shown to the user are Ready to connect, Connected, Needs attention, and Paused.

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

## Work items and capabilities

A claimed work item contains its purpose, task-specific context, instructions, permitted fields, result schema, privacy notes, and one opaque callback capability.

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

## Portable and advanced fallbacks

When a live local tool route is unavailable, AAAAT can export bounded task bundles and import validated result bundles.

Advanced users may also configure a controlled exchange directory or one explicit user-owned command. These are simple transport primitives over the same bounded contract, not provider integrations or a connector catalogue.

Without a connection, candidatures continue to save, manual editing and rendering remain available, queued work may remain queued indefinitely, and backup, search, Smart View, and Detailed View continue to work.
