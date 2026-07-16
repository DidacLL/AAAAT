# Agent Guide

AAAAT is a local-first application layer. The wx desktop is the v1 human runtime. External AI or agent hosts connect through bounded adapters; they do not receive a second application runtime or broad database API.

## Complete work items

Acquisition returns one complete work item. It includes:

- task metadata and purpose;
- purpose-scoped input context;
- instructions and process constraints;
- output contract and response schema;
- privacy notes and allowed actions;
- a random attempt-scoped `task_capability`.

The host must not fetch a second task context, build another packet, or create another queue. Those older split surfaces are not part of the contract.

## Capability authority

The capability authorizes only progress and result callbacks for one claimed attempt. It must not be treated as an application, candidature, task-row, profile-fact, career-plan, artifact, note, todo, blob, file, or storage identifier.

AAAAT applies accepted results to internal records from the private task binding. Agent-facing work items and acknowledgements must not expose internal IDs or arbitrary paths.

## Supported adapters

The CLI supports acquisition, result submission, and bounded actions:

```bash
aaaat agent next
aaaat agent submit <task_capability> --result-file result.json
aaaat agent action submit --input-file action.json
```

The dependency-free stdio MCP server exposes the same operations:

```bash
aaaat-mcp --storage .private
```

Browser native messaging, portable files, and user-owned commands are thin wrappers over the same services. They must not add queues, persistence models, or mutation paths.

## Bounded actions

`create_candidature` creates a new candidature from supplied source material and derived outputs. It may request supported follow-up tasks. AAAAT validates the payload, binds records internally, renders requested artifacts locally, and returns only a narrow acknowledgement.

It does not edit arbitrary existing candidatures and does not return internal record IDs.

## Context and private data

Profile variables, profile facts, career plans, source material, and candidature data are exposed only when relevant to the claimed task or bounded action. Exposure rules may return raw, summarized, redacted, placeholder, or denied values.

Broad listing, search, profile dumps, SQLite access, arbitrary filesystem reads, and identifier-based mutation are outside the supported agent contract.

## Responsibility split

AAAAT owns local storage, queue state, capabilities, validation, deterministic application, rendering, artifacts, provenance, and the desktop UI.

The external host owns provider/model selection, credentials, inference, research tools, network policy, and reasoning. Provider/model labels are optional provenance only.

The user reviews final content and controls submissions outside AAAAT.
