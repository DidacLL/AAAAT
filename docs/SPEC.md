# AAAAT technical architecture

This document derives technical architecture from [PRODUCT_DEFINITION.md](../PRODUCT_DEFINITION.md). It does not create product meaning. Current explicit Product Owner instruction and the Product Definition prevail over this SPEC, ADRs, Issues, tests and implementation.

Use [PRODUCT_CONTEXT.md](../PRODUCT_CONTEXT.md) only for rationale, [OWNER_DEVELOPMENT_PRINCIPLES.md](../OWNER_DEVELOPMENT_PRINCIPLES.md) for development style, and [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) plus live GitHub state for active execution.

## Architectural objective

AAAAT is an open-source, provider-agnostic agentic-human application-management/document tool implemented as one local desktop application.

It supports three interaction directions over the same domain model:

```text
Human → AAAAT
AAAAT → configured AI
external AI/tool → bounded AAAAT capability
```

These directions share local domain/application services. They do not justify three separate products or a generic agent platform.

## Baseline

```text
Electron + React + strict TypeScript
        ↓
typed sandboxed preload boundary
        ↓
application services
        ↓
SQLite workspace + user-owned files
```

The renderer remains sandboxed, context-isolated and unprivileged. Node integration and webviews stay off unless a concrete future requirement proves otherwise.

Durable mutations use normal application services whether input originated from the UI, an import, configured AI or an external integration.

Keep runtime dependencies small. Do not add an ORM, event bus, plugin framework, workflow engine, generic repository, policy system or state-management framework without demonstrated current value.

Before a real-use compatibility baseline exists, correct wrong development schemas/contracts directly rather than preserving them through migration ceremony.

## Domain boundaries

Keep meaningful product objects explicit:

- candidatures/applications;
- candidature Sources;
- shared Tags;
- reusable professional information and item variations;
- CV templates;
- Working CVs;
- Rendered CVs;
- cover letters;
- Application packets;
- optional AI connections/configuration;
- bounded setup/recovery configuration.

Do not collapse these into generic records/CRUD.

### Candidature information

The candidature root is sparse and structural. User-useful information belongs to the bounded flexible candidature-field/value model rather than fixed lifecycle columns.

Field definitions are user-maintainable. Shipped definitions are defaults, not semantic identity. Field labels/system keys do not gain hidden product meaning merely because code uses them.

Favourite/order/presentation choices are local presentation state. They do not duplicate candidature values or create a second domain model.

Sources remain first-class retained material and are never replaced by extraction.

Tags remain shared glossary/retrieval objects rather than per-candidature copies or an ontology engine.

## Desktop interaction architecture

Persisted domain objects do not dictate screen composition.

After a workspace is opened, Applications supports corpus retrieval, selected-application work, direct field entry and raw capture without imposing a lifecycle.

New application combines raw material and editable fields on one task surface. Capture can retain either or both. Optional AI fills requested untouched empty values through normal services; existing or newer manual edits retain precedence. Navigation preserves drafts rather than persisting them implicitly.

The fixed shell owns contextual main actions in the top bar and shared Tag meaning in the left monitor. Neither rail nor toolbar becomes a scrolling task feed. Content-driven cover typography is scoped to corpus cards; ordinary editing retains legible field labels, values and direct controls. Expanded cards displace neighbours and expose richer content at roughly twice their collapsed width and height.

Reusable professional information and document work are independently reachable. Document creation does not require a candidature or AI.

Ordinary UI must not expose internal IDs, schemas, protocol vocabulary or filesystem paths merely because the implementation has them.

## Document architecture

Document concepts remain explicit:

- **My information** — reusable professional content;
- **Profile variant** — alternate wording/emphasis for one reusable item;
- **CV template** — reusable ordered composition;
- **Working CV** — editable CV composition;
- **Rendered CV** — immutable generated output plus the content/composition snapshot used;
- **cover letter** — editable document, normally candidature-owned;
- **Application packet** — generated application output combining a selected Rendered CV and letter where useful.

Editing a Working CV does not implicitly rewrite reusable information/template state. Explicit save-back actions own those decisions.

New documents and editable copies begin as provisional drafts. Explicit Save or rendering retains them; ordinary navigation does not. Contextual names distinguish associated documents. Retained combined output keeps its immutable project even when editable contributor references become null after source removal; the current schema uses nullable references rather than preventing that removal.

### LaTeX boundary

The durable Product Owner technical decision is:

```text
typed Working CV / cover-letter state
→ TypeScript-generated data.tex
→ shared aaaat.sty LaTeX2e public API / expl3 internals
→ selected Blueprint presentation source
→ self-contained staged project
→ bounded asynchronous pdfTeX/pdfLaTeX execution
→ retained PDF + immutable project/snapshot
```

TypeScript owns document data encoding and `data.tex`; LaTeX owns presentation/layout.

The public package boundary is LaTeX2e with expl3 internals. pdfTeX through pdfLaTeX is the current engine boundary. The product does not require an alternate-engine matrix.

The current production implementation invokes `pdflatex` directly after PR #377. Earlier accepted implementation used `latexmk -pdf`. Invocation/wrapper choice is technical implementation, not Product Owner meaning, provided the real architecture remains bounded, asynchronous, noninteractive, timed out safely and produces the required portable artifact.

### Blueprints and shared package

A Blueprint is compatible presentation source, not CV/template ownership.

Product Owner correction preserved by PR #350 / Issue #351 establishes:

- advanced-user Blueprint files live in AAAAT application-level configuration under Electron `userData`;
- AAAAT ships an initial Blueprint and may ship more;
- Blueprint choice is explicit render-time input;
- Blueprint selection/default/last-used state is not persisted on CV Templates, Working CVs or cover letters merely for rendering;
- there is one shared AAAAT package/library rather than package-per-Blueprint ownership;
- one Blueprint contract covers CV and cover-letter presentation.

User ownership includes the exact editable Blueprint and package sources retained/exported with each generated project. That does not establish a separate persistent modified-package registry or historical PLAN completion gate.

Every retained/exported project contains the exact Blueprint and exact `aaaat.sty` source actually consumed, generated `data.tex`, entrypoint and build/PDF output using project-relative references.

Application-packet letter generation must use the presentation sources retained by its selected Rendered CV when exact presentation reproducibility requires that coupling; it must not silently rediscover different current presentation sources.

Renderer/preload contracts expose typed IDs/intentions, not arbitrary internal source paths. Advanced source ownership/configuration stays outside ordinary content editing; AAAAT is not an in-app LaTeX IDE.

### CV section roles and language

CV Template/Working CV composition may carry Blueprint-independent semantic section roles such as `main` / `secondary`. A Blueprint interprets those roles; TypeScript does not encode rail/column geometry.

Document language is document data. The current shipped implementation uses Babel through pdfLaTeX for its bounded supported Latin-script languages and fails unsupported values clearly. Fonts remain Blueprint-owned unless later Product Owner direction changes that boundary.

## Configured AI inside AAAAT

AAAAT owns local domain state, context construction, validation and mutations; it owns no inference model.

Use a bounded operation shape:

```text
user/domain intention
→ permitted local context
→ configured provider/runtime route
→ compact provider request
→ validated/partially salvageable result
→ user/domain acceptance semantics
→ normal application service
```

Keep provider-facing contracts simple enough for constrained/local models where practical. Validate deterministically inside AAAAT rather than relying on provider-specific structured-output features when not necessary.

AI output does not gain durable authority merely because a provider returned it. The relevant product interaction decides whether a proposal becomes retained candidature/professional/document state.

Existing-Tag references are deduplicated by identity, and exact normalized names/aliases resolve new proposals to the glossary. New shared Tag proposals stay editable until creation. This is deterministic identity handling, not semantic synonym recognition. In-flight results preserve newer manual field/Tag/document edits; useful late CV writing remains a separate draft.

Application document permission is enforced in main before provider calls and external reads. The local on-demand context preview uses the same projection as writing without granting external access. The current direct adapter supports optional protected Bearer credentials, loopback HTTP and remote HTTPS. Normal operations may use the general default without preliminary diagnostic calls; explicit per-operation defaults require recorded validation.

AI-use/disclosure preferences are stored product state where the product requires them. Do not infer permanent privacy meaning from mutable labels, kinds or system keys unless direct Product Owner authority explicitly defines that behavior.

## External AI/tool integration

External AI is a legitimate entrance to AAAAT.

Use meaningful bounded operations and carriers rather than exposing generic entities/CRUD:

```text
meaningful task
→ AAAAT-owned bounded context/capability
→ suitable carrier/host
→ useful external processing
→ bounded returned result/action
→ normal AAAAT mutation
```

Carriers may include MCP, commands, APIs, skills/plugins, browser/desktop automation, files, clipboard or other demonstrated mechanisms. The carrier does not create product meaning.

Application-scoped external AI work uses one fully editable request containing its instructions and application context. Opening the editor prepares local material and does not enable external access. Copy and Export use the exact visible request, without rebuilding or appending hidden context. Connected access is an explicit choice for future reads of that request through AAAAT's connection; turning it off cannot recall material already read or copied. Local request edits remain available when the editor closes or ordinary navigation changes.

Interview requests remain secondary and application-linked. Their content is user-editable throughout; AAAAT does not own or endorse advice from an external model. Saving a returned text is an explicit normal Source mutation on that application. Connected results carry the prepared request reference so a late result cannot be retained on a different selected application.

An internal selected-object state used by a particular carrier is not automatically a product defect and is not automatically product authority. Judge it by whether it preserves the user-visible task context, privacy, local ownership and bounded mutation authority. Transport-only state should remain internal and narrow rather than becoming a required workflow.

External integrations do not gain generic corpus browsing, arbitrary durable IDs as mutation handles, database queries, filesystem access or shell/process authority from AAAAT. A host's separate OS/screen/filesystem authority is the user's external trust decision.

## Setup, recovery and configuration

First run establishes a usable local workspace. TeX, AI and external-host integration are configured when relevant rather than blocking basic application/document use.

Setup is product infrastructure. Ordinary UI describes practical outcomes rather than MCP/IPC/port/schema internals.

The same underlying setup knowledge may support normal UI and optional AI-assisted configuration; do not build a general installer/orchestration platform before a concrete need exists.

Native packaging produces per-user Windows Inno Setup EXEs, macOS DMGs and Linux DEBs, alongside portable ZIPs. Optional tools are installed through a single typed main-process intention with two fixed choices: local Granite and PDF generation. Installer inputs cannot supply commands, download URLs or installation paths. The separate user-owned Startup settings intentionally accept an editable local shell script, run when the desktop app starts; they are not exposed through MCP or AI operations. Fixed upstream archives and the tested IBM GGUF revision are verified by their pinned cryptographic digest before use. Existing TeX installations and named AI connections are preserved.

The installed llama.cpp CPU runtime binds only loopback. Its default script runs when the desktop app starts, using the installed executable and model paths. Advanced users can edit the PowerShell or POSIX shell script, disable startup or restore that default. Changes apply on the next launch. AAAAT stops its attached startup process tree/group on quit; it does not stop independently launched servers. Ordinary AI permission/context checks still precede provider invocation. Model files and runtime live in local application data, separately from portable workspaces. A workspace receives this connection only once and only when it has no existing connections; explicit deletion does not resurrect it.

PDF setup selects MiKTeX on Windows and x64 macOS/Linux, BasicTeX on Apple Silicon, and distribution TeX Live on Linux ARM64. OS authorization is used where necessary. Downloads can be canceled; native package installation is allowed to complete rather than being killed mid-write. Rendering and readiness probes resolve the same installed executable, without requiring users to edit PATH. This setup is not exposed as arbitrary external-agent process authority.

Workspace backup/recovery and portable AI/integration configuration are distinct boundaries. Keep secrets/local-machine concerns separate from user-owned workspace data where required.

## Local ownership and privileged operations

Main process owns privileged filesystem/process/dialog actions. Renderer asks through typed intentions.

Generated source/output remains user-owned and exportable. Export copies retained artifacts/projects without mutating the managed original.

Staged rendering records durable artifacts only after successful generation. Failures leave editable local state intact and do not install half-complete retained projects.

## Verification

The current product-shaping phase uses typecheck/lint for required static hygiene and code review plus the real running/rendered product for product evidence. Do not add, rewrite or expand tests, repair stale selectors, or change product behavior to satisfy historical tests without explicit owner authorization. Existing automated tooling is subordinate incidental evidence, not a design or merge-acceptance authority.

Evidence is scoped to the premise actually exercised:

- unit/integration tests do not prove a real third-party AI host;
- mocked compatible HTTP does not prove useful constrained-model behavior;
- AAAAT's own MCP client does not substitute for an external-host journey;
- real pdfLaTeX proves rendering/portability mechanics, not the full product/document-ownership design;
- component tests do not alone prove coherent desktop UX.

Reuse strong evidence until a later change materially changes the premise it demonstrated.

## Architecture discipline

Prefer the smallest coherent solution that advances the product.

Do not add heavy dependencies, generic frameworks, registries, policy layers, workflow engines, migration programmes or provider abstractions without demonstrated need.

When implementation and product authority conflict, correct the implementation/derived documentation rather than redefining the product to fit sunk code.
