# AAAAT v1 authoritative requirements

Status: authoritative for v1 completion.

Effective date: 2026-07-15.

This document replaces earlier seed prompts, generated requirement summaries, abandoned integration plans, runtime-specific corrections and release-readiness claims where they conflict with it. Historical documents remain useful as design history, but they are not implementation authority.

## 1. Product identity

AAAAT is a local-first, open-source, provider-agnostic job-application workspace and artifact generator.

AAAAT must remain completely usable manually through its wx desktop application. External intelligence is optional assistance, not a runtime dependency for basic use.

AAAAT owns:

- private professional and candidature data;
- local persistence, upgrades, backup and recovery;
- candidature creation and internal record binding;
- bounded task creation;
- purpose-scoped context exposure;
- validation of external results and actions;
- deterministic application of accepted results through domain services;
- local artifact rendering and provenance;
- desktop projections, editing and operational state.

External LLMs or agent hosts own:

- reasoning, extraction, enrichment, evaluation, recommendations, research and drafting;
- provider, model and runtime selection;
- provider credentials and network policy;
- provider-specific transport, SDK, browser or inference-engine interaction.

AAAAT is not:

- an LLM provider, model runtime, downloader or host;
- a provider SDK wrapper;
- a general agent orchestrator;
- a broad CRUD API for agents;
- a browser/server product;
- dependent on paid middleware, proprietary automation products or cloud integration services;
- tied to a named provider, model, runtime or transport merely because it is common.

## 2. Authority order

When sources conflict, use this order:

1. direct maintainer instructions and corrections;
2. this document;
3. the original product promise and principles where consistent with this document;
4. accepted wx behavior through PR #37;
5. accepted privacy, bounded-authority and domain-ownership corrections;
6. current code that supports those decisions;
7. later tests, plans and documents only when consistent with the above.

Tests and generated documentation are evidence. They may be changed when they encode architectural drift.

## 3. Canonical human runtime

wx is the canonical v1 human runtime.

Required views and responsibilities:

- Welcome: onboarding, manual continuation, integration setup and health status;
- User: professional profile completion and editing;
- Smart: approved recruiter-call cockpit behavior from PR #37;
- Detailed: complete candidature inspection and editing.

Do not revive a browser dashboard, mandatory local server, FastAPI product runtime, static-export product mode, webview shell or separate human data API.

Manual operation must remain available when no integration is configured or when external reasoning fails.

## 4. Core assisted product promise

The completed release must prove this real workflow:

```text
user action in wx
→ AAAAT creates bounded work
→ external intelligence performs reasoning through an appropriate communication path
→ progress, failure and retry remain visible
→ AAAAT validates the result
→ AAAAT applies permitted domain changes
→ artifacts render locally with provenance
→ wx refreshes without restart
```

A descriptor, packet schema, documentation page, copy/paste demo, CLI listing or passing legacy test suite is not sufficient.

## 5. Universal communication requirement

AAAAT must support the major capability classes of external intelligence rather than assuming that every LLM can access files, execute commands, accept HTTP requests or expose an API.

Required classes:

1. automatically reachable local or remote inference services;
2. programmable CLI, desktop or agent hosts;
3. file-capable hosts;
4. browser-only conversational LLMs that cannot read local folders or execute commands;
5. future user-selected hosts implementing the bounded contract.

The communication layer must use one provider-neutral task/result contract while allowing different transports for different host capabilities.

Permitted transports include subprocess stdio, files, portable archives, local or remote HTTP, provider SDK wrappers, browser/native messaging, MCP adapters and generated connectors. A transport is acceptable only when it preserves the bounded authority defined below.

AAAAT must not require provider credentials, API keys or tokens as part of its core installation. Authentication and credentials for a selected external service remain outside AAAAT core and under the user or connector's control.

## 6. Provider-neutral bounded protocol

The protocol must define:

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

- obtain or receive one eligible task;
- obtain bounded context for that task;
- report progress for that task attempt;
- submit one result for that task attempt;
- submit explicitly permitted actions;
- create a new candidature from bounded source material through a dedicated action;
- request supported deferred tasks.

An external actor may not:

- enumerate all private entities;
- search arbitrary local records;
- mutate by candidature, profile, artifact or database ID;
- choose authoritative artifact paths;
- read arbitrary AAAAT storage or filesystem locations;
- write arbitrary files inside AAAAT storage;
- bypass domain validation;
- use a task handle for anything except its specific capability.

AAAAT privately binds opaque handles to internal records.

## 7. Transport and adapter boundary

Transport choice does not define authority. A listening process, HTTP route, subprocess, file exchange or browser bridge is compliant only when it exposes the same bounded task capabilities and no ambient access to AAAAT state.

AAAAT must not expose a broad internal data-access or mutation service. In particular, no transport may provide general candidature/profile/artifact listing, arbitrary search, mutation by internal IDs, database access, unrestricted file access or a generic command catalogue.

A thin wrapper around bounded AAAAT commands is permitted. Its externally available operations must remain equivalent to the bounded protocol, such as:

- receive or claim one eligible task;
- obtain context for one opaque task handle;
- report task-scoped progress;
- submit one bounded result;
- cancel or inspect one task attempt where supported.

Named providers and runtimes are optional adapters and compatibility evidence. They must not define the core protocol, the only standard-user path or the release architecture.

Adapter requirements:

- provider-specific code remains outside the provider-neutral task and domain layers;
- every adapter uses the canonical context, result-validation and domain-application pipeline;
- removing one optional adapter does not break manual operation or the bounded protocol;
- adapters declare communication, disclosure, progress, cancellation, research and credential capabilities;
- runtime self-description is advisory and independently verified;
- health and conformance tests use fake data before real private context is exposed;
- failures preserve details and support safe retry.

AAAAT may ship and test named adapters, including local inference engines, public APIs, desktop agents and browser companions. No specific provider or runtime is mandatory for v1 acceptance.

## 8. Required communication implementations

The v1 release must implement these provider-neutral paths under the same bounded contract.

### 8.1 Automatic transport path

Purpose: complete bounded tasks without repeated manual transfer when the selected external intelligence can be reached programmatically.

Requirements:

- support at least two independent deterministic transport fixtures in CI;
- allow local or remote communication as selected by the user;
- run external work outside the wx event thread;
- bound request, response, progress and timeout behavior;
- strictly validate structured results;
- preserve failure details, cancellation where supported and safe retry;
- report connector/provider/model provenance when available;
- never grant broader authority because the transport is automatic.

### 8.2 Generic user-owned command path

Purpose: support programmable hosts and future runtimes without provider-specific core code.

Minimum contract:

```text
stdin  = bounded task envelope
stdout = final result envelope
stderr = progress and diagnostics
exit 0 = completed
nonzero exit = failed
```

A rendezvous-directory or callback variant may be used when needed for progress, cancellation, authentication or large context, but it must remain task scoped and must not expose global storage.

### 8.3 Generated connector onboarding

Purpose: let an external LLM adapt itself to AAAAT instead of requiring AAAAT to ship a provider catalogue.

Requirements:

- Welcome/User can generate connector-construction material as text and optional files;
- users may paste a generated connector package when the LLM cannot write files;
- AAAAT constrains installation to controlled private connector storage;
- generated files are previewed before installation;
- absolute paths, traversal, unexpected files and undeclared execution are rejected;
- connectors declare their transport and capabilities;
- local HTTP or listening transports are permitted when explicitly declared and limited to bounded AAAAT operations;
- broad APIs, arbitrary routes, storage access and unrestricted execution remain forbidden;
- every connector passes deterministic conformance tests before real private context is exposed;
- failed connectors remain disabled and produce actionable repair information.

This is not a generic plugin framework. It is one narrow connector contract and one validation harness.

### 8.4 Browser-only conversational path

Purpose: support users whose LLM exists only in an authenticated browser chat and cannot access local files or run commands.

Preferred automatic path:

- a maintained browser companion or other bounded bridge;
- authentication remains in the user's normal browser or selected service;
- browser/site interaction logic remains outside AAAAT core;
- the bridge exchanges only bounded task/result messages;
- AAAAT validates returned content identically to other paths.

Required compatibility floor:

- AAAAT groups eligible work for one candidature into one portable task bundle;
- the bundle contains bounded context, requested tasks, instructions and result schemas;
- the user transfers one bundle to the chosen chat;
- the LLM returns one result bundle;
- AAAAT validates each result section independently;
- one invalid section does not discard unrelated valid sections;
- repeated card-by-card copying is not acceptable.

The fallback is a compatibility floor, not the preferred product experience.

## 9. Integration onboarding, disclosure and health

Welcome/User must provide guided setup for standard users and explicit controls for advanced users.

Required standard choices:

- continue manually;
- connect the user's existing AI automatically;
- use a browser/chat AI;
- use files or a portable bundle;
- open advanced integration setup.

Before activation, AAAAT must show:

- whether communication is local, networked, browser-mediated or user-defined;
- what bounded context categories may be sent;
- whether personal identity is included, redacted or omitted for the selected purpose;
- whether research/network access is available;
- where credentials are managed;
- the health and conformance result.

The standard flow must not require terminal knowledge or prior understanding of ports, executables, SDKs or model architecture. Technical settings remain available in advanced setup when required by the selected adapter.

Users must be able to disable, replace, retry or inspect an integration. AAAAT may recommend tested adapters, but recommendations are compatibility guidance rather than product requirements.

## 10. Assisted profile completion

The profile flow must allow external intelligence to identify missing information and return bounded profile updates.

Requirements:

- AAAAT decides which profile fields are eligible for the task;
- purpose-scoped exposure rules apply: raw, redacted, summarized, variable reference only or denied;
- external interaction may ask the user questions outside AAAAT;
- returned updates are validated against allowed profile keys and value types;
- no profile IDs are exposed as authority;
- updates are stored locally and immediately visible/editable in User view;
- invalid or partial results preserve existing values;
- retry is safe and idempotent.

## 11. Candidature intake and complete lifecycle

Source material may include pasted job offers, recruiter messages, forms, job descriptions, user conversations and imported bounded bundles.

AAAAT must retain the original source and support:

1. source extraction and enrichment;
2. opportunity evaluation;
3. role-specific strategy;
4. company research where the selected integration supports it;
5. recruiter-call preparation;
6. interview preparation;
7. form answers;
8. tailored CV content;
9. cover-letter content;
10. local artifact rendering;
11. provenance and task linkage;
12. visible editable results in wx.

Results must use existing domain services and deterministic application rules. Do not create a generic workflow engine.

## 12. Execution and wx behavior

External work must not freeze wx.

Required states:

- pending;
- running;
- completed;
- failed;
- cancelled where supported.

Required behavior:

- progress appears while work runs;
- failure preserves existing data;
- retry creates a new safe attempt;
- duplicate, stale, late and superseded results are rejected or acknowledged idempotently;
- completion refreshes the relevant projection without restart;
- manual editing remains available before, during and after assisted work.

## 13. Privacy and disclosure model

Private data remains in configured local storage until AAAAT intentionally constructs bounded context for a selected external intelligence.

Rules:

- expose only context required for the task purpose;
- professional identity belongs to AAAAT's profile;
- local rendering may resolve blind variables without exposing raw values externally;
- research tasks do not receive raw personal identity by default;
- connectors receive no global database path or arbitrary filesystem authority;
- generated connector tests use fake data only;
- no real user data enters source control, fixtures, release artifacts or public demos;
- generation, local rendering and external submission are distinct states;
- when the user selects a public or networked LLM, the bounded context sent to that LLM is an explicit user-approved disclosure;
- transport privacy does not replace purpose scoping, user disclosure or bounded authority.

## 14. Artifacts

CV and cover-letter templates remain anonymized and variable-driven.

Each artifact must retain:

- type;
- controlled local path;
- internal candidature binding;
- source/task context;
- connector/agent provenance;
- provider/model when reported;
- timestamps;
- state: draft, reviewed, submitted or archived;
- notes.

Generation must not imply submission. External actors may not choose authoritative artifact paths.

## 15. Release acceptance scenario

The decisive automated gate is one deterministic empty-store scenario using fake data and deterministic fake implementations of the required transport boundaries.

It must prove:

1. manual operation with no integration;
2. standard integration onboarding, disclosure and health;
3. at least two independent automatic transport fixtures through the same bounded protocol;
4. one portable or browser-only bundle path;
5. profile completion;
6. candidature creation from raw source;
7. extraction, enrichment, evaluation and strategy;
8. supported research;
9. recruiter and interview preparation;
10. form answers;
11. tailored CV and cover-letter generation;
12. local rendering and artifact tracking;
13. provenance and privacy enforcement;
14. progress, failure, cancellation where supported and retry;
15. invalid and unauthorized result rejection;
16. stale, duplicate, late and superseded result behavior;
17. final results visible in desktop projections;
18. no broad AAAAT data-access or mutation service;
19. provider credentials and tokens remain outside AAAAT core;
20. installation, migration, backup and supported-Python preservation.

Additional real manual demonstrations required before `RELEASE_READY`:

- one real automatic integration selected by the maintainer;
- one independent transport or host implementation through the same protocol;
- the browser-only or portable-bundle path;
- guided wx setup, disclosure, progress, failure and retry;
- artifact rendering and visible editable results.

No named provider or runtime is mandatory. CI alone is not release proof.

## 16. Missing-work implementation plan

Implement in this order.

### Phase 1 — freeze authority and remove drift

- keep this document as the v1 authority;
- align corrections, deprecations and release gates;
- remove provider- and transport-specific requirements that do not protect product behavior or authority;
- retain valid packaging, migration, backup and wx work.

Exit condition: contributors can identify one internally consistent authoritative requirements source.

### Phase 2 — stabilize the bounded protocol and ingestion

- finalize task, context, result, progress and provenance envelopes;
- enforce opaque handles and permitted actions;
- define schema validation and idempotency;
- ensure every transport uses one result-ingestion and domain-application path;
- ensure no internal IDs or arbitrary paths cross the boundary.

Exit condition: deterministic fake transports complete and retry the full lifecycle identically.

### Phase 3 — isolate transport execution

- define a small transport interface for health and bounded execution;
- move provider-specific dispatch out of the central task runner;
- represent integrations by capabilities and disclosure properties;
- preserve existing valid adapters behind the new boundary.

Exit condition: the central task lifecycle contains no provider-specific execution branches.

### Phase 4 — standard-user onboarding

- present manual, automatic, browser/chat, file/bundle and advanced choices;
- show disclosure and credential ownership before activation;
- keep technical adapter settings in advanced setup;
- run harmless health and conformance tests before private context exposure.

Exit condition: a non-technical user can select and validate a communication path without terminal knowledge.

### Phase 5 — connector and browser support

- generate text and file bootstrap materials;
- accept and preview generated connector packages;
- support declared bounded transports, including HTTP when appropriate;
- reject broad APIs and ambient AAAAT authority;
- complete the grouped browser-only bundle and maintained automatic bridge path.

Exit condition: external hosts can integrate without core changes and browser-only users have a tolerable standard workflow.

### Phase 6 — complete wx workflows

- expose task progress, errors and retry;
- complete assisted profile and candidature lifecycle actions;
- refresh Smart, Detailed and User projections after results;
- keep generated visible fields editable.

Exit condition: a non-technical user can complete the lifecycle from wx.

### Phase 7 — release validation

- run the deterministic empty-store scenario;
- run invalid, unauthorized, stale, duplicate, late, superseded and failure cases;
- run real maintainer-selected integration and independent-transport demonstrations;
- run the browser/bundle demonstration;
- re-run installation, wheel/sdist, migration, backup and Python 3.11–3.13 checks;
- inspect actual wx behavior;
- keep the PR draft until the complete product promise is demonstrated.

Exit condition: only then may the release be marked `RELEASE_READY`.

## 17. Explicit non-goals

- a broad CRUD or search API for agents;
- exposing the SQLite database or internal entity IDs;
- making HTTP, MCP, a provider SDK or any named runtime the core architecture;
- embedding or managing an LLM runtime;
- silently discovering providers, models, executables or endpoints;
- a generic plugin framework;
- a generic workflow engine;
- reviving the browser dashboard or a mandatory local server;
- weakening manual wx operation.