# Provider-agnostic external host protocol

Status: parallel feature branch from PR #37 head `97b2e474d4c609002a4c786f81c60446e3b0be5e`.

## Correct product boundary

AAAAT is not an LLM wrapper, inference runtime, provider SDK host, or credential manager.

AAAAT owns:

- private local domain data;
- bounded task creation and internal binding;
- purpose-scoped context;
- privacy and exposure policy;
- output contracts and validation;
- provenance storage;
- human review state;
- deterministic application of accepted results;
- local rendering and artifact lifecycle.

The external agent or host environment owns:

- reasoning and generation;
- inference execution;
- provider and model selection;
- credentials and API keys;
- network policy;
- retries, streaming, and provider-specific transport.

AAAAT must work without a model, provider account, API key, provider SDK, HTTP server, or external network.

## Architecture

```text
AAAAT domain task
→ opaque task handle
→ bounded host task packet
→ external host / preferred agent
→ structured host result
→ AAAAT validation
→ suggested review state
→ explicit local apply
```

The external host may use OpenAI, Anthropic, Gemini, Ollama, llama.cpp, a local model, a remote model, or no model at all. AAAAT neither knows nor needs to know how inference is executed.

## Implemented slice

- `HostTaskPacket`: versioned provider-neutral work packet built from the existing bounded agent context;
- `HostTaskResult`: structured result with optional generic provenance;
- recursive rejection of internal entity identifiers;
- required result-field validation against the task response format;
- action allowlist limited to `context` and `submit`;
- generic provenance fields without provider-specific requirements;
- machine-readable compatibility descriptor;
- compatibility validation that enforces operation without API keys or provider SDKs;
- behavioral tests for bounded context, provenance, required fields, ID leakage, and ownership boundaries.

## Passive integration surfaces

AAAAT continues to expose passive surfaces that an external host may choose:

```text
folder-readable guides
CLI task envelopes and packets
local agent HTTP runtime
MCP descriptor
bounded action packets
in-process service calls
structured files or subprocess exchange
```

HTTP and MCP are adapters, not the core protocol.

## Compatibility descriptor

`aaaat.compatibility.compatibility_descriptor()` declares:

- stable task and context contracts;
- supported passive integration modes;
- privacy assumptions;
- artifact review semantics;
- AAAAT versus host ownership;
- operation without provider credentials;
- explicit non-capabilities such as API-key storage and inference orchestration.

A CLI exposure may be added after the descriptor shape is reviewed. The descriptor itself remains callable in-process and serializable as JSON.

## Provenance

External hosts may optionally report:

```text
source_type
agent_name
agent_runtime
model_provider
model_id
host_environment
internet_access_used
```

These fields are provenance only. They are not configuration, required credentials, or execution authority.

## Security invariants

- task handles are opaque callback handles, not database IDs;
- internal application, candidature, artifact, profile, note, todo, blob, path, and storage identifiers are forbidden;
- host output cannot directly mutate arbitrary records;
- AAAAT validates result shape before storage/application;
- result application uses AAAAT's internal task binding;
- generated results remain suggested until explicitly reviewed/applied;
- external transmission is decided by the host, not silently performed by AAAAT.

## Removed after principles review

The following were explicitly removed from this branch because they violate AAAAT's product definition:

- OpenAI-compatible HTTP transport;
- provider adapter runtime;
- provider endpoint configuration;
- model-name configuration;
- API-key environment variables and CLI flags;
- `aaaat-llm` inference command;
- in-process conversation engine;
- provider cost estimation and capability negotiation.

These responsibilities belong to whichever external agent or host the user already prefers.

## Next release slice

The next useful integration work should connect the existing desktop UI to AAAAT tasks, not to a provider:

1. show eligible queued tasks for the selected candidature;
2. export/copy a bounded host packet;
3. explain how the preferred external agent can consume it;
4. accept a structured result through the existing submit surface;
5. display provenance and validation status;
6. expose explicit human apply/reject controls;
7. keep manual workflows fully functional without any agent.

This demonstrates AAAAT's utility while preserving genuine provider and host agnosticism.

## Independence from PR #38

This branch depends only on established PR #37 contracts:

- opaque task handles;
- bounded contexts;
- response formats;
- output contracts;
- privacy notes;
- narrow acknowledgements;
- internal review/apply ownership.

It does not depend on PR #38's field-policy, projection, or desktop command changes.
