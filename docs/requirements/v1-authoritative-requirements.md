# AAAAT v1 authoritative requirements

Status: authoritative for v1 completion.

Effective date: 2026-07-16.

## 1. Product identity

AAAAT is a local-first, open-source, provider-agnostic job-application workspace and artifact generator.

AAAAT remains fully usable through its wx desktop application without external intelligence.

AAAAT owns private data, local persistence, the single bounded task queue, purpose-scoped context, result validation, deterministic domain application, local rendering, provenance, and desktop state.

External AI or agent hosts own reasoning, provider/model/runtime selection, credentials, network policy, and provider-specific SDK, browser, command, or inference-engine interaction.

AAAAT is not an LLM runtime, provider wrapper, agent orchestrator, plugin host, broad CRUD API, browser product, or named-provider integration.

## 2. Canonical assisted architecture

The standard assisted architecture is pull-based:

```text
AAAAT creates bounded tasks
→ an external AI or agent host connects to AAAAT
→ the external actor obtains one eligible task and purpose-scoped context
→ the external actor reasons in its own runtime
→ the external actor reports progress and submits a structured result or permitted action
→ AAAAT validates, applies, persists and renders locally
```

AAAAT does not normally call, select, host, launch, schedule, configure, or orchestrate an LLM.

MCP, CLI, HTTP, files, portable bundles, and browser bridges are thin communication wrappers over the existing bounded commands and services. They must not create another queue, mutation path, or domain pipeline.

## 3. Authority order

When sources conflict:

1. direct maintainer instruction;
2. this document;
3. accepted wx behavior through PR #37;
4. accepted privacy, bounded-authority, and domain-ownership corrections;
5. current code that supports those decisions.

Tests and documentation must be changed when they contradict this architecture.

## 4. Canonical human runtime

wx is the only v1 human runtime.

Required views:

- Welcome: onboarding, manual continuation, and connection status;
- User: profile completion and editing;
- Smart: approved recruiter-call cockpit;
- Detailed: complete candidature inspection and editing.

Do not introduce a browser dashboard, mandatory local server, FastAPI product runtime, static-export product mode, webview shell, or separate human data API.

## 5. Core assisted product promise

The release must prove:

```text
user action in wx
→ AAAAT creates bounded work
→ external AI obtains work through a supported wrapper
→ progress, failure, and retry remain visible
→ external AI submits a bounded result
→ AAAAT validates and applies permitted changes
→ artifacts render locally with provenance
→ wx refreshes without restart
```

A descriptor, schema, documentation page, CLI listing, or legacy test suite is not sufficient alone.

## 6. Provider-neutral bounded protocol

The protocol defines opaque task handles, version, task purpose, scoped context, permitted results/actions, schemas, progress, provenance, attempts, idempotency, failure, and cancellation.

An external actor may obtain one eligible task, obtain its bounded context, report task-scoped progress, submit one result, submit explicitly permitted actions, create a candidature through the dedicated bounded action, and request supported deferred tasks.

An external actor may not enumerate private entities, search arbitrary records, mutate by internal IDs, choose authoritative artifact paths, access SQLite or arbitrary local files, bypass domain validation, or use a task handle outside its capability.

AAAAT privately binds opaque handles to internal records.

## 7. Communication wrappers

Supported wrappers reuse the same queue and canonical result-ingestion path:

- MCP adapters;
- bounded CLI commands;
- narrow HTTP bridges;
- browser/native bridges;
- task/result files;
- portable archives.

A wrapper may expose only operations equivalent to:

- obtain one eligible task;
- obtain context for one opaque task handle;
- report task-scoped progress;
- submit one bounded result;
- submit one explicitly permitted action;
- cancel or inspect one task attempt where supported.

No wrapper may expose broad listing, arbitrary search, mutation by internal IDs, database access, unrestricted filesystem access, or a generic command catalogue.

## 8. Standard external-host onboarding

The standard `Connect my AI` path provides provider-neutral instructions for configuring the user's external AI or agent host to consume AAAAT's existing bounded queue.

AAAAT may display or export setup instructions and wrapper descriptors. AAAAT must not:

- accept generated executable connector packages;
- parse or install generated connector code;
- retain generated connector code in AAAAT storage;
- activate or execute generated connectors;
- convert generated material into the Advanced command path;
- manage provider credentials or provider-specific configuration.

Any host-side wrapper is created, stored, configured, executed, and secured by the external host or user. AAAAT only documents the bounded commands/protocol it exposes.

This is configuration guidance, not a plugin system.

