# AAAAT v1 authoritative requirements

Status: authoritative for v1 completion.

Effective date: 2026-07-16.

## 1. Product identity

AAAAT is a local-first, open-source, provider-agnostic job-application workspace and artifact generator.

AAAAT remains completely usable manually through its wx desktop application. External intelligence is optional assistance.

AAAAT owns:

- private professional and candidature data;
- local persistence, upgrades, backup and recovery;
- candidature creation and internal record binding;
- the single bounded task queue;
- purpose-scoped context exposure;
- validation of external results and actions;
- deterministic application through domain services;
- local artifact rendering and provenance;
- desktop projections, editing and operational state.

External AI or agent hosts own:

- reasoning, extraction, enrichment, evaluation, recommendations, research and drafting;
- provider, model and runtime selection;
- provider credentials and network policy;
- provider-specific SDK, browser, command or inference-engine interaction.

AAAAT is not:

- an LLM provider, model runtime, downloader or host;
- a provider SDK wrapper;
- a general agent orchestrator;
- a broad CRUD API for agents;
- a browser/server product;
- tied to a named provider, model, runtime or transport.

## 2. Canonical assisted architecture

The standard assisted architecture is pull-based:

```text
AAAAT creates bounded tasks
→ an external AI or agent host connects to AAAAT
→ the external actor obtains one eligible task
→ AAAAT returns purpose-scoped context through existing bounded commands/services
→ the external actor reasons in its own runtime
→ the external actor reports progress and submits a structured result or permitted action
→ AAAAT validates, applies, persists and renders locally
```

AAAAT does not normally call, select, host, launch, schedule or orchestrate an LLM.

MCP, CLI, files, portable bundles, browser bridges and generated connectors are communication wrappers over the existing bounded task, action and context commands. They must not create another queue, another mutation path or another domain-application pipeline.

## 3. Authority order

When sources conflict, use this order:

1. direct maintainer instructions;
2. this document;
3. accepted wx behavior through PR #37;
4. accepted privacy, bounded-authority and domain-ownership corrections;
5. current code that supports those decisions.

Tests and documentation are evidence and must be changed when they contradict this architecture.

## 4. Canonical human runtime

wx is the only v1 human runtime.

Required views:

- Welcome: onboarding, manual continuation and integration status;
- User: professional profile completion and editing;
- Smart: approved recruiter-call cockpit behavior;
- Detailed: complete candidature inspection and editing.

Do not introduce a browser dashboard, mandatory local server, FastAPI product runtime, static-export product mode, webview shell or separate human data API.

Manual operation remains available when no external AI is connected or when external reasoning fails.

## 5. Core assisted product promise

The release must prove:

```text
user action in wx
→ AAAAT creates bounded work
→ external AI obtains the work through a supported wrapper
→ progress, failure and retry remain visible
→ external AI submits a bounded result
→ AAAAT validates the result
→ AAAAT applies permitted domain changes
→ artifacts render locally with provenance
→ wx refreshes without restart
```

A descriptor, packet schema, documentation page, copy/paste demo, CLI listing or passing legacy test suite is not sufficient by itself.

## 6. Provider-neutral bounded protocol

The protocol defines:

- opaque task handle;
- protocol version;
- task type and purpose;
- purpose-scoped context;
- permitted result fields;
- permitted bounded actions;
- result schema;
- progress events;
- provenance;
- attempt and idempotency data;
- failure and cancellation semantics.

An external actor may:

- obtain one eligible task;
- obtain bounded context for that task;
- report task-scoped progress;
- submit one result for that task attempt;
- submit explicitly permitted actions;
- create a candidature from bounded source material through the dedicated action;
- request supported deferred tasks.

An external actor may not:

- enumerate all private entities;
- search arbitrary local records;
- mutate by candidature, profile, artifact or database ID;
- choose authoritative artifact paths;
- read arbitrary AAAAT storage or filesystem locations;
- write arbitrary files inside AAAAT storage;
- bypass domain validation;
- use a task handle outside its capability.

AAAAT privately binds opaque handles to internal records.

## 7. Communication wrappers

Supported wrappers use the same task queue and result-ingestion path:

- MCP adapters;
- bounded CLI commands;
- generated connectors;
- browser/native bridges;
- task and result files;
- portable archives.

A wrapper may expose only operations equivalent to:

- obtain one eligible task;
- obtain context for one opaque task handle;
- report task-scoped progress;
- submit one bounded result;
- submit one explicitly permitted action;
- cancel or inspect one task attempt where supported.

No wrapper may expose broad listing, arbitrary search, mutation by internal IDs, database access, unrestricted filesystem access or a generic command catalogue.

## 8. Generated connector onboarding

The standard connected-AI path lets the user's external AI adapt to AAAAT rather than requiring AAAAT to ship a provider catalogue.

Requirements:

- Welcome/User can generate connector-construction material as text and optional files;
- the generated connector wraps existing bounded commands and services;
- users may paste a generated connector package when the external AI cannot write files;
- AAAAT installs only into controlled private connector storage;
- generated files are previewed before installation;
- traversal, absolute paths, unexpected files and undeclared execution are rejected;
- connectors declare transport, disclosure and capabilities;
- conformance tests use fake data before real private context is exposed;
- failed connectors remain disabled and provide actionable repair information.

