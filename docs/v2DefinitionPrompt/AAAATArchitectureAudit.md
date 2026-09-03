# AAAAT Architecture Audit: Why the Prototype Should Be Replaced, Not Repaired

## Verdict

The evidence supports a stronger conclusion than “AAAAT needs a refactor.”

**The current AAAAT implementation should be treated as a failed production architecture and a successful discovery prototype. A clean restart is justified.**

That distinction matters. The prototype has produced valuable evidence about the product: local ownership is useful, manual operation matters, the visual direction is promising, the candidature-centered workflow has merit, and AI should enhance rather than own the experience. But the implementation has also demonstrated that several architectural assumptions are incompatible with the intended audience and with reliable AI integration. The repository itself contains evidence of this: an earlier release-readiness PR explicitly said that a green Python/Linux matrix was not evidence of product readiness, and listed understandable AI onboarding, operational MCP, visible progress, portable exchange, and human-reviewable workflows among the unresolved blockers. fileciteturn32file0L2-L2

The most important finding is that **the AI UX problems are not peripheral bugs**. They follow directly from product and architecture rules that AAAAT deliberately encoded. The current product documentation says AAAAT must not choose a model, ask for an API key or model URL, use provider SDKs, behave like an LLM client, or contain a provider catalogue; instead, the user's external AI host is expected to perform inference. fileciteturn5file0L2-L2 fileciteturn10file0L2-L2 The repository's development rules reinforce that choice by forbidding provider SDKs, connector catalogues, workflow engines and similar mechanisms, while explicitly requiring the wx desktop and preserving the existing Smart/Detailed architecture. fileciteturn26file0L2-L2

That was a coherent experiment in extreme provider neutrality. It did not produce the desired product.

| Area | Audit assessment | Restart implication |
|---|---|---|
| Product idea | **Strong** | Keep |
| Local-first/manual-first principle | **Strong** | Keep |
| Current visual/product direction | **Promising** | Reinterpret, do not port code |
| SQLite/local files | **Good fit** | Keep concept, redesign schema |
| wxPython UI implementation | **Poor long-term fit** | Replace |
| Smart/Detailed implementation architecture | **Over-coupled** | Redesign |
| Current AI connection model | **Fundamentally mismatched to target UX** | Delete |
| MCP implementation | **Too central and too hand-built** | Reintroduce later as optional integration |
| File/chat exchange protocols | **Prototype workaround** | Remove from normal product |
| Zero-runtime-dependency policy | **Counterproductive** | Abandon |
| Existing AI task/capability state machine | **Complexity without proportional user value** | Do not port |
| Current automated tests | **Useful historical specifications, but contaminated by old architecture** | Rewrite around user behavior |
| Existing repository/history | **Valuable engineering evidence** | Preserve publicly as prototype history |

The recommendation is therefore **not a migration of the Python application into a nicer UI framework**. It is a new AAAAT implementation using the old repository as research material.

A useful way to express the decision is:

> **Preserve the problem, product knowledge, data semantics and lessons. Discard the implementation contracts.**

That is particularly important because the existing code has become self-protecting. `test_dependency_policy.py`, for example, literally asserts that the project's core dependency list must remain empty and that wxPython must remain optional rather than asking whether those constraints still produce the best application. fileciteturn23file0L2-L2 A prototype invariant has effectively become a test requirement.

That is backwards for a restart.

The audit is based on the current GitHub repository, its source tree, product/architecture documentation, AI integration implementation, schema, CI configuration, release/readiness pull requests and current external platform specifications. I did not treat “the tests pass” as evidence that the reported UX works well; the repository's own human-review history already warns against making that inference. fileciteturn32file0L2-L2

## Why the current prototype failed

The central architectural error was not “using Python” or even “using wxPython.” It was **optimizing for implementation purity and provider neutrality at the wrong boundary**.

AAAAT currently tries to be AI-agnostic by refusing to be responsible for AI inference. That sounds attractive architecturally, but it transfers integration complexity from the application to the user.

The README describes `Connect my AI` as preparing a self-contained connection request containing instructions, capabilities, schemas, an MCP launch command, file-exchange fallback and tagged-chat fallback. The user then copies that request and pastes it into whichever AI host they already use. fileciteturn5file0L2-L2 The dedicated onboarding panel implements exactly that model: it tells the user to open their AI, ask it to connect, copy the request, paste it into the host, and potentially exchange files when the live path is unavailable. fileciteturn14file0L2-L2

For a developer demonstrating interoperability, this is interesting.

For a normal user trying to manage a job application, it is an integration ceremony.

The repository even recognized the contradiction during development. PR #45 says standard assisted onboarding must use plain user language and must not require ports, executables, IDs, capabilities, queue terminology, or model/runtime knowledge; it simultaneously lists understandable onboarding and operational MCP as release blockers. fileciteturn32file0L2-L2

