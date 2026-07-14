# AAAAT v1 authoritative requirements

Status: authoritative for v1 completion.

Effective date: 2026-07-15.

This document replaces earlier seed prompts, generated requirement summaries, abandoned integration plans, and release-readiness claims where they conflict with it. Historical documents remain useful as design history, but they are not implementation authority.

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

- reasoning;
- extraction and enrichment;
- evaluation and recommendations;
- research;
- drafting;
- provider, model and runtime selection;
- provider credentials and network policy;
- provider-specific transport or browser interaction.

AAAAT is not:

- an LLM provider or model runtime;
- a model downloader or model host;
- a provider SDK wrapper;
- a general agent orchestrator;
- a broad CRUD API for agents;
- a browser/server product;
- dependent on a listening port;
- dependent on paid middleware, proprietary automation products or cloud integration services;
- tied to an industry-standard integration merely because it is common.

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

Do not revive a browser dashboard, mandatory local server, FastAPI product runtime, static-export product mode, webview shell or separate human API.

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

AAAAT must support the major capability classes of external intelligence rather than assuming that every LLM can access files, execute commands or expose an API.

Required classes:

1. local executable models, especially Ollama and llama.cpp;
2. programmable CLI or desktop agent hosts;
3. file-capable agents;
4. browser-only conversational LLMs that cannot read local folders or execute commands;
5. future user-owned hosts implementing the bounded contract.

The communication layer must use one provider-neutral task/result contract while allowing different transports for different host capabilities.

AAAAT must not require provider credentials, API keys or tokens. Any provider-specific authentication remains outside AAAAT.

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
- report progress;
- submit one result for that task;
- submit explicitly permitted actions;
- create a new candidature from bounded source material through a dedicated action;
- request supported deferred tasks.

An external actor may not:

- enumerate all private entities;
- search arbitrary local records;
- mutate by candidature, profile, artifact or database ID;
- choose authoritative artifact paths;
- write arbitrary files inside AAAAT storage;
- bypass domain validation;
- use a task handle for anything except its specific capability.

AAAAT privately binds opaque handles to internal records.

## 7. Required communication implementations

The v1 release must implement the following paths under the same bounded contract.

### 7.1 Local Ollama subprocess path — priority standard-user path

Purpose: provide the simplest fully local, automatic, private assisted workflow.

Requirements:

- invoke Ollama through its local command-line executable;
- do not implement an Ollama HTTP client in AAAAT;
- do not expose an AAAAT port;
- run inference outside the wx event thread;
- support a recommended standard-user configuration;
- allow advanced users to override model, executable, arguments and timeout;
- allow the local model to return a self-description and recommended invocation manifest;
- treat all self-reported identity and capability claims as advisory;
- independently verify the invocation and behavior through conformance tests;
- strictly validate structured results;
- preserve failure details and safe retry;
- report provider/model provenance when the external runtime reports it.

Standard-user experience:

```text
Connect local AI
→ use recommended Ollama setup
→ invoke bootstrap task
→ model proposes its runtime manifest
→ AAAAT validates it
→ run deterministic health and capability tests
→ enable assisted work
```

AAAAT may use explicitly selected documented commands to verify the environment. It must not silently scan the machine, infer user intent or grant authority based on discovery.

### 7.2 Local llama.cpp subprocess path — independent portability proof

Purpose: prove that the protocol is not coupled to Ollama.

Requirements:

- invoke `llama-cli` or the supported local CLI executable directly;
- support prompt files and schema/grammar-constrained output where available;
- remain fully local and port-free;
- use the same task/result contract and validation pipeline as Ollama;
- support explicit model-file configuration for advanced users;
- run the same deterministic conformance suite.

### 7.3 Generic user-owned command path

Purpose: support programmable hosts and future runtimes without provider-specific core code.

Minimum contract:

```text
stdin  = bounded task envelope
stdout = final result envelope
stderr = progress and diagnostics
exit 0 = completed
nonzero exit = failed
```

A rendezvous-directory variant may be used when needed for progress, cancellation or large context, but it must remain one-task scoped and must not expose global storage.

### 7.4 AI-authored connector onboarding

Purpose: let an external LLM adapt itself to AAAAT instead of requiring AAAAT to ship a provider integration catalogue.

Requirements:

- Welcome/User can generate a connector-construction prompt and optional file bundle;
- browser-only LLMs must be able to receive the construction prompt as plain text;
- file-capable agents may receive the same material as a folder or archive;
- the LLM may propose a connector implementation and manifest;
- users may paste a generated connector package into AAAAT when the LLM cannot write files;
- AAAAT must constrain installation to a controlled private connector directory;
- AAAAT must display generated files before installation;
- AAAAT must reject absolute paths, traversal, unexpected files and unsupported execution declarations;
- every connector must pass deterministic conformance tests before real private context is exposed;
- failed connectors remain disabled and produce a repair package suitable for returning to the generating LLM.

This is not a generic plugin framework. It is one narrow connector contract and one validation harness.

### 7.5 Browser-only conversational path

Purpose: support users whose LLM exists only in an authenticated browser chat and cannot access local files or run commands.

Preferred automatic path:

- a small open-source browser companion using native messaging or another port-free browser-supported local mechanism;
- no credentials stored in AAAAT;
- authentication remains in the user’s normal browser session;
- browser/site interaction logic remains outside AAAAT core;
- site profiles may be generated or repaired by the user’s chosen LLM;
- the companion exchanges only bounded task/result messages;
- AAAAT validates all returned content identically to other paths.

The browser companion must not become a paid dependency, mandatory component or broad browser automation framework.

Required worst-case fallback:

- AAAAT groups all eligible work for one candidature into one portable task bundle;
- the bundle contains bounded context, all requested tasks, instructions and result schema;
- the user can drag one archive into the browser chat;
- the LLM returns one result bundle;
- the user imports or drags that one result back into AAAAT;
- AAAAT validates each result section independently;
- one invalid section must not discard unrelated valid sections;
- no repeated card-by-card copying is acceptable.

The fallback is a compatibility floor, not the preferred product experience.

## 8. Harmless standards allowed

Standards are permitted only when they reduce complexity without weakening authority boundaries.

Allowed examples:

- JSON and JSON Schema for envelopes and validation;
- NDJSON for progress and diagnostics;
- stdin/stdout/stderr and process exit codes;
- ZIP or directory task bundles with a documented AAAAT media type;
- browser native messaging for the optional browser companion;
- MCP over stdio only as a thin optional adapter over the bounded protocol.

MCP must not become the core architecture, a server requirement or a broad tool catalogue.

Provider APIs, OpenAI-compatible HTTP, SDK bundles and token management are not required v1 integration mechanisms.

## 9. Integration onboarding and health

Welcome/User must provide guided setup for standard users and explicit controls for advanced users.

Required standard flow:

- continue manually;
- connect a local AI using the recommended setup;
- connect a browser-only AI;
- connect an existing command or generated connector;
- understand whether the path is local, networked or browser-mediated;
- run a harmless health test before private context exposure;
- see actionable failures;
- disable, replace or retry an integration.

Required advanced controls:

- executable and argument override;
- model or model-file override where relevant;
- timeout;
- task-specific override where justified;
- declared research/network capability;
- connector location and provenance;
- view conformance results and logs.

AAAAT may recommend a tested model/runtime combination for standard users. Advanced configuration must remain optional.

## 10. Assisted profile completion

The profile flow must allow external intelligence to identify missing information and return bounded profile updates.

Requirements:

- AAAAT decides which profile fields are eligible for the task;
- purpose-scoped exposure rules apply: raw, redacted, summarized, variable reference only or denied;
- browser or external-host interaction may ask the user questions outside AAAAT;
- returned updates are validated against allowed profile keys and value types;
- no profile IDs are exposed as authority;
- updates are stored locally and immediately visible/editable in User view;
- invalid or partial results preserve existing values;
- retry is safe and idempotent.

## 11. Candidature intake and complete lifecycle

Source material may include:

- pasted job offer;
- recruiter message;
- application form/questions;
- job description;
- user conversation;
- imported bounded task bundle.

AAAAT must retain the original source and support these assisted outcomes:

1. source extraction and enrichment;
2. opportunity evaluation;
3. role-specific strategy;
4. company research where the selected integration supports research;
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
- duplicate and stale results are rejected or acknowledged idempotently;
- completion refreshes the relevant projection without restart;
- manual editing remains available before, during and after assisted work.

## 13. Privacy model

Private data remains in configured local storage.

Rules:

- expose only context required for the task purpose;
- professional identity belongs to AAAAT’s profile;
- local rendering may resolve blind variables without exposing raw values externally;
- research tasks do not receive raw personal identity by default;
- connectors receive no global database path or arbitrary filesystem authority;
- generated connector tests use fake data only;
- no real user data enters source control, fixtures, release artifacts or public demos;
- generation, local rendering and external submission are distinct states.

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

The decisive release gate is one deterministic empty-store scenario using fake data and deterministic fake implementations of every required transport boundary.

It must prove:

1. manual operation with no integration;
2. standard integration onboarding and health;
3. local subprocess bootstrap and conformance;
4. profile completion;
5. candidature creation from raw source;
6. extraction and enrichment;
7. evaluation;
8. strategy;
9. supported research;
10. recruiter and interview preparation;
11. form answers;
12. tailored CV generation;
13. cover-letter generation;
14. local rendering and artifact tracking;
15. provenance and privacy enforcement;
16. progress, failure and retry;
17. invalid and unauthorized result rejection;
18. stale and duplicate result behavior;
19. final results visible in desktop projections;
20. no AAAAT listening port or mandatory HTTP runtime;
21. no provider credentials or tokens managed by AAAAT;
22. installation, migration, backup and supported-Python preservation.

Additional real manual demonstrations required before `RELEASE_READY`:

- a real Ollama CLI round trip using a local model;
- a real llama.cpp CLI round trip or equivalent independent local implementation;
- the browser-only single-bundle fallback;
- guided wx integration setup, progress, failure and retry;
- artifact rendering and visible editable results.

CI alone is not release proof.

## 16. Missing-work implementation plan

Implement in this order to avoid losing the product boundary again.

### Phase 1 — freeze authority and remove drift

- adopt this document as the v1 authority;
- mark superseded seed prompts and requirement documents deprecated;
- update release checklist to reference this specification;
- remove release-ready language unsupported by product evidence;
- retain valid packaging, migration, backup and wx work.

Exit condition: contributors can identify one authoritative requirements source.

### Phase 2 — stabilize the bounded protocol

- finalize task, context, result, progress and provenance envelopes;
- enforce opaque handles and permitted actions;
- define schema validation and idempotency;
- create deterministic fake connector and conformance harness;
- ensure no internal IDs or arbitrary paths cross the boundary.

Exit condition: one fake connector completes and retries the full deterministic lifecycle.

### Phase 3 — local subprocess integrations

- implement Ollama CLI execution and bootstrap manifest;
- implement recommended standard-user setup;
- implement advanced overrides;
- implement llama.cpp CLI execution with structured-output constraints where available;
- run both through the same validation and task application pipeline.

Exit condition: real local round trips complete profile and candidature work without HTTP or wx blocking.

### Phase 4 — connector construction and validation

- generate text and file bootstrap materials;
- accept pasted connector packages;
- install only into controlled private storage;
- add static restrictions and runtime conformance tests;
- generate actionable repair output.

Exit condition: an independently generated connector can be installed and validated without modifying AAAAT core.

### Phase 5 — browser-only support

- implement one-task/candidature portable bundle export and result import;
- group all required work into one upload and one return file;
- implement optional browser companion/native-messaging path;
- keep provider-specific page behavior outside core.

Exit condition: browser-only users have a tolerable two-transfer fallback and an automatic path where the companion supports their environment.

### Phase 6 — complete wx workflows

- finish Welcome/User integration setup and health UX;
- expose task progress, errors and retry;
- complete assisted profile flow;
- complete intake and candidature lifecycle actions;
- refresh Smart/Detailed/User projections after results;
- keep all generated visible fields editable.

Exit condition: a non-technical user can complete the lifecycle from wx without terminal knowledge.

### Phase 7 — release validation

- run deterministic empty-store scenario;
- run invalid, unauthorized, stale, duplicate and failure cases;
- run manual Ollama, llama.cpp and browser-bundle demonstrations;
- re-run installation, wheel/sdist, migration, backup and Python 3.11–3.13 checks;
- inspect actual wx behavior;
- keep PR draft until the complete product promise is demonstrated.

Exit condition: only then may the release be marked `RELEASE_READY`.

## 17. Explicit non-goals

Do not add:

- mandatory HTTP or listening ports;
- embedded model inference;
- provider credential storage;
- provider SDK bundles;
- generic plugin discovery or loading;
- browser dashboard recovery;
- workflow engines, distributed queues or event buses;
- broad agent CRUD or entity search;
- arbitrary connector filesystem access;
- speculative future architecture;
- unrelated Smart/Detailed redesign;
- dependencies justified only because they are common in the AI industry.

## 18. Release status rule

Use `RELEASE_READY` only when the complete assisted product promise has been demonstrated through the deterministic scenario and required real manual paths.

Packaging success, schema existence, a generic command runner, Codex compatibility or passing legacy tests are insufficient by themselves.
