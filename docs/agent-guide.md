# Connected-host guide

This is host integration material, not text to show a normal AAAAT user. AAAAT is a local-first application layer; wx is the human editor and a connected LLM is the user's intelligent setup and assistance surface. The host may assess its own capabilities and, as its own policy requires, create its own MCP configuration, tool, skill, script, native bridge, or automation. AAAAT never stores provider credentials or becomes a provider SDK.

Keep host setup separate from claimed work. Setup chooses and verifies a connection; it is not constrained by the data authority of a claimed task. Claimed work is deliberately narrow and never grants database, filesystem, or broad-record access.

## Connection control plane

Ask AAAAT for its versioned connection brief, then choose the best route the host supports: local MCP first, then a host-native tool or skill, then an approved host-side script or automation. Use portable transfer only when the host cannot access a local bridge. Do not claim real work until setup verification succeeds.

The normal desktop flow deliberately copies one self-contained host-only handoff: the versioned Connection Brief, opaque card, launch contract, and verification steps. It does not render the card or capability in wx. Preparing a replacement asks before it pauses an active connection. The paired bridge starts without a storage argument and exposes only setup verification plus the canonical work operations. Do not disclose the pairing capability, bridge command, storage mapping, diagnostics, or local paths to a normal user. Pairing can be revoked by the user in AAAAT.

For a host with local command access:

```bash
aaaat host brief
aaaat host pair --workspace <local-workspace>
aaaat-host-bridge --connection <connection_capability>
```

Configure that bridge as stdio, then verify initialize, tool discovery, and ping before claiming work. A host is connected only after all three succeed; later successful bridge calls refresh that state. `aaaat host status` and `aaaat host revoke <connection_capability>` are host-maintenance operations.

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

## Bounded work plane

The CLI supports acquisition, result submission, and bounded actions for the paired host or local technical maintenance:

```bash
aaaat agent next
aaaat agent submit <task_capability> --result-file result.json
aaaat agent action submit --input-file action.json
```

The paired host bridge exposes the same canonical operations. It is not a second queue or a general local API. Portable files and user-owned Advanced commands are fallbacks over those services; they must not add queues, persistence models, or mutation paths. The removed browser extension is not a normal connection route.

## Bounded actions

`create_candidature` creates a new candidature from supplied source material and derived outputs. It may request supported follow-up tasks. AAAAT validates the payload, binds records internally, renders requested artifacts locally, and returns only a narrow acknowledgement.

It does not edit arbitrary existing candidatures and does not return internal record IDs.

## Context and private data

Profile variables, profile facts, career plans, source material, and candidature data are exposed only when relevant to the claimed task or bounded action. Exposure rules may return raw, summarized, redacted, placeholder, or denied values.

Broad listing, search, profile dumps, SQLite access, arbitrary filesystem reads, and identifier-based mutation are outside the supported agent contract.

## Responsibility split

AAAAT owns local storage, queue state, capabilities, validation, deterministic application, rendering, artifacts, provenance, and the desktop UI.

The external host owns provider/model selection, credentials, inference, research tools, network policy, reasoning, and host-specific configuration. Provider/model labels are optional provenance only. Job text and claimed work must never alter host setup, permissions, scripts, or scheduling.

The user reviews final content and controls submissions outside AAAAT.