The deeper issue is that hiding the terminology cannot fix the underlying workflow. A nontechnical user still has to move data between two applications and hope that an external AI host correctly understands AAAAT's private protocol.

The implementation supports three carriers for essentially the same AI workflow:

1. direct MCP/host-bridge interaction;
2. watched-folder JSON task/result exchange;
3. tagged JSON copied through an ordinary AI chat.

The AI integration documentation presents these explicitly as equivalent integration carriers. fileciteturn10file0L2-L2 The `file_exchange.py` implementation therefore has to define protocol/media versions, create `pending`, `results`, `processed` and `rejected` directories, claim work, create random exchange IDs, emit schemas, validate task capabilities, parse results, process partial success, archive files and support `<AAAAT_RESULT>` text fallbacks. fileciteturn31file0L2-L2

That is a substantial amount of protocol machinery whose primary purpose is compensating for AAAAT's refusal to call an inference endpoint itself.

The same complexity appears in the agent boundary. `agent_access.py` maintains task-capability tokens, safe-context prefixes, forbidden fields, task-purpose mappings, output contracts, task instructions, hand-authored response formats, payload limits and per-task allowable fields. fileciteturn30file0L2-L2 The database embeds `tasks`, `agent_task_capabilities`, provenance fields and AI-related state alongside candidature/profile data. fileciteturn25file0L2-L2

This is not inherently bad engineering. Much of it is defensive and privacy-conscious.

The problem is **return on complexity**.

AAAAT has effectively built an agent interchange subsystem before building a simple `generate()` call that an ordinary user can activate by pressing “Extract job details.”

That inversion also helps explain why model behavior feels unpredictable. In the current architecture, AAAAT does not control the actual model invocation. The external host owns model selection, model settings, credentials, context construction beyond the supplied packet, networking, reasoning behavior and execution. fileciteturn10file0L2-L2 AAAAT then depends on that host/model combination understanding a sizeable instruction packet and returning data in the required envelope.

A smaller local model therefore is not merely being asked:

> “Extract company, role, salary and technologies from this text.”

It is participating in a protocol.

That makes **agent/tool-following ability** an accidental prerequisite for basic product features.

Modern local runtimes already provide a much simpler interoperability layer. Ollama exposes a local HTTP API, an OpenAI-compatible interface and structured outputs using JSON Schema. citeturn8search12turn8search4turn8search0 LM Studio exposes local REST APIs plus OpenAI- and Anthropic-compatible endpoints, including OpenAI `Responses`, model listing and structured-output support. citeturn8search5turn8search1turn8search22 `llama.cpp` includes `llama-server`, a lightweight OpenAI-compatible local HTTP server. citeturn8search2

Those interfaces do not eliminate model differences, but they let **AAAAT own the interaction**, which is the missing piece.

The UI implementation has a different but related problem: too much state orchestration is handwritten.

`DesktopDashboardFrame` inherits from `UserViewMixin`, `DetailedViewMixin`, `SmartViewMixin` and `wx.Frame`, while also owning current view, selected candidature, keyword, search state, expanded cards, layout state, split positions, render-cache keys, change tokens and timers. fileciteturn12file0L2-L2 `SmartViewMixin` manually synchronizes notebook tabs, computes view-cache keys, decides whether views need refreshes, freezes/thaws windows, reloads SQLite projections, recreates widgets, lays out nested splitters, synchronizes searches and manually updates multiple surfaces. fileciteturn28file0L2-L2

The consequence is visible in code volume, although size itself is not the problem. The current tree contains, among other files, a roughly 29.7 KB `agent_access.py`, 27.6 KB `candidature_right_panel.py`, 22.4 KB `smart_view.py`, 18.2 KB `dashboard_projection.py`, 17.3 KB `file_exchange.py`, 17.4 KB `agent_actions.py` and 16.3 KB `tasks.py`. fileciteturn2file0L2-L2 The problem is that several of those modules simultaneously encode presentation, state transitions, protocol semantics or business behavior.

There is also a particularly revealing refresh mechanism. The desktop periodically asks `DesktopCommandService.change_token()` whether aggregated database state has changed, driven by a `wx.Timer` firing every 1.5 seconds. fileciteturn12file0L2-L2 fileciteturn15file0L2-L2 This exists largely because multiple parts of the system can mutate the same SQLite workspace outside the UI's normal state flow. In a restarted application where one application layer owns mutations and emits change events, polling the whole product state should not be necessary.

The current Detailed View additionally maintains a global `FIELD_ACTIONS` registry mapping approximately every candidature field to specialized AI task names such as inference, fit assessment, research, CV generation and recruiter preparation. fileciteturn29file0L2-L2 That suggests the UX is being projected from the AI task system rather than allowing the application to expose a small number of understandable user intentions.

The protocol maintenance burden is already becoming concrete. AAAAT's hand-built MCP server hard-codes protocol revision `2025-06-18`. fileciteturn18file0L2-L2 As of August 31, 2026, the current MCP specification is `2026-07-28`, and official TypeScript SDK v2 implements that current revision. citeturn7search16turn7search24 The protocol has materially evolved, including transport and state semantics. citeturn7search7turn7search10

That is exactly the kind of standard an application **should not hand-implement** unless implementing MCP itself is its product.

AAAAT nevertheless maintains its own JSON-RPC responses, protocol initialization, tool discovery, verification ordering and stdio dispatch in `host_bridge.py`. fileciteturn17file0L2-L2 The current MCP project explicitly publishes official SDKs for building servers and clients, making this custom protocol ownership increasingly difficult to justify. citeturn7search13

There is even direct evidence that this state machinery caused release-level failures. The final v1 PR describes a real Codex/local-host run where a profile task could be marked completed before validation rejected the structured value, so the retry found the work already consumed. fileciteturn21file0L2-L2 That is not evidence that task state machines are always bad. It is evidence that AAAAT has accepted state-machine complexity **before proving that this task/external-agent architecture should exist at all**.

Finally, the zero-dependency rule has created a false economy.

The package declares no normal runtime dependencies; wxPython is optional and PyInstaller is a release dependency. fileciteturn4file0L2-L2 The test suite explicitly enforces the empty dependency list. fileciteturn23file0L2-L2 Yet eliminating dependencies has not eliminated complexity. It has shifted complexity into custom UI management, custom protocol validation, custom MCP handling, custom exchange formats and custom state transitions.

**Dependency count is not a useful architectural objective. Maintained complexity is.**

A dependency is justified when it replaces a generic problem that is expensive and risky to maintain yourself. React component composition, a desktop runtime, schema validation, an official protocol SDK and a testing framework are good examples. A generic workflow engine, Kubernetes, a plugin marketplace, Redux, a full agent framework and three layers of repository abstractions would not automatically be justified.

That is the critical distinction the restart should make.

## What should survive the prototype

A clean restart should be aggressive about code and conservative about the product knowledge the prototype generated.

The strongest existing principle is **AI optionality**. The current README and development rules consistently say that local persistence and manual operation must work independently of an LLM. fileciteturn5file0L2-L2 fileciteturn26file0L2-L2 That principle directly supports the stated objective of serving nontechnical users as well as AI-heavy users.

It should survive unchanged.

The second strong principle is **local ownership**. AAAAT already uses a local SQLite workspace plus user-owned artifacts rather than making a cloud account the center of the product. fileciteturn5file0L2-L2 This remains a good fit for sensitive job-search information and offline operation. SQLite itself remains well suited to the requirement: it provides transactional relational storage without a separate database server, and foreign-key enforcement can be explicitly enabled rather than depending on SQLite defaults. citeturn11search2

The third thing worth preserving is **the visual/product experiment**, not the wx widget hierarchy. Your assessment that the UI looks good and captures the intention is consistent with the amount of product thinking visible in the repository: Smart View, detailed candidature editing, profile context, artifacts, structured keywords and local notes all have explicit product semantics. fileciteturn11file0L2-L2 The restart should use screenshots, sketches and user scenarios from the prototype as design inputs.

It should not recreate `DesktopDashboardFrame`.

There is a similar distinction in the data model.

Current tables identify useful concepts: candidature/application, raw source material, profile facts, career plans, generated artifacts, structured keywords and private variables. fileciteturn25file0L2-L2 Those concepts are worth reconsidering.

The current physical schema is not.

For example, AI execution details such as `tasks`, `agent_task_capabilities`, agent runtime/provider metadata and result blobs have become part of the same core database model as applications. fileciteturn25file0L2-L2 There is also both an `applications.notes` field and a separate `notes` table even though the release-readiness review explicitly corrected the product toward one candidature note rather than a collection. fileciteturn25file0L2-L2 fileciteturn32file0L2-L2

That is precisely why the restart should **derive a new schema from current product behavior instead of treating schema version 1 as a compatibility contract**.

A plausible first new data model is much smaller:

```text
candidatures
candidature_sources
profile_items
keywords
candidature_keywords
artifacts
activity
settings
ai_connections
```

`activity` would record meaningful manual and AI-assisted changes for provenance and undo. `ai_connections` would contain non-secret configuration such as provider type, endpoint and selected model. Credentials would not live as plaintext SQLite settings.

There should be **no generic `tasks` table initially**.

A task/job table becomes justified only when the product has actual long-running asynchronous work that needs to survive application restarts. A 3-second extraction or 20-second local generation does not, by itself, require a durable workflow engine. It requires a cancellable operation with progress.

The prototype's tests should receive the same treatment.

The current CI does real useful work: it builds and installs the wheel, checks entry points, compiles sources, validates the MCP descriptor, runs the Python behavioral suite across Python 3.11–3.13, and verifies packages on Windows, macOS and Linux. fileciteturn22file0L2-L2 The latest main/release workflows associated with v1 completed successfully. fileciteturn27file0L2-L2

That evidence should be preserved as part of the project's history.

But many current tests specify the old transport and architecture—host connection, file exchange, task transports, paired tool catalogues, MCP runtime, preparation queues and dependency policy—because those were treated as requirements. The source tree makes that concentration visible. fileciteturn2file0L2-L2

They should not be automatically ported.

A restart test earns its existence by protecting a current user behavior, data invariant, security boundary or protocol standard.

The public repository itself should absolutely survive. In fact, a visible restart can produce **better engineering evidence than silently repairing the prototype**. Preserve the current commit as something like `v1-prototype` and write a short architectural decision record explaining why v2 restarts. The old source then demonstrates experimentation and the new source demonstrates the ability to recognize sunk-cost traps, collect evidence and redesign.

That story is stronger than pretending the first architecture was always correct.

## Recommended restart architecture

The strongest default for AAAAT v2 is:

**Electron + React + TypeScript + Vite + SQLite, with a deliberately narrow Electron preload boundary.**

This is not because it is fashionable. It solves several concrete problems AAAAT actually has.

Electron provides a cross-platform desktop runtime built around Chromium and Node.js, letting one JavaScript/TypeScript codebase target Windows, macOS and Linux. citeturn13search3 Electron Forge provides first-party Vite + TypeScript project templates and packaging infrastructure. citeturn9search0turn9search16 React provides the component model missing from the current highly imperative widget construction: its fundamental model is composing UIs from independent components with state-driven rendering. citeturn9search6turn9search38

The architecture should be simple enough to draw accurately in a few lines:

```text
┌──────────────────────────────────────────────┐
│ React renderer                               │
│                                              │
│ applications · profile · artifacts · AI UI   │
└───────────────────┬──────────────────────────┘
                    │ narrow typed IPC
                    │
┌───────────────────▼──────────────────────────┐
│ Electron preload                             │
│ validated, intentionally tiny API            │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│ Electron main process                        │
│                                              │
│ application services                         │
│ SQLite · files · secrets · AI adapters       │
│ export/import · optional later MCP            │
└───────────────┬────────────────┬─────────────┘
                │                │
          local files       HTTPS / localhost
                                 │
               ┌─────────────────┴─────────────┐
               │ AI providers/runtimes         │
               │ Ollama · LM Studio ·          │
               │ llama.cpp · cloud providers   │
               └───────────────────────────────┘
```

The renderer should have **no direct filesystem, SQLite, shell, credential or arbitrary network authority**. Electron's security model is specifically designed around a privileged main process and restricted renderer; current Electron defaults to context isolation, and renderer sandboxing is enabled by default unless Node integration is turned on. citeturn7search2turn11search8 Electron's preload/context bridge is intended to expose narrowly selected privileged operations to the renderer. citeturn11search23

That boundary can become an excellent portfolio artifact because it demonstrates actual desktop security design rather than merely using React in a window.

For example, the renderer should see commands conceptually like:

```ts
interface AAAATDesktopApi {
  candidatures: {
    list(query?: string): Promise<CandidatureSummary[]>;
    get(id: string): Promise<Candidature>;
    save(input: SaveCandidatureInput): Promise<Candidature>;
    remove(id: string): Promise<void>;
  };

  profile: {
    get(): Promise<Profile>;
    save(input: SaveProfileInput): Promise<Profile>;
  };

  ai: {
    connections(): Promise<AIConnectionStatus[]>;
    models(connectionId: string): Promise<ModelInfo[]>;
    run(request: AIActionRequest): Promise<AIActionResult>;
    cancel(operationId: string): Promise<void>;
  };
}
```

It should **not** see:

```ts
executeSql(...)
runCommand(...)
readAnyFile(...)
callProvider(...)
```

All IPC input and output should be runtime-validated with a schema library such as Zod in addition to TypeScript's compile-time checks. Ollama itself recommends Zod or Pydantic schemas for structured output validation, illustrating the usefulness of sharing one schema definition between inference requests and application validation. citeturn8search0

The internal source tree should use feature-oriented vertical slices rather than recreating dozens of horizontal abstraction layers:

```text
src/
  main/
    app/
    database/
    ai/
    files/
    ipc/
    security/

  renderer/
    app/
    features/
      candidatures/
      profile/
      artifacts/
      ai/
      settings/
    components/

  shared/
    schemas/
    contracts/
```

Within `candidatures`, for example, it is perfectly acceptable to have explicit SQL, a small service function, schemas and UI components. AAAAT does not need a generic “entity repository framework.”

Likewise, a new application should **not immediately introduce Redux**. React's own guidance emphasizes structuring state carefully and avoiding duplicate/redundant state before reaching for more machinery. citeturn9search26 Current AAAAT's problem is not absence of a global state library; it is duplicate manually synchronized state spread through frame/mixin/view structures.

A much simpler renderer model is possible:

```text
database/application state
        ↓
query result
        ↓
React component tree
        ↓
user command
        ↓
main-process application service
        ↓
transaction
        ↓
data-changed event / refreshed query
```

That removes most of the hand-built render caches and the current 1.5-second database polling mechanism. The current polling behavior is visible in `main_window.py` and `services.py`. fileciteturn12file0L2-L2 fileciteturn15file0L2-L2

The UI information architecture should also be reconsidered rather than blindly reproducing Smart View and Detailed View as separate technical modes.

A cleaner product could have:

**Home** → current applications and meaningful upcoming information.

**Applications** → table/cards with search/filter.

**Application workspace** → one candidature, its editable information, notes, materials and contextual AI actions.

**Profile** → reusable user facts and career context.

**Settings** → privacy, backups, appearance, AI connections and advanced integrations.

A table view and a recruiter-call-oriented “focus” view can still exist. They should be **different presentations of the same feature state**, not separate implementation worlds that have to synchronize selections, searches, splitters and render caches.

The database should remain SQLite, but the new project should use **versioned migrations from its first commit** and explicitly enable the database constraints it depends on. SQLite recommends applications explicitly control foreign-key enforcement rather than rely on defaults. citeturn11search2

I would not select a large ORM merely for résumé value. AAAAT's schema is small enough that explicit SQL plus typed/runtime-validated repository boundaries can remain clearer. A TypeScript SQLite binding should be selected by an actual cross-platform Electron packaging test before committing to it; native-module packaging is a real desktop concern and should be proved early rather than assumed.

Secrets should be outside ordinary application records. Electron's `safeStorage` API uses operating-system-provided cryptographic systems to add protection to locally stored strings. citeturn11search0 That makes it an appropriate primitive for provider credentials, subject to each platform's documented security properties.

That produces a much clearer definition of “local-first”:

**AAAAT owns the data. The user owns the machine. AI calls leave the machine only when the user deliberately selects a remote provider.**

## AI compatibility should become a product feature

The most important architectural shift is to redefine provider neutrality.

Current AAAAT effectively defines neutrality as:

> “AAAAT does not know which provider or model exists.”

The restart should define it as:

> **“AAAAT's domain does not depend on any particular provider or model, while the application can connect directly to many of them.”**

That is a much stronger form of neutrality because it protects the product without outsourcing the integration experience to the user.

The application-facing interface can remain very small:

```ts
interface ModelProvider {
  health(): Promise<ProviderHealth>;
  listModels(): Promise<ModelInfo[]>;

  generateText(request: TextRequest): Promise<TextResult>;

  generateObject<T>(
    request: ObjectRequest<T>
  ): Promise<StructuredResult<T>>;

  streamText?(
    request: TextRequest,
    events: StreamEvents
  ): Promise<void>;
}
```

Provider-specific differences stay below this boundary.

AAAAT should initially implement four user-facing connection classes:

| Connection | Purpose |
|---|---|
| **No AI** | Complete application with all manual features |
| **Local AI** | Ollama / LM Studio presets and custom localhost endpoint |
| **OpenAI-compatible** | Generic local or hosted compatible endpoint |
| **Cloud provider** | Native adapter where compatibility APIs are insufficient |

The first two are the critical ones.

Ollama serves its local API at `localhost:11434` by default and offers OpenAI-compatible endpoints. citeturn8search12turn8search4 LM Studio commonly exposes its compatible server on port `1234`, allows ordinary OpenAI clients to work by changing the base URL, and supports both OpenAI- and Anthropic-compatible interfaces. citeturn8search1turn8search5 `llama.cpp` exposes an OpenAI-compatible HTTP server as well. citeturn8search2

That gives AAAAT an unusually broad local compatibility base without creating a “connector marketplace.”

The simple UI can therefore say:

```text
AI assistance

○ Off
● Ollama                         Connected
  qwen3:8b                      ▼

○ LM Studio                     Not running
○ Other compatible server…
○ Cloud provider…
```

A first-time user should not see `MCP`, `stdio`, `capability`, `task_claim`, `media_type`, JSON envelopes or result files.

A local user should be able to:

1. install or start Ollama/LM Studio;
2. open AAAAT;
3. select the detected runtime/model;
4. press an AI action.

That is the entire expected interaction.

AAAAT itself then owns prompting, context selection, request construction, cancellation, schema validation, retries and error messages.

That ownership is crucial for making local models useful.

Consider “Import this job offer.” Instead of exposing twenty field-level AI tasks, the application can construct one bounded extraction request:

```text
Source:
<job posting>

Return:
{
  company,
  role,
  location,
  remoteMode,
  salary,
  description,
  technologies,
  keywords
}
```

Where supported, the provider receives the actual JSON Schema. Ollama supports JSON-Schema-constrained structured outputs through both its native and OpenAI-compatible APIs. citeturn8search0 LM Studio exposes structured-output functionality through its compatibility APIs as well. citeturn8search22

After generation, AAAAT validates the object itself.

A model returning malformed or incomplete data should not produce a mysterious “connector failed” state. The application can classify the failure:

```text
Could not reach Ollama.
Start Ollama and try again.

Model "qwen3:8b" is no longer available.
Choose another model.

The model returned an invalid job description.
Your application was not modified.

The request exceeded this model's context limit.
Try importing less source text.
```

Those are product errors.

They are not protocol errors.

Model capabilities should also be explicit rather than assumed. A model/provider record can expose:

```ts
type ModelCapabilities = {
  streaming: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
  vision: boolean;
  contextWindow?: number;
};
```

A feature then requests only what it really needs.

“Draft a recruiter email” requires text generation.

“Extract offer fields” benefits from structured output.

“Read a screenshot of an application form” requires vision.

A weak local model should not be rejected because it cannot participate in tool calling if the requested operation does not need tools.

That is another important difference from agent-first architecture.

**Do not introduce LangChain, LlamaIndex or another agent framework into the restart.** AAAAT currently needs controlled inference calls, not a generalized autonomous-agent runtime. Adding an orchestration framework would risk recreating the abstraction problem from a different ecosystem.

Vercel's AI SDK is a more plausible optional dependency because it provides provider abstractions and a dedicated OpenAI-compatible package; its documentation explicitly demonstrates LM Studio through `@ai-sdk/openai-compatible`. citeturn12search1 It also supports first-party and compatible provider packages behind a common model interface. citeturn12search3

But it should not automatically become AAAAT's architecture.

A sensible decision criterion is:

**Adopt it only if a provider-compatibility spike proves that it materially reduces streaming, structured-output and error-normalization code across the providers AAAAT actually intends to support.**

And even then:

```text
AAAAT domain
    ↓
AAAAT ModelProvider interface
    ↓
AI SDK adapter
    ↓
provider
```

not:

```text
AAAAT domain
    ↓
Vercel AI SDK everywhere
```

In particular, AAAAT should not make Vercel's AI Gateway the default merely because the library supports it. The product's local/privacy goals favor direct connections.

The same reasoning applies to MCP.

**MCP should be removed from the initial critical path.**

It is useful for a different purpose: allowing an external AI/automation host to operate AAAAT. That can be excellent functionality and excellent engineering evidence. But it is not the correct mechanism for making AAAAT's own “Draft CV” button work.

After manual mode and direct AI are solid, AAAAT can expose an optional MCP server such as:

```text
aaaat-mcp
```

and implement a deliberately small tool set through the **official MCP SDK**, not a handwritten JSON-RPC implementation. The official MCP project now maintains SDKs specifically for this purpose and the current TypeScript SDK supports the current 2026-07-28 protocol line. citeturn7search13turn7search24

That yields a clean separation:

```text
Direct AI integration
    User asks AAAAT to use a model.
    AAAAT is the AI client.

MCP integration
    An external assistant asks AAAAT to perform operations.
    AAAAT is a tool/server.
```

The current prototype conflates those two directions.

The watched-folder protocol and tagged `<AAAAT_RESULT>` chat response should not return as normal UX. They can be replaced by ordinary **Export/Import JSON** if genuine offline interoperability is needed. A standard data export is understandable without pretending that manual file shuttling is an AI connector.

## Technology choices and engineering signal

For this project, technology selection should optimize three things simultaneously:

**product fit + maintainability + credible public engineering evidence.**

Current ecosystem data gives TypeScript a strong portfolio argument, but it should remain a secondary reason. GitHub's 2025 Octoverse found that TypeScript overtook Python and JavaScript in August 2025 to become the most-used language on GitHub; GitHub reiterated that result in its February 2026 analysis. citeturn7search0turn7search4 Python did not become irrelevant—it continued to grow strongly and remains prominent in AI, science and education. citeturn7search27

The conclusion is therefore not “replace Python because Python is obsolete.”

It is:

**AAAAT's hardest problems are UI state, desktop product engineering and integration boundaries, and TypeScript is particularly well aligned with those problems while also giving the repository strong current market visibility.**

The 2025 Stack Overflow Developer Survey—the latest published annual survey available in this research—also reports that Node.js developers show strong interest in React, Next.js and Vue.js, reinforcing React/Node as mainstream rather than niche technology choices. citeturn10view0

Against that background, the desktop options compare roughly as follows:

| Stack | Product fit | Complexity | Portfolio value | Critical assessment |
|---|---:|---:|---:|---|
| **Electron + React + TypeScript** | Excellent | Moderate | Excellent | **Recommended** |
| Tauri + React + TypeScript | Excellent | Moderate-high | High | Strong alternative |
| PySide/Python | Good | Moderate | Moderate | Better than wx, but less strategic |
| Browser/PWA | Moderate | Low initially | High | Local integration compromises |
| Keep wxPython | Low | High ongoing | Low/moderate | No reason to continue |

Electron is not free of criticism. It ships Chromium and Node rather than using the operating system's existing WebView, so distributions are larger and runtime memory is generally higher than a system-WebView approach. Electron's own architecture is explicitly Chromium/Node based. citeturn13search3

For AAAAT, however, there are concrete compensating advantages:

- predictable renderer behavior on all three desktop platforms;
- one TypeScript ecosystem across main/preload/renderer;
- excellent access to local HTTP, files and processes from the privileged main process;
- first-party packaging tooling through Forge;
- straightforward React/Vite development;
- a security model that can demonstrate real privilege separation. citeturn9search0turn11search23turn11search8

AAAAT is not a memory-constrained background daemon. Its dominant requirements are interactive desktop UI, local storage and model integration. Therefore Electron's footprint is a known cost rather than an automatic disqualifier.

Tauri deserves serious consideration, but **not because it is the fashionable “Electron killer.”**

Tauri v2 uses a system WebView with an application core built around Rust and allows web frontends to communicate with privileged functionality by message passing. citeturn8search3 Its capability system provides fine-grained permissions for individual windows and WebViews, which is attractive for security. citeturn8search11 It also explicitly targets small, fast cross-platform binaries. citeturn8search17

Those are real advantages.

Its cost for AAAAT is another technology and boundary: TypeScript/React on one side and a Rust/native core on the other, plus platform WebView differences. That can be justified if small binaries, Rust experience or particularly strong native capability isolation becomes a product requirement.

At the moment, it is harder to justify than Electron.

I would therefore use:

```text
Electron
React
TypeScript strict mode
Vite
SQLite
Zod
Vitest
Electron Forge
```

and introduce other tools only when requirements emerge.

Specifically, I would **not** add:

```text
Next.js              no server rendering requirement
Redux                no demonstrated global-state requirement
Turborepo/Nx         one desktop product, not a monorepo platform
Docker               not part of the user runtime
GraphQL               no client/server graph problem
LangChain             no generalized agent orchestration requirement
microservices         no distributed system requirement
Kubernetes            categorically irrelevant
generic plugin system no validated third-party extension requirement
```

That restraint is more convincing in an engineering portfolio than stacking fashionable names into `package.json`.

Vite is justified because it solves the actual frontend build/development problem, and Electron Forge maintains an official Vite + TypeScript template. citeturn9search0turn9search8 Vite intentionally separates transpilation from type checking and recommends running `tsc --noEmit` as an independent production/static-analysis check. citeturn9search7 That should become a mandatory CI gate.

Vitest is similarly justified rather than decorative because it directly reuses Vite's transform/configuration model and supports TypeScript/ESM out of the box. citeturn13search14

For end-to-end testing, the majority of renderer flows can be tested as an ordinary browser application against a mocked typed desktop API. That is one of the architectural advantages of keeping the React renderer clean. A much smaller packaged-desktop suite then tests preload/IPC/filesystem/integration behavior. Playwright does have Electron automation support, but its documentation still labels that support experimental, so I would not make every product test dependent on it. citeturn9search1

The security configuration itself should be checked in tests:

```text
contextIsolation = true
sandbox = true
nodeIntegration = false
no arbitrary ipcRenderer exposure
no unrestricted filesystem API in renderer
no API keys in renderer state
no remote HTML loaded into privileged windows
```

Electron explicitly recommends context isolation, and sandboxed renderers cannot directly perform privileged filesystem/process operations; those operations must be delegated through IPC. citeturn7search6turn11search8

This turns a frequently criticized part of Electron—its security risk when configured poorly—into demonstrable engineering evidence that the application understands and enforces the security boundary.

The current CI should also be conceptually upgraded. It currently gives good packaging and behavioral signals but does not show linting, static type checking, dependency/security analysis, coverage requirements or true user-level GUI journeys in the visible workflow. fileciteturn22file0L2-L2

A new pipeline should establish:

```text
format check
lint
TypeScript strict check
unit tests
schema/migration tests
renderer integration tests
AI provider contract tests with deterministic fixtures
packaged desktop smoke tests
Windows + macOS + Linux packaging
dependency/security scanning
release artifact verification
```

The important addition is not the number of badges.

It is that CI should answer:

> **“Can a user complete the important workflows?”**

rather than primarily:

> “Can our implementation contracts still execute?”

## Restart strategy and acceptance bar

The safest restart is a **new implementation on top of preserved repository history**, not incremental replacement of wx modules.

Tag the current state as the prototype and stop changing it except for severe archival/documentation issues. Do not build compatibility shims between `DesktopDashboardFrame` and React. Do not create Python-to-Node IPC merely to keep `agent_access.py`. Do not preserve the current `tasks` table because tests expect it. Do not translate Python classes one-for-one into TypeScript.

That would turn a restart into a disguised migration.

Instead, the repository history should tell an explicit engineering story:

```text
v1-prototype
    ↓
documented architecture review
    ↓
fresh v2 implementation
```