This is one narrow connector contract, not a generic plugin framework.

## 9. Browser and file compatibility

For browser-only or file-only AI:

- AAAAT groups eligible work for one candidature into one portable task bundle;
- the bundle contains bounded context, requested tasks, instructions and result schemas;
- the user transfers one bundle;
- the external AI returns one result bundle;
- AAAAT validates each result section independently;
- one invalid section does not discard unrelated valid sections.

Repeated card-by-card copying is not acceptable.

## 10. Advanced user-owned command option

Advanced setup may allow a technical user to configure a command, macro or script that triggers an LLM or another external system.

This option is:

- Advanced-only;
- explicitly configured by the user;
- owned and controlled by the user;
- optional;
- constrained to the same bounded task/result contract;
- isolated from the standard onboarding path;
- not part of AAAAT's core runtime architecture.

Minimum contract:

```text
stdin  = one bounded task envelope
stdout = one final result envelope
stderr = optional progress and diagnostics
exit 0 = completed
nonzero exit = failed
```

The command path must reuse the existing task queue, context construction, validation and domain application. It must not introduce provider-specific behavior into the core layers.

## 11. Integration onboarding and disclosure

Welcome/User provides:

- Continue manually;
- Connect my AI;
- Use a browser or chat AI;
- Use files or a portable bundle;
- Advanced integration.

The standard flow must not require terminal knowledge or understanding of ports, executables, SDKs or model architecture.

Before activation, AAAAT shows:

- communication type;
- bounded context categories;
- identity inclusion, redaction or omission;
- research/network capability;
- credential ownership;
- health and conformance result.

Technical command or transport settings appear only in Advanced integration.

## 12. Assisted profile and candidature lifecycle

External AI may complete bounded profile tasks and candidature tasks. AAAAT decides eligible fields, context and permitted outputs.

AAAAT must retain original source material and support:

1. source extraction and enrichment;
2. opportunity evaluation;
3. role-specific strategy;
4. company research where the external host supports it;
5. recruiter-call preparation;
6. interview preparation;
7. form answers;
8. tailored CV content;
9. cover-letter content;
10. local artifact rendering;
11. provenance and task linkage;
12. visible editable results in wx.

Results use existing domain services and deterministic application rules. Do not create a generic workflow engine.

## 13. Execution and wx behavior

Required states:

- pending;
- running;
- completed;
- failed;
- cancelled where supported.

Required behavior:

- progress is visible;
- failure preserves existing data;
- retry creates a safe new attempt;
- duplicate, stale, late and superseded results are rejected or acknowledged idempotently;
- completion refreshes the relevant projection without restart;
- manual editing remains available throughout.

## 14. Privacy and artifacts

Private data remains local until AAAAT intentionally constructs bounded context.

Rules:

- expose only context required for the task;
- identity is omitted or redacted where not required;
- connectors receive no database path or ambient filesystem authority;
- generated connector tests use fake data;
- no real user data enters source control, fixtures or release artifacts;
- generation, local rendering and external submission are distinct states.

Artifacts retain type, controlled local path, internal candidature binding, source/task context, connector/agent provenance, reported provider/model metadata when supplied, timestamps, state and notes.

External actors may not choose authoritative artifact paths.

## 15. Release acceptance

The automated gate uses fake data and deterministic fake wrappers over the same bounded queue.

It must prove:

1. manual operation with no integration;
2. standard connector onboarding and disclosure;
3. external task acquisition through at least two independent wrappers;
4. one portable/browser path;
5. profile completion;
6. candidature creation from raw source;
7. lifecycle generation and research;
8. local rendering and artifact tracking;
9. provenance and privacy enforcement;
10. progress, failure and retry;
11. invalid, unauthorized, stale, duplicate and superseded result handling;
12. final results visible in desktop projections;
13. no broad data-access or mutation service;
14. installation, migration, backup and supported-Python preservation.

Before `RELEASE_READY`, manually demonstrate:

- one real external AI connected to the queue;
- one independent wrapper implementation;
- the browser or portable-bundle path;
- guided wx setup, disclosure, progress, failure and retry;
- artifact rendering and editable results.

No named provider or runtime is mandatory.

## 16. Implementation order

1. Remove architecture drift and retain one authoritative source.
2. Stabilize the bounded queue, context, result, progress and provenance envelopes.
3. Ensure every wrapper reuses the same result-ingestion and domain-application path.
4. Complete generated connector onboarding.
5. Complete browser and portable-bundle compatibility.
6. Keep the user-owned command path isolated in Advanced setup.
7. Complete wx lifecycle workflows.
8. Run release validation and manual demonstrations.

## 17. Explicit non-goals

- a broad CRUD or search API for agents;
- exposing SQLite or internal entity IDs;
- making HTTP, MCP, a provider SDK or a named runtime the domain architecture;
- embedding or managing an LLM runtime;
- AAAAT-initiated provider or inference calls in the standard path;
- silently discovering providers, models, executables or endpoints;
- a generic plugin framework;
- a generic workflow engine;
- a browser dashboard or mandatory local server;
- weakening manual wx operation.