## 9. Browser and file compatibility

For browser-only or file-only AI:

- AAAAT groups eligible work for one candidature into one portable task bundle;
- the bundle contains bounded context, requested tasks, instructions, and result schemas;
- the user transfers one bundle;
- the external AI returns one result bundle;
- AAAAT validates each result section independently;
- one invalid section does not discard unrelated valid sections.

Repeated card-by-card copying is not acceptable.

## 10. Advanced user-owned command option

Advanced setup may allow a technical user to configure a command, macro, or script that triggers an LLM or another external system.

This option is Advanced-only, explicit, user-owned, optional, isolated from standard onboarding, and constrained to the same bounded task/result contract.

```text
stdin  = one bounded task envelope
stdout = one final result envelope
stderr = optional progress and diagnostics
exit 0 = completed
nonzero exit = failed
```

The command path must reuse the existing queue, context construction, validation, and domain application. It must not introduce provider-specific behavior into core layers.

## 11. Integration onboarding and disclosure

Welcome/User provides:

- Continue manually;
- Connect my AI;
- Use a browser or chat AI;
- Use files or a portable bundle;
- Advanced integration.

Standard onboarding must not require terminal knowledge or understanding of ports, executables, SDKs, or model architecture.

Before use, AAAAT shows communication type, bounded context categories, identity inclusion/redaction, research/network capability, credential ownership, and wrapper status where available.

Technical command settings appear only in Advanced integration.

## 12. Assisted profile and candidature lifecycle

External AI may complete bounded profile and candidature tasks. AAAAT decides eligible fields, context, and permitted outputs.

AAAAT must retain original source material and support extraction, evaluation, role strategy, company research where supported, recruiter preparation, interview preparation, form answers, tailored CV content, cover-letter content, local rendering, provenance, and visible editable results.

Results use existing domain services and deterministic application rules. Do not create a generic workflow engine.

## 13. Execution and wx behavior

Required states: pending, running, completed, failed, and cancelled where supported.

Progress is visible. Failure preserves existing data. Retry creates a safe new attempt. Duplicate, stale, late, and superseded results are rejected or acknowledged idempotently. Completion refreshes the relevant projection. Manual editing remains available.

## 14. Privacy and artifacts

Private data remains local until AAAAT intentionally constructs bounded context.

Expose only task-required context. Omit or redact identity where unnecessary. Wrappers receive no database path or ambient filesystem authority. No real user data enters source control, fixtures, or release artifacts. Generation, local rendering, and external submission remain distinct states.

Artifacts retain controlled local paths, internal candidature binding, task context, agent provenance, reported provider/model metadata when supplied, timestamps, state, and notes. External actors may not choose authoritative artifact paths.

## 15. Release acceptance

Automated fake-data gates must prove:

1. manual operation with no integration;
2. standard external-host onboarding instructions and disclosure;
3. external task acquisition through at least two independent wrappers;
4. one portable/browser path including result import;
5. profile completion;
6. candidature creation from raw source;
7. lifecycle generation and research;
8. local rendering and artifact tracking;
9. provenance and privacy enforcement;
10. progress, failure, and retry;
11. invalid, unauthorized, stale, duplicate, and superseded result handling;
12. final results visible in desktop projections;
13. no broad data-access or mutation service;
14. installation, migration, backup, and supported-Python preservation.

Before `RELEASE_READY`, manually demonstrate one real external AI connected to the queue, one independent wrapper, the browser or portable-bundle path, guided wx setup/disclosure/progress/failure/retry, and artifact rendering with editable results.

No named provider or runtime is mandatory.

## 16. Implementation order

1. Remove architecture drift.
2. Stabilize queue, context, result, progress, and provenance envelopes.
3. Ensure every wrapper reuses canonical ingestion and domain application.
4. Complete standard external-host instructions and operational wrappers.
5. Complete browser and portable-bundle compatibility.
6. Keep the user-owned command isolated in Advanced setup.
7. Complete wx lifecycle workflows.
8. Run automated validation and manual demonstrations.

## 17. Explicit non-goals

- broad CRUD or search APIs for agents;
- exposing SQLite or internal entity IDs;
- making HTTP, MCP, a provider SDK, or a named runtime the domain architecture;
- embedding or managing an LLM runtime;
- AAAAT-initiated provider or inference calls in the standard path;
- generated connector package ingestion or storage;
- silent provider/model/executable/endpoint discovery;
- a generic plugin framework;
- a generic workflow engine;
- a browser dashboard or mandatory local server;
- weakening manual wx operation.