A small set of ADRs would be genuinely useful here, rather than ceremonial:

```text
Why AAAAT restarted instead of refactoring v1
Why direct AI replaced external-host-first inference
Why Electron was selected over Tauri and Python desktop UI
Why SQLite remains the source of truth
Why MCP is optional interoperability rather than AI runtime
Why dependencies are evaluated by maintained complexity, not count
```

These decisions are important enough to explain because they are exactly what a future interviewer or contributor will question.

Development should proceed by **capability gates**, not by attempting feature parity with v1.

| Gate | Required evidence before proceeding |
|---|---|
| **Manual foundation** | User can create, edit, search, archive and reopen candidatures; profile works; autosave/restart persistence works; no AI installed |
| **Product UI** | Core workflows are understandable without protocol concepts; current good visual ideas are reproduced with reusable components |
| **Local AI** | Ollama and LM Studio can be configured/detected, models listed, health tested, generation cancelled and errors explained; no copy/paste round trip |
| **Structured assistance** | Job extraction and at least one profile/application analysis pass typed schema validation across a tested local-model matrix |
| **Hosted compatibility** | At least one native cloud provider and generic OpenAI-compatible endpoints run through the same application-level AI contract |
| **Robustness** | AI being offline, malformed, slow or unavailable never blocks manual persistence |
| **External automation** | MCP is added using the current official SDK and is tested independently from direct inference |
| **Desktop release** | Signed/packaged behavior, backups, restore and critical workflows are verified on target operating systems |

The **first gate is deliberately AI-free**.

That prevents a repeat of the current architecture, where sophisticated assistance plumbing accumulated while basic product experience was still being evaluated.

The local-AI gate should test real differences between models. A compatibility matrix in the repository would be excellent public engineering evidence:

| Runtime | Model | Text | Structured extraction | Streaming | Result |
|---|---|---:|---:|---:|---|
| Ollama | representative small model | ✓ | tested | ✓ | … |
| Ollama | representative larger model | ✓ | tested | ✓ | … |
| LM Studio | representative GGUF | ✓ | tested | ✓ | … |
| llama.cpp | representative model | ✓ | tested | ✓ | … |
| custom OpenAI-compatible | fixture server | ✓ | ✓ | ✓ | deterministic CI |

This is much more meaningful than claiming “provider agnostic.”

It demonstrates it.

The AI acceptance test should resemble a user action:

```text
Given:
  AAAAT has a candidature containing a raw job posting.

When:
  the user presses "Extract details"
  using a configured local model.

Then:
  AAAAT sends only the required context,
  validates the result,
  updates the supported fields atomically,
  records that AI produced the update,
  allows the change to be undone,
  and never requires the user to copy JSON between applications.
```

That becomes the architectural north star.

The manual equivalent must remain valid:

```text
Given:
  no AI runtime exists.

When:
  the user creates and edits the same candidature manually.

Then:
  every core workflow still works.
```

The external-assistant equivalent comes later:

```text
Given:
  an MCP-compatible assistant is configured.

When:
  the assistant invokes an allowed AAAAT tool.

Then:
  it uses the official protocol implementation,
  receives only the permitted context,
  and the resulting mutation goes through the same application service
  used by the desktop UI.
```

This final point is important.

The v2 application should have **one domain/application path for mutations**:

```text
React UI ─────┐
              │
MCP later ────┼──> application service ──> SQLite
              │
imports ──────┘
```

not separate UI, agent and file-exchange business logic that eventually converge on database tables.

That architecture would also eliminate the need for much of the current synchronization machinery.

The current prototype should therefore not be judged as wasted work. It has produced unusually valuable negative evidence:

- dependency minimalism can increase owned complexity;
- refusing direct provider integration does not create good provider neutrality;
- AI interoperability protocols are not substitutes for product UX;
- MCP is useful interoperability, but a poor primary inference mechanism;
- strict agent/task protocols make basic AI features unnecessarily demanding for local models;
- a visually successful desktop can still have an unmaintainable UI architecture;
- a green CI pipeline can validate the wrong contracts.

Those conclusions are supported both by the implementation and by the repository's own release-review history. fileciteturn23file0L2-L2 fileciteturn31file0L2-L2 fileciteturn32file0L2-L2

The resulting v2 proposition becomes much simpler:

> **AAAAT is a private local job-application workspace. It is complete without AI. When AI is available, AAAAT connects to it directly and makes useful actions one click away. The user may choose local or remote models. Advanced users and external assistants may later automate AAAAT through standards such as MCP, but those standards never leak into the ordinary user's workflow.**

That product still preserves the most defensible principle from the prototype—AAAAT is not an LLM wrapper. fileciteturn26file0L2-L2

But it stops interpreting that principle as “AAAAT must not talk to models.”

That is the architectural shift the evidence most strongly supports, and it is substantial enough that **a clean restart is more rational than attempting to save the current implementation**.