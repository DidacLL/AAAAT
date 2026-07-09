# AAAAT Development Direction for Future Local AI Environment Compatibility

## Purpose

AAAAT should remain an independent, local-first, provider-agnostic job application workspace.

The next development stages should improve AAAAT’s internal architecture so it can later run inside a broader local AI environment without losing its current design principles: private local storage, bounded agent access, human review, explicit artifact generation, and no dependency on a specific LLM provider, MCP server, cloud runtime, or orchestration framework.

This document is scoped to AAAAT development. It does not require knowledge of any external architecture. The target is simple: make AAAAT easier to embed, adapt, automate, and govern as a local AI-compatible application.

AAAAT already has a strong foundation: it is described as a local-first job application workspace that tracks opportunities, prepares recruiter conversations, stores reusable profile material, and generates per-application artifacts such as CV variants and cover-letter drafts from local data. It is built for one person on their own machine, with private job-search data stored locally by default.

## 1. Keep AAAAT independent and provider-agnostic

AAAAT should not become an LLM wrapper.

It should not depend on OpenAI, Anthropic, Ollama, QVAC, MCP, LangChain, or any specific orchestration runtime. These systems may be adapters, but none of them should define AAAAT’s core model.

AAAAT’s durable responsibility is domain logic:

store and organize job opportunities;

manage candidature state;

store professional profile data;

track reusable CV and cover-letter material;

prepare recruiter/interview workflows;

queue bounded tasks;

store generated drafts and artifacts;

maintain provenance and review state;

protect private job-search data.

The existing repository already states that agent workflows are optional and bounded, and that AAAAT is provider-agnostic rather than tied to a specific model, provider, SDK, or external agent. That direction should be preserved.

### Development consequence

Do not implement provider-specific logic inside domain services.

Any model/provider integration should live behind an adapter boundary. AAAAT should describe what it needs done, what context is allowed, what output shape is expected, and what action may be accepted. The provider or host environment should decide how inference is executed.

## 2. Strengthen the separation between domain core and integration surfaces

AAAAT currently has a dashboard runtime and an agent runtime. That separation is correct and should be made more explicit.

The dashboard is the human working surface.

The agent surface is a bounded machine-facing surface.

The domain core should be independent from both.

The current security model already separates the dashboard runtime from the agent runtime: the dashboard serves local human HTML and actions, while the agent runtime exposes only bounded task, context, and action routes.

The next stage should extract a cleaner internal layering:

Domain services: application records, profile facts, career plans, tasks, artifacts, notes, todos, glossary, rendering, review states.

Human UI adapter: current dashboard, future native UI, read-only mode.

Agent adapter: CLI, HTTP agent routes, MCP-compatible descriptor, future embedded local AI host adapter.

Storage adapter: SQLite now, possible alternate local stores later.

Render adapter: current Jinja/LaTeX/template rendering, possible future renderers.

This does not require a rewrite. It requires avoiding leakage between layers.

### Development consequence

Dashboard routes should call domain services.

Agent routes should call bounded domain services.

CLI commands should call the same domain services.

No UI route should become the canonical domain operation.

No agent route should expose dashboard-only assumptions.

No adapter should depend on internal database IDs unless strictly local and human-facing.

## 3. Preserve the existing bounded agent model

AAAAT’s current agent-access model is one of its strongest architectural assets.

The current agent workflow correctly states that AAAAT is not an agent runtime, chat application, or broad CRUD API. Instead, it exposes limited task, context, and action capabilities so external tooling can help without unrestricted database access.

This should remain the baseline.

Agent-compatible access should continue to use:

task handles;

bounded task context;

explicit output contracts;

purpose-scoped context bundles;

bounded action packets;

narrow acknowledgements;

local deterministic apply/review logic.

The current rule that a task handle is not a database row ID, application ID, candidature ID, profile fact ID, artifact ID, file path, or generic mutation authority should remain central.

### Development consequence

Do not add broad agent CRUD.

Do not add “list all applications” for agents.

Do not add “search all profile facts” for agents.

Do not return internal row IDs in agent acknowledgements.

Do not let agent output directly mutate arbitrary records.

Do not let agent-provided file paths become authoritative artifact paths.

Agents may produce drafts, suggestions, structured outputs, task results, and render inputs. AAAAT applies them locally through its own validation and review logic.

## 4. Define an explicit compatibility manifest

AAAAT should expose a small machine-readable compatibility manifest.

This manifest should not be an MCP replacement and should not be tied to one future host. It should describe AAAAT’s capabilities, expected inputs, privacy expectations, task types, context purposes, action packets, artifact types, and UI surfaces.

A first version could be a static JSON file or CLI command output.

It should include:

application name and version;

supported local storage mode;

supported dashboard modes;

supported agent modes;

supported context-bundle purposes;

supported task types;

supported bounded actions;

supported artifact types;

supported import/intake formats;

privacy notes;

external-network assumptions;

whether the app can run without opening an HTTP port;

whether the app can expose structured UI projections;

whether the app supports read-only mode;

whether generated artifacts require human review before external use.

AAAAT already has descriptor/tool-schema compatibility, but this future compatibility manifest should be broader than MCP. It should describe the application’s embedding contract, not only callable tools.

### Development consequence

Add something like:

`aaaat compatibility-descriptor`

or extend the current descriptor system with a provider-neutral application descriptor.

This should not force a final schema too early. Start conservative and document what is stable.

## 5. Improve scope-description without hardcoded routing assumptions

AAAAT should expose what kind of user inputs it can handle, but it should not pretend that all relevant words are literal triggers.

Only very specific terms, such as “AAAAT”, are safe literal triggers.

Generic words such as “application”, “job offer”, “interview”, “recruiter”, “career plan”, “CV”, and “cover letter” can belong to several contexts. They should be described as semantic or format-sensitive signals, not as unconditional literal triggers.

AAAAT should distinguish:

literal triggers: exact safe markers such as `AAAAT`;

semantic scope: job search, candidature tracking, offer evaluation, CV adaptation, cover-letter drafting, recruiter preparation, interview preparation, professional profile management;

format signals: pasted job offer, recruiter message, application form, CV fragment, job URL, role description, company/role block;

owned-data references: saved CV, professional profile, profile facts, career plan, previous candidature, generated cover letter, recruiter notes;

workflow intents: create candidature, evaluate fit, research company, prepare interview, update CV, generate artifact, answer application form.

### Development consequence

Add scope metadata to the compatibility descriptor.

Do not implement scope routing as regex-only. Regex can detect explicit markers. Ambiguous domain detection should remain available to a host LLM or local inference system.

The descriptor should help another local environment decide when AAAAT may be relevant, but AAAAT should not assume it owns every mention of jobs or applications.

## 6. Support blind variable bindings and external identity separation

AAAAT should treat its professional profile as independent from any external user profile.

A future host environment may know a user’s preferred name, username, general identity, or interaction preferences. AAAAT must not assume that those values are correct for professional artifacts.

A user may want different data for AAAAT:

different display name;

different professional email;

different links;

different biography;

different language/tone;

different location;

different public profile;

different CV identity.

AAAAT should support optional import, optional mapping, and optional binding, not automatic synchronization.

Blind bindings are especially useful. A host environment may refer to `profile.display_name` or `professional.email` without reading the value. AAAAT resolves it internally when rendering local artifacts or producing approved outputs.

### Development consequence

Add or formalize a variable-binding layer with:

local owner = AAAAT;

stable placeholder;

optional external alias;

exposure policy;

rendering policy;

summary/redaction behavior;

whether external systems may read, print, render, or only reference the value.

The existing variables/profile-facts model already points in this direction: AAAAT supports sensitive variables, exposure modes, summaries, profile-fact visibility, and usage flags for CVs, cover letters, agent context, market research, and dashboards.

## 7. Make privacy compositional: module data, data item, action

AAAAT should not express privacy as one flat private/public switch.

For future compatibility, privacy should be described from three viewpoints.

First, application-level privacy: what AAAAT stores, owns, and protects.

Second, data-level privacy: what each value or record permits.

Third, action-level privacy: what a specific operation does with the data.

For example:

Rendering a local CV may use raw professional data.

Sending a CV by email is an external disclosure.

Generating a draft cover letter is local artifact preparation.

Uploading the cover letter is external publication.

Local inference over a bounded context is not the same as internet transmission.

Market research may use anonymized professional summaries but not raw identity data by default.

The current exposure model already contains useful primitives such as raw, redacted, summarized, placeholder, and denied. Those should be retained and made more systematic.

### Development consequence

Each context bundle, task type, action packet, and artifact operation should declare its privacy implications.

For example:

`cv_generation`: may use raw professional facts locally.

`market_research`: should default to summarized/anonymized facts.

`candidature_fit`: may use job offer plus selected profile facts.

`cover_letter`: may use professional facts and writing style, but output remains draft until reviewed.

`send_email`: should not exist as an automatic agent action unless a future explicit external-action protocol is defined.

## 8. Strengthen artifact lifecycle semantics

AAAAT should clearly distinguish local generation from external publication.

This is critical for CVs and cover letters. These artifacts are intended to contain professional personal data. Rendering them locally is not a leak by itself. Sending, uploading, submitting, or exporting them outside local storage is the higher-risk step.

AAAAT already renders artifacts locally and tracks generated artifacts with review state and provenance. It also instructs users to review generated documents before sending them.

The next stage should make the artifact lifecycle explicit.

Suggested lifecycle:

draft input;

render requested;

rendered locally;

review pending;

reviewed;

approved for use;

exported locally;

externally sent/submitted/uploaded, if such actions are ever supported;

archived/superseded.

### Development consequence

Generated artifacts should carry:

artifact type;

source application/candidature;

source context;

render inputs;

template used;

created time;

provenance;

review state;

publication/export state;

whether it contains sensitive values;

whether external use requires confirmation.

Avoid treating artifact creation as completion of the application workflow. A rendered CV is not the same as an applied candidature.

## 9. Prepare a host-embedded UI mode without removing the dashboard

AAAAT should not discard its current dashboard.

Standalone AAAAT needs a local human UI. The current dashboard is valid for that use case.

However, to become easier to embed in future local AI environments, AAAAT should also expose a structured UI projection mode that does not require exposing a localhost web dashboard.

This means the domain layer should be able to produce view models:

application list summary;

candidature detail;

task queue;

artifact list;

profile facts summary;

career plan summary;

recruiter call preparation;

dashboard counters;

pending next actions.

A host application could render those natively without scraping HTML or depending on dashboard routes.

### Development consequence

Add a UI projection layer independent from HTML templates.

For example:

`aaaat ui projection dashboard`

`aaaat ui projection application <local_ref>`

`aaaat ui projection tasks`

or internal service functions returning structured view models.

The current dashboard can then render from the same projection layer. Future embedded environments can render it natively.

This also reduces pressure to expose local HTTP endpoints where they are not needed.

## 10. Keep HTTP as an adapter, not the core integration model

AAAAT currently uses FastAPI and binds local servers to `127.0.0.1` by default. That is acceptable for standalone dashboard and local agent compatibility.

But future compatibility should not require HTTP.

A local AI environment may prefer in-process calls, CLI calls, subprocess calls, structured files, IPC, or a native plugin protocol.

Therefore, AAAAT should keep HTTP as one adapter among several.

### Development consequence

Ensure every HTTP route maps to a domain service that can also be called from CLI or another adapter.

Avoid route-only logic.

Avoid HTML-only state transformations.

Avoid assuming localhost access as the only way to integrate.

Do not expose OpenAPI JSON or dashboard routes as the machine contract unless deliberately running in development/debug mode.

## 11. Bridge task systems instead of replacing them

AAAAT already has its own task system. It should keep it.

Future local AI environments may also have their own reasoning task systems. AAAAT should be prepared to bridge, not replace.

AAAAT’s internal task remains the domain-level work item: company research, field inference, keyword definition, draft form responses, draft CV, draft cover letter, career plan review, and so on.

An external host task may schedule the reasoning execution. AAAAT should remain responsible for:

creating domain tasks;

binding tasks to applications/candidatures internally;

providing bounded context;

validating result shape;

storing result with provenance;

applying results through local logic;

updating review state.

### Development consequence

Add explicit task-envelope semantics.

A task envelope should include:

stable task handle;

task type;

purpose;

instructions;

input context;

allowed actions;

output contract;

privacy notes;

expected response format;

provenance fields;

result submission contract.

The current agent context already follows this direction, exposing task handle, task type, title, instructions, purpose, input context, output contract, response format, allowed actions, and privacy notes.

## 12. Make in-module reasoning optional, not mandatory

AAAAT should be usable without any model.

Manual use must remain valid.

Agent-compatible workflows should remain optional.

A future local AI environment may give AAAAT live local reasoning, background task execution, and stronger orchestration. AAAAT should be ready to benefit from that, but not require it.

### Development consequence

Keep deterministic workflows and manual dashboard use first-class.

For AI-assisted flows, AAAAT should be able to express:

what reasoning is requested;

what local data may be used;

