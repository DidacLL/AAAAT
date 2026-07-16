# AAAAT v1 authoritative requirements

Status: sole authority for v1 implementation and release decisions.

Effective date: 2026-07-16.

## 1. Product identity

AAAAT is a local-first, open-source, provider-agnostic job-application workspace and artifact generator.

AAAAT remains fully usable through its wx desktop application without external intelligence.

AAAAT owns private data, local persistence, one bounded work queue, purpose-scoped work construction, result validation, deterministic domain application, local rendering, provenance, and desktop state.

External AI or agent hosts own reasoning, provider/model/runtime selection, credentials, network policy, and host-specific SDK, skill, tool, browser, command, or inference-engine interaction. A connected LLM is also the user's intelligent setup surface: it may assess its host and create its own host-side configuration as that host's policy requires. AAAAT does not become a provider SDK, credential store, or host plugin framework to do that work.

AAAAT is not an LLM runtime, provider wrapper, agent orchestrator, plugin host, broad CRUD API, browser product, or named-provider integration.

## 2. Authority order

When sources conflict:

1. direct maintainer instruction;
2. this document;
3. accepted wx product behavior and explicit product corrections;
4. current code that supports those decisions.

Tests, PR descriptions, review scripts, planning notes, generated documentation, historical PO annexes, and implementation comments are not authorities. They must be changed or deleted when they contradict this document.

No test may preserve an obsolete interface merely because it already exists.

## 3. Canonical human product

wx is the only v1 human runtime.

The application is a single local desktop product with four user-facing views:

- Welcome: understandable first-use state, manual continuation, assisted-use entry points, and current connection status.
- User: human-readable profile and reusable career information editing.
- Smart: a minimal recruiter-call cockpit.
- Detailed: complete candidature inspection and editing.

The UI must use user language. It must not expose queue terminology, task states, capabilities, transports, ports, executables, provider architecture, storage paths, database concepts, or integration internals unless the user deliberately opens an Advanced technical area.

There is no browser dashboard, mandatory local server, FastAPI product runtime, static-export product mode, webview shell, or separate human data API in v1.

## 4. Canonical candidature model

A candidature is the primary user object.

Its editable product fields are those implemented by the accepted candidature domain model, including the retained source material and the agreed application, preparation, evaluation, research, form, CV, cover-letter, and interview information.

The product must not invent generic CRM fields such as `next action` merely because an early dashboard seed mentioned them.

A candidature has one editable notes value. It is not a collection of candidature notes.

Keywords are structured global records with a literal term, aliases/admitted forms, definition, and optional keyword note. Editing a candidature's keyword field must select or create keyword records; it must not silently store arbitrary comma-separated text detached from the keyword model.

## 5. View responsibilities

### 5.1 Smart View

Smart View is optimized for an unexpected recruiter or interview call. It must remain sparse and fast.

It shows only the information needed for that use case, including the selected candidature, concise offer/call context, the single candidature note, relevant questions/risks/pitch material, and selectable keywords with the focused glossary panel.

Smart View must not show task lists, task states, integration status, artifact history, broad editing forms, or Detailed View clutter.

The right-side panel in Smart View is the call-support/keyword context panel. Its content is specific to Smart View.

### 5.2 Detailed View

Detailed View is the complete readable and editable candidature form.

It shows the candidature fields and local artifact references needed for editing and inspection.

Detailed View must not reuse the Smart View glossary/keyword-definition panel. It contains the candidature keyword editor only. That editor creates/selects structured keywords.

The right-side area in Detailed View, where present, must support Detailed View's editing use case rather than mirror Smart View.

### 5.3 Welcome and empty state

A clean workspace must not stop at `No candidature found`.

The empty state must explain what AAAAT is for and provide an obvious human action to create/import the first candidature or continue to the relevant onboarding flow.

There is no separate technical setup prerequisite for manual use.

### 5.4 User and assistance UX

Manual use is always available.

Standard assisted use starts from a plain "Connect my AI" choice. The connected LLM chooses the most suitable host-native route after assessing its own capabilities: local MCP first, then a host tool/skill, an approved host-side script or automation, and portable transfer only if no local connection is possible. The UI may also offer manual continuation and an Advanced technical area.

Standard onboarding must not require terminal knowledge or understanding of MCP, ports, executables, SDKs, commands, capabilities, task states, model architecture, provider internals, storage locations, or database concepts. A normal user sees only plain connection state and consent.

Technical command settings and transport diagnostics appear only in Advanced integration or dedicated troubleshooting material.

## 6. Canonical assisted architecture

The normal architecture is external-host pull:

```text
AAAAT creates bounded work
→ an external AI or agent host requests one eligible work item
→ AAAAT atomically claims that attempt and returns the complete purpose-scoped work item
→ the external actor reasons in its own runtime
→ the external actor reports progress and submits one structured result or permitted action
→ AAAAT validates, applies, persists and renders locally
```

The complete work item includes the instructions, bounded context, response schema, privacy/disclosure information, permitted callbacks, provenance fields, and one random attempt-scoped capability.

There is no normal `get context after next`, `packet`, or `dispatch` step. Those split surfaces are obsolete and must not be restored through compatibility aliases, docs, tests, or wrappers.

AAAAT does not call, select, host, launch, schedule, configure, or orchestrate an LLM. That limit applies to AAAAT's product runtime, not to a connected LLM configuring its own host as its host policy requires. Host setup is a separate control plane; claimed work remains the bounded data/result plane.

## 7. Capability and authority model

The external actor receives a random, persisted, attempt-scoped capability. It is not an internal task ID, candidature ID, application ID, artifact ID, profile fact ID, file path, or storage path.

The capability authorizes only the callbacks declared by the work item for that active attempt.

AAAAT privately binds the capability to internal records.

An external actor may:

- obtain one complete eligible work item;
- report progress for that attempt;
- submit one bounded result;
- submit one explicitly permitted bounded action;
- create a new candidature through the dedicated bounded action;
- request supported deferred work through that action;
- cancel one attempt only where cancellation is genuinely supported.

An external actor may not enumerate private entities, search arbitrary records, mutate by internal IDs, create arbitrary tasks against internal candidature IDs, choose authoritative artifact paths, access SQLite or arbitrary local files, bypass domain validation, or reuse a stale/completed/superseded capability.

The broad local/admin CLI is not an agent contract and must not be used as the normal human review path for assisted behavior.

## 8. Communication wrappers

The connected-host bridge and fallback wrappers reuse the same queue, work-item builder, progress service, result ingestion, action validation, and domain application:

- operational stdio MCP;
- bounded CLI;
- opaque paired local host bridge;
- portable task/result files or archives;
- optional user-owned Advanced command.

Every wrapper exposes operations equivalent to:

- claim the next complete work item;
- report progress;
- submit a bounded result;
- submit a permitted bounded action.

A wrapper must not add context-fetch, packet, dispatch, broad listing, arbitrary search, mutation by internal IDs, database access, unrestricted filesystem access, or a generic command catalogue.

## 9. Connected hosts and portable fallback

The normal assisted route is a paired local host connection. AAAAT supplies a versioned, host-only connection brief; the LLM uses its own capability and permission model to configure a suitable route and verifies the connection before it claims real work. The brief, pairing capability, bridge command, storage mapping, and diagnostics are host-side details, never normal user-facing content.

The paired bridge exposes setup verification plus the canonical claim, progress, result, and bounded-action operations. It is not a second queue or a broad local API. It is an information and UX boundary, not an operating-system sandbox against another process running as the same user.

Portable use is the last fallback when a host cannot access a local bridge. It must be understandable from wx without requiring the user to design a transport.

Portable flow:

- the user selects eligible candidature assistance in wx;
- AAAAT creates one complete portable work bundle;
- the user transfers that bundle to the external AI;
- the external AI returns one result bundle;
- AAAAT imports and validates it through canonical ingestion;
- valid independent sections are retained when another section is invalid.

Repeated card-by-card copying is not acceptable.

A wrapper that merely starts and waits on stdio is not a human demonstration. Review instructions must provide a real client command, fixture, or UI action that completes the round trip.

## 10. Advanced user-owned command

Advanced setup may allow a technical user to configure a fixed argv command, macro, or script. The command may be manually or LLM-generated, but it is explicitly user-owned and trusted.

This option is Advanced-only, optional, isolated from standard onboarding, and constrained to the same complete work-item/result contract.

```text
stdin  = one complete bounded work item
stdout = one final result envelope
stderr = optional progress and diagnostics
exit 0 = completed
nonzero exit = failed
```

The command path must reuse canonical acquisition, progress, validation, and domain application. An LLM may author the user-owned host script when that host permits it, but AAAAT must not ingest, activate, or manage generated connectors.

## 11. Assisted lifecycle requirements

The release must implement and demonstrate, from wx where user-facing:

- manual candidature creation and editing;
- creation from retained raw source material;
- bounded field completion and evaluation;
- company research where requested;
- recruiter/interview preparation;
- form-response preparation;
- tailored CV data/content preparation;
- cover-letter content preparation;
- local rendering and artifact tracking;
- provenance and editable results;
- visible progress, failure, retry, and cancellation only where supported;
- projection refresh without application restart.

AAAAT decides eligible fields, context, and permitted outputs. Results use existing domain services and deterministic application rules. There is no generic workflow engine.

## 12. Error and recovery requirements

Expected user mistakes and invalid external input must produce concise actionable errors, not raw Python tracebacks.

This includes invalid local IDs, missing records, foreign-key violations, malformed JSON, unsupported actions, invalid result schemas, expired capabilities, missing template variables, unavailable external commands, and malformed wrapper messages.

Missing template variables must identify the missing human profile information and direct the user to the User view or equivalent supported edit path.

A clean MCP/native host process waiting for protocol input is normal, but documentation and review instructions must never tell a human to launch it interactively without a client and then interpret waiting as failure.

## 13. Backup, upgrade, and Windows support

Backup and upgrade are release-critical product behavior.

Backup must work on supported Windows and Unix-like systems while the database is not actively being mutated. All SQLite connections and copied database handles must be closed before temporary files are removed or archived.

Upgrade must:

- preserve candidatures, the single note value, profile data, keywords, tasks/attempt history, artifacts, and provenance;
- be idempotent;
- safely remove or ignore obsolete provider/generated-connector configuration;
- leave manual mode usable;
- provide a restorable backup path.

A green Linux CI run does not satisfy Windows backup acceptance.

## 14. Privacy and artifacts

Private data remains local until AAAAT intentionally constructs one bounded work item.

Expose only task-required context. Omit or redact identity where unnecessary. Wrappers receive no database path or ambient filesystem authority. No real user data enters source control, fixtures, or release artifacts.

Artifacts retain controlled local paths, internal candidature binding, task context, agent provenance, reported provider/model metadata when supplied, timestamps, state, and notes. External actors may not choose authoritative artifact paths.

Privacy acceptance must assert structure and behavior: exact allowed schemas, absence of forbidden fields in recursively inspected outputs, capability rejection, cross-task isolation, path confinement, and no mutation after invalid input. A grep for words is not sufficient.

## 15. Release acceptance

Automated fake-data gates must prove:

1. manual wx operation with no integration;
2. correct empty-state and first-candidature guidance;
3. Smart View and Detailed View responsibilities remain distinct;
4. one-note candidature behavior and structured keyword editing;
5. understandable standard assisted onboarding without internal jargon;
6. atomic complete-work acquisition through at least two independent wrappers;
7. paired-host or portable result round trip;
8. profile completion and guided missing-profile errors;
9. candidature creation from raw source;
10. lifecycle generation and research;
11. local rendering and artifact tracking;
12. provenance and structural privacy enforcement;
13. progress, failure, retry, and supported cancellation;
14. invalid, unauthorized, stale, duplicate, late, and superseded result handling;
15. final results visible in wx without restart;
16. no broad data-access, internal-ID mutation, second queue, split context surface, or generated connector subsystem;
17. clean installation and migration;
18. working backup/restore on Windows and at least one Unix-like platform;
19. concise user-facing errors without tracebacks.

Before `RELEASE_READY`, a human must complete documented, executable demonstrations of:

- clean wx first use;
- existing-store backup, upgrade, restart, and restore;
- Smart View and Detailed View use cases;
- one real external AI or deterministic external-host fixture using the complete work-item contract;
- operational MCP with a supplied client/fixture;
- paired local host or portable round trip;
- Advanced command only when deliberately selected;
- local artifact rendering after guided profile completion.

No named provider or runtime is mandatory.

## 16. Implementation order

1. Remove contradictory requirements, tests, docs, and PR claims.
2. Correct wx product behavior and onboarding language.
3. Correct user-facing error handling and Windows backup.
4. Stabilize complete work acquisition, progress, result, action, provenance, and attempt rules.
5. Ensure every wrapper reuses canonical services.
6. Complete browser and portable workflows with executable user instructions.
7. Complete lifecycle and rendering guidance in wx.
8. Add structural behavioral tests and platform-specific backup tests.
9. Run automated validation.
10. Perform the real human review from the documented product workflow.

## 17. Explicit non-goals

- broad CRUD or search APIs for agents;
- exposing SQLite or internal entity IDs;
- asking users to fabricate IDs for normal assisted workflows;
- making HTTP, MCP, a provider SDK, or a named runtime the domain architecture;
- embedding or managing an LLM runtime;
- AAAAT-initiated provider or inference calls in the standard path;
- generated connector package ingestion, storage, activation, or execution inside AAAAT;
- silent provider/model/executable/endpoint discovery;
- a generic plugin framework;
- a generic workflow engine;
- a browser dashboard or mandatory local server;
- task/state clutter in Smart View;
- a Smart View glossary panel in Detailed View;
- multiple candidature notes;
- generic CRM fields not in the accepted candidature model;
- weakening manual wx operation.