what external data may be fetched, if any;

what output shape is expected;

how the result will be reviewed or applied.

Do not hardwire “call an LLM now” into core operations. Create tasks, requests, or action packets that an adapter can execute.

## 13. Improve provenance and audit metadata

AAAAT already stores provenance-like fields such as agent name, runtime, model provider, source context, review state, and notes in several tables. This should be expanded consistently.

Future debugging and trust will depend on being able to answer:

Who or what generated this?

From which input?

Using which task?

Using which profile/context exposure?

Was a model involved?

Was internet access involved?

Was the result reviewed?

Was it rendered into an artifact?

Was it externally sent or only stored locally?

### Development consequence

Normalize provenance fields across suggestions, text blobs, tasks, artifacts, and action submissions.

Avoid making provenance provider-specific. Use generic fields first, with optional provider details.

Suggested metadata:

source_type: user, local_agent, external_adapter, imported_file, manual_dashboard;

agent_name;

agent_runtime;

model_provider;

model_id, if known;

host_environment, if any;

context_purpose;

privacy_profile_applied;

input_refs, using non-authority references;

created_at;

review_state;

applied_at;

applied_by.

## 14. Add compatibility tests

AAAAT should test its boundaries, not only its happy paths.

The current security model is good, but future development should enforce it continuously.

### Development consequence

Add tests that verify:

agent runtime does not expose dashboard routes;

agent runtime does not expose broad CRUD;

agent acknowledgements do not return internal row IDs;

task handles cannot be used to access unrelated data;

read-only agent mode blocks writes;

read-only dashboard mode blocks dashboard actions;

context bundles respect exposure policies;

market-research bundles do not expose raw sensitive data by default;

generated artifacts are local and review-pending by default;

static demo export never uses private data;

private file paths are not returned to agents;

agent-submitted outputs cannot mutate arbitrary records.

These tests are more important than adding new agent features quickly.

## 15. Recommended next development stages

Stage 1: architectural cleanup without behavior changes.

Extract or clarify domain services behind dashboard, CLI, and agent routes. Ensure the same domain operations can be called without HTTP. Document which services are stable and which are internal.

Stage 2: compatibility descriptor.

Add a provider-neutral descriptor that explains AAAAT’s scope, task types, context purposes, bounded actions, artifact types, privacy assumptions, and supported integration modes.

Stage 3: UI projection layer.

Create structured view models for dashboard-like rendering. Keep the current HTML dashboard, but make it consume the same projection layer that future embedded UIs could use.

Stage 4: privacy and exposure consolidation.

Review variables, profile facts, career plans, context bundles, and market-research flows. Normalize exposure behavior and document exactly what each purpose may reveal.

Stage 5: artifact lifecycle hardening.

Make artifact states and publication states explicit. Separate render, review, export, and external submission semantics.

Stage 6: task-envelope hardening.

Make task envelopes, output contracts, privacy notes, and result submission schemas stricter. Add tests against ID leakage and unauthorized mutation.

Stage 7: optional host adapter prototype.

Add a minimal adapter that proves AAAAT can be driven by an external local AI environment without relying on dashboard scraping, broad CRUD, or provider-specific assumptions.

## 16. What should not be done

Do not turn AAAAT into a general agent runtime.

Do not make AAAAT dependent on one LLM provider.

Do not make MCP the core architecture.

Do not expose broad CRUD to agents.

Do not expose dashboard routes as the agent contract.

Do not assume external systems should read AAAAT’s private professional profile.

Do not automatically synchronize identity data from a host environment.

Do not treat generated artifacts as externally sent.

Do not require localhost HTTP for all integrations.

Do not remove the standalone dashboard.

Do not overfit the architecture to one future host.

## 17. Strategic direction

AAAAT should evolve into a clean local-first, provider-agnostic, AI-compatible career application workspace.

The key development direction is not “more agent access”. It is better separation between domain logic, local UI, bounded machine access, privacy policy, artifact lifecycle, and optional host integration.

The ideal future AAAAT can run in three modes:

Standalone manual app: user operates the dashboard directly.

Standalone agent-compatible app: bounded local adapters use tasks, context bundles, and action packets.

Embedded local AI app: a host environment renders AAAAT natively, schedules reasoning work, and provides local inference while AAAAT keeps ownership of its domain data, privacy rules, task binding, and artifact lifecycle.

That direction preserves AAAAT’s current strengths while making it easier to integrate into future local AI environments.
