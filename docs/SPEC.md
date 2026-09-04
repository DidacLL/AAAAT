# AAAAT v2 Specification

## Status and authority

This specification derives product architecture from `docs/OWNER_INTENT.md`.

For product meaning, authority is:

```text
current direct Product Owner instruction
→ docs/OWNER_INTENT.md
→ docs/SPEC.md
→ CURRENT_MISSION / GitHub Issue
→ tests
→ implementation
```

Within already-established product meaning, accepted ADRs refine technical architecture. An ADR, Mission, Issue, test, migration, or existing implementation does not make its own product assumptions authoritative merely because it was accepted or merged.

Historical AAAAT v1 material is product-research evidence only. It does not define v2 implementation contracts.

## Product definition

AAAAT is a private, local career/application information workspace and application-artifact generator whose purpose is convenience.

It helps users capture information with little effort, structure it when useful, edit it, retrieve it quickly, reuse it across candidatures and documents, and generate application material while retaining local control.

AAAAT is useful with sparse or detailed records. It is not defined by disciplined application tracking, a fixed job-search sequence, or continuous maintenance.

VCVGenerator is independently core. AAAAT must remain useful when the user opens it only to create, edit, tailor, or render documents, without a candidature and without AI.

AAAAT is fully human-operable without AI. This is a capability guarantee, not a preferred input path.

## Clean-restart rule

AAAAT v2 preserves validated product lessons from AAAAT v1 and AgenticCareerBoost while rejecting their implementation contracts.

There is no requirement to retain or migrate:

- Python or wxPython implementation;
- the v1 SQLite schema;
- Smart/Detailed or `userView` widget architecture;
- v1 task/capability queues or workflow state machines;
- handwritten MCP/JSON-RPC;
- watched-folder or tagged-chat protocols;
- browser/FastAPI architecture;
- external-host-first inference;
- mandatory lifecycle logic.

Useful v1 lessons such as raw-first capture, sparse candidatures, configurable Focus, common information controls, concepts, lightweight ToDos, and local ownership may be reimplemented deliberately through the v2 architecture.

## Ways information enters AAAAT

Manual entry, raw/pasted/imported material, AAAAT-assisted AI, and bounded external AI are alternative producers of the same user-owned information.

They may be mixed in any order. A retained value does not become a separate data class because AI or a person produced it.

All durable mutations ultimately use the same normal application-service rules.

A user must never be blocked from editing information merely because an AI operation can produce it. AI-created information remains editable. A manually entered value may later be used by AI. Valid AI results may populate ordinary authoritative data when the operation policy allows it, but invalid or conflicting output never silently overwrites authoritative edits.

No universal approval queue or mandatory AI proposal workflow is required.

## Human interaction surface

Human-operable product capabilities are available through a coherent graphical desktop interface. Ordinary users must not need JSON, shell commands, protocol knowledge, repository access, or intermediate exchange files for normal use.

Technical command/MCP/integration surfaces exist for bounded external tooling and setup; they are not a substitute for normal human product access.

Incomplete information is normal. The UI uses progressive disclosure and focused retrieval rather than forcing a wall of empty fields.

## Sparse and raw-first use

A candidature is a sparse container for one opportunity and its useful information, sources, concepts, ToDos, documents, and artifacts. It is not fundamentally a process state machine.

A candidature may begin with:

- a complete or partial job advertisement;
- only a URL;
- a recruiter message;
- one manually entered value;
- an application form or conversation-derived note;
- an external-AI contribution;
- a fully structured manual record.

Company, role, status, priority, and next action are not validity requirements.

Missing optional information is not product debt. AAAAT does not require record completeness, present sparse candidatures as defective, or use a completeness score/percentage as the governing interaction model.

This does not require empty information to be hidden, prohibit showing empty/addable information, or prohibit an optional user-requested overview. Each view still balances understanding, discoverability, useful populated information, available space, and clutter.

Original source material is first-class and remains retainable independently from structured information extracted or entered from it. Multiple meaningful sources may coexist. Extraction or enrichment never replaces the source.

Views decide how missing information is presented. The domain reports what information exists; no global rule requires every empty field to be either shown or hidden.

Candidature labels should use useful available or configured information. Company and role are sensible defaults when present, not universal identity requirements.

## Flexible semantic information

AAAAT understands meaningful information without turning that vocabulary into a mandatory checklist or workflow. Useful built-in or user-defined information may include:

- company, role, location, work arrangement, compensation, and dates;
- description and requirements;
- company/role research with useful provenance;
- strengths/evidence, gaps/risks/concerns, questions, and pitch;
- technical stack, keywords, and shared concepts;
- notes and reminders;
- application-form questions and answers;
- other useful information not anticipated by the initial built-in catalogue.

The product generalizes repeated information behavior while retaining real semantic/domain meaning.

## Domain and information architecture

AAAAT keeps real domain concepts explicit. Current or intended explicit concepts include:

- candidature;
- source;
- concept/keyword;
- ToDo;
- canonical professional profile and profile variant;
- document and artifact;
- AI connection.

Every normal user-facing field/value participates in the reusable common user-information capability contract. System/internal values such as IDs, hashes, migration metadata, and similar implementation metadata are excluded.

The common contract represents enough semantic information for the field/value and provides the same cross-cutting behavior rather than hard-coding unrelated UI/privacy/Focus mechanisms for each semantic field. For every normal user-facing field/value:

- the user can inspect and edit it;
- the user can create/set it when the domain permits the value to be absent;
- it can be cleared or removed where its domain semantics allow deletion;
- its AI-context exposure is user-controllable;
- it is eligible to be shown or hidden in Focus;
- when shown in Focus, its order and relative prominence/space are configurable.

AI generation or transformation is a separate capability and is offered only when a suitable configured AI capability exists for that operation.

These capabilities are independent: AI visibility does not control Focus visibility; Focus visibility does not control storage; AI-produced information remains manually editable.

Structural domain entities such as candidatures, documents/artifacts, sources, concepts, ToDos, profiles/variants, and AI connections remain explicit domain concepts. This common field/value contract does not convert them into generic fields or generic CRUD entities.

The exact TypeScript types and persistence representation are implementation decisions.

This requirement does **not** imply rewriting the database as generic EAV storage. Existing explicit v2 fields may initially adapt to the common capability contract. Generic/custom persistence is introduced only where flexible user-defined information actually requires it, and wider persistence unification needs demonstrated duplication plus normal Class C review.

Generalize repeated real behavior while preserving domain meaning. Do not create a generic content, workflow, plugin, or arbitrary CRUD framework.

## ToDos

A ToDo is an explicit lightweight domain entity containing user text/body, a done/not-done state, and an optional candidature relation.

By default it implies no scheduling, recurrence, predicted next action, AI task, workflow step, or workflow engine.

Additional optional ToDo behavior requires separate product trace and demonstrated need.

## Status, lifecycle, priority, and next action

Status, lifecycle labels, priority, and next action may exist as optional information when useful. They are not defining AAAAT concepts and must not drive core architecture or acceptance.

AAAAT remains useful when the user never maintains them. A default or existing field does not establish universal importance.

Archiving may remain independent from any optional lifecycle representation.

## Focus

Focus is a core projection for fast identification and retrieval, especially during unexpected recruiter or interview calls.

Focus is derived from authoritative candidature information and user presentation configuration; it is not a second candidature model.

Every normal user-facing field/value is eligible to participate in Focus. The user can show or hide it and, when shown, configure its order and relative prominence or allocated space.

Structural domain entities such as documents, sources, concepts, and ToDos may also participate through domain-appropriate Focus presentation without becoming generic fields.

Composition is responsive rather than arbitrary pixel-position dashboard editing.

No field is inherently Focus-required. Facts, concepts, notes, questions, research, reminders, compensation, links, documents, ToDos, pitch, or user-defined information may participate when useful. Shipped defaults are starting presentation choices, not product hierarchy.

Focus is not a fixed recruiter script, checklist, preparation sequence, or mandatory next-action area.

## Full candidature access

AAAAT provides a complete but progressively disclosed way to browse/search candidatures, inspect stored information, add/edit/clear information, manage sources, concepts, ToDos, documents/artifacts, AI privacy, and Focus configuration.

A candidature may retain or associate the actual application material used for that opportunity, including relevant CVs, cover letters, and other submitted or generated artifacts. These associations are useful historical information independent from lifecycle/status tracking and do not require a formal application-state workflow.

The renderer should avoid both a giant static field sheet and over-hiding useful structure.

A specific screen decomposition is not a product invariant.

## Shared concepts and keywords

Concepts are reusable bounded knowledge associated with one or more candidatures. A concept may contain a canonical term, aliases/admitted forms, a definition, and user notes.

Concepts participate naturally in search, retrieval, and Focus. Information learned in one candidature may improve a shared concept used elsewhere.

This is not a generic knowledge-management platform.

## Canonical professional information

One canonical professional profile owns authoritative professional evidence. Profile items are independently identifiable and typed, such as identity, contact, summary, experience, education, project, skill, certification, language, link, and justified custom data.

Named profile variants represent differences in focus, visibility, ordering, language, and content rather than cloned identities. Variants store only differences from canonical information.

Document-specific differences may further specialize a variant without mutating either canonical profile or the selected variant.

Reusable professional information may also include user-stated objectives, preferences, constraints, targets, markets/locations, writing preferences, or other useful context. Current v2 career-context storage is one implementation boundary for some of this information; its present fixed catalogue is not the complete future product vocabulary.

## VCVGenerator

VCVGenerator is a primary AAAAT capability and supports:

- CV creation and editing;
- cover-letter creation and editing;
- combined CV + cover-letter output;
- reusable professional information;
- profile variants;
- document-specific differences and overrides;
- editable content before rendering;
- multilingual document content;
- local rendering;
- portable user-owned LaTeX;
- clear access to source and generated artifacts.

VCVGenerator remains usable without AI and without a candidature.

### Document production

The normal managed-document path is:

```text
canonical professional data
→ named profile variant
→ document-specific rules
→ editable document model
→ portable LaTeX project
→ standard TeX engine
→ local artifact
```

AI may assist with content selection, transformation, tailoring, or drafting, but managed document rendering remains deterministic and user-editable. AI does not generate arbitrary executable TeX projects by default.

Managed documents detect direct source edits before regeneration. Users may preserve manual TeX edits through explicit manual mode; AAAAT never silently overwrites them.

### LaTeX portability

Generated LaTeX belongs to the user. A generated project must:

- include required non-standard project sources within its own directory;
- avoid absolute paths into AAAAT, the developer repository, temporary directories, or the workspace;
- compile from its source directory with ordinary compatible tools;
- remain editable and compilable after AAAAT is removed;
- be portable to another directory, Git repository, TeX IDE, removable device, or Overleaf-style import.

Document programming uses standard LaTeX plus `expl3`. Lua is not the document implementation language.

pdfLaTeX is the compatibility baseline. LuaLaTeX and XeLaTeX are supported capability extensions. Ordinary Latin-script built-in templates should support all three engines. A template may declare a narrower set only when a real capability such as OpenType fonts or complex-script shaping requires it.

Engine-specific logic begins inside the common package and is split only when substantial real code justifies separate files.

The current template architecture uses a small set of data/resource templates plus the reusable `aaaat.sty` package. It does not require a template marketplace, executable JavaScript plugins, or a custom document class without demonstrated need.

`latexmk` is a convenience, not a proprietary compiler.

## Technology baseline

The accepted v2 baseline remains:

| Concern | Decision |
| --- | --- |
| Desktop | Electron |
| Renderer | React |
| Language | TypeScript strict mode |
| Build | Vite |
| Packaging | Electron Forge |
| Package manager | npm |
| Runtime schemas | Zod |
| Database | SQLite through Electron's embedded `node:sqlite` boundary |
| Unit/integration tests | Vitest + React Testing Library |
| Desktop smoke | Playwright Electron support where useful |
| Styling | ordinary CSS with explicit design tokens |
| LaTeX | standard LaTeX + `expl3` |
| Baseline TeX engine | pdfLaTeX |
| Alternate engines | LuaLaTeX + XeLaTeX where supported |
| Build helper | `latexmk` |
| MCP | official TypeScript SDK, never handwritten protocol framing |

Direct dependency versions remain pinned in `package.json` / `package-lock.json`; upgrades are isolated and verified. Dependencies are justified when they remove more maintained complexity than they introduce.

## Desktop privilege boundary

AAAAT uses the standard Electron process boundary:

```text
React renderer — unprivileged
        ↓ narrow typed preload
Electron main — privileged adapters and application services
        ↓
SQLite, files, TeX, AI connections, integrations, setup services
```

Every application window maintains:

```text
contextIsolation = true
sandbox = true
nodeIntegration = false
webviewTag = false
```

The renderer has no direct authority over SQLite, filesystem access, process execution, credentials, Electron main APIs, or arbitrary privileged networking.

The main process restricts navigation, new windows, permissions, and remote content. Production content uses a restrictive CSP. Privileged IPC validates sender, input, and output.

The preload exposes fixed bounded domain intentions, not `ipcRenderer`, generic invoke/events, arbitrary fetch, SQL, filesystem, path, shell, or process primitives.

## Application services and durable mutations

Durable product mutations pass through explicit application services:

```text
validate input
→ load current state
→ enforce domain/conflict rules
→ transaction or safe staged operation
→ mutate
→ record meaningful activity/provenance when required
→ commit
→ return validated result
```

React components, model providers, integration adapters, setup recipes, and the LaTeX renderer do not write application tables directly.

Manual UI, direct AI, imports, and bounded external AI converge on these same rules. There is no AI-owned copy of normal product data.

## SQLite and migrations

SQLite is the authoritative workspace database. SQL remains explicit and auditable; no ORM is required.

Database startup configures at least:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

Tables use `STRICT` where practical.

Schema evolution uses immutable numbered SQL migrations. Applied migrations record version, name, cryptographic hash, and application time. A merged migration is never edited; a correction uses a later migration. Hash mismatch fails closed.

There is no v1 database migration obligation.

`node:sqlite` remains behind a small main-process adapter because its API stability and Electron packaging behavior are executable compatibility concerns. Synchronous access is acceptable for bounded local operations until measured evidence demonstrates the need for another process boundary.

A persistence generalization requires demonstrated need; product flexibility alone does not authorize an EAV rewrite.

## AI architecture

AI is optional capability, never product authority.

The product remains provider-neutral at the domain/application level. AI contracts are operation-specific rather than a generic task/workflow framework.

Useful operation families may include:

- source extraction/enrichment;
- selected-field assistance or transformation;
- summarization;
- concept explanation/extraction;
- comparison;
- user-requested opinion or suggestions;
- genuine external research when a configured route can perform it;
- drafting/transformation;
- CV tailoring;
- cover-letter drafting;
- selected cross-candidature retrieval/analysis.

Each operation defines the minimum context, privacy requirements, capability requirements, typed output, and mutation/conflict policy it needs. Operations are capabilities, not stages in a required workflow.

If the selected/configured environment cannot reliably perform an operation, AAAAT does not pretend that operation is available.

No agent framework, workflow framework, durable general AI-task system, generic field-action registry, provider marketplace, or cloud gateway is implied.

## AI connections

AAAAT supports a small explicit collection of named AI connections. Multiple connections may coexist and may provide different capabilities.

The user may choose a connection for an operation; explicit local configuration may provide useful defaults. No provider is assumed to support every operation.

The existing single loopback OpenAI-compatible connection is accepted first-slice implementation evidence, not a product limit on future connections.

Provider-specific integration may be added when demonstrated, but this does not justify a provider marketplace or plugin platform.

## Privacy projection

Privacy projection occurs before information is sent to AI.

Normal user-facing information can independently control AI exposure and Focus presentation. Hiding data from AI does not hide it from Focus; hiding it from Focus does not delete it.

Depending on field and operation, a value may be:

- exposed;
- omitted;
- tokenized/replaced when appropriate.

Token mappings remain local. Real authoritative values remain local and may be restored at the final local step, including document rendering.

Remote disclosure must be understandable. Broad cross-candidature remote analysis can expose highly profilable career/application information and therefore requires proportionate privacy disclosure before sending.

Credentials are not plaintext application records. Where secure OS storage is available, Electron `safeStorage` is the expected primitive; the application must explain insecure fallback conditions instead of pretending all platforms offer identical protection.

AAAAT cannot guarantee application-level privacy from an external agent already granted unrestricted screen/filesystem/shell authority; setup must represent that limitation truthfully.

## Research

Current external research is distinct from ordinary model recall.

An operation labelled as research requires a genuinely research-capable route: user-supplied research, a configured connection with research capability, or a bounded external AI able to research.

Retained research becomes editable AAAAT information and preserves useful source/provenance information when available.

## Cross-candidature retrieval and analysis

Search/filter/retrieval across the local candidature corpus is a product capability.

Selected multi-candidature summarization, comparison, or filtering may use AI when explicitly requested and when an appropriate configured capability exists. Such operations must use bounded selected context and privacy rules rather than exposing the whole workspace by default.

AAAAT need not choose the user's life decision to provide useful comparison.

## External AI and integrations

External AI is a real entry path into AAAAT, not merely copy/paste.

Demonstrated bounded host mechanisms may include official MCP, one-shot commands, skills/tools/plugins, generated host integration material, or another appropriate integration.

Bounded capabilities may support workflows such as:

- create or enrich a candidature;
- read explicitly scoped candidature information;
- obtain privacy-projected professional information;
- find relevant existing documents/material;
- contribute information or concepts;
- create document material;
- request rendering.

External AI does not receive arbitrary database, filesystem, shell, process, network, repository, or generic entity-ID mutation authority merely for convenience.

Durable changes use the same application services as desktop/manual and direct-AI paths.

MCP uses the official SDK. A localhost service is not created without a concrete consumer and explicit authentication/security design. Host-specific integration material is validated and does not become a generic executable plugin runtime.

## Installation and configuration

Installation and configuration are product infrastructure.

One structured configuration/capability model should drive, where practical:

- graphical setup;
- `installer.ai`;
- `configuration.ai`;
- AI-assisted setup;
- provider/host-specific generated integration artifacts.

The structured model represents explicit local configuration such as:

- workspace configuration;
- LaTeX detection/guidance and VCVGenerator validation;
- one or more configured AI connections;
- validated available operations/capabilities;
- research capability;
- external host integration mechanisms;
- relevant user preferences/defaults;
- generated host artifacts;
- configuration import/export;
- backup/recovery.

Known working environments are detected and reused rather than replaced.

Configuration may propose useful field sets, Focus defaults, operation defaults, or host artifacts based on actual environment/preferences. Proposals become explicit editable local configuration; they do not silently mutate authoritative career/application data or hard-code all users into one catalogue.

A normal user should not need to understand JSON, MCP, ports, shell commands, or provider internals for ordinary setup/use.

The product remains coherent when no AI is configured.

## Workspace, artifacts, backup, and recovery

The user-selected local workspace is authoritative and owns its SQLite database, document projects, artifacts, templates/configuration, integrations, and exports as appropriate.

Backup uses a consistent SQLite backup plus relevant user-owned files and a manifest. Secrets are excluded by default. Restore validates manifest, schema, integrity, and paths before activation.

Configuration portability/import/export is a product requirement alongside data backup/recovery.

Generated LaTeX projects remain usable outside AAAAT and no mandatory cloud service is required.

AAAAT records meaningful activity/provenance where required. This is not event sourcing; SQLite remains authoritative current state.

## Renderer and UX

Renderer state stays close to its owner:

- application/domain state is queried through the typed desktop API;
- local UI state uses React state/hooks;
- small shared UI state may use React context when demonstrated.

AAAAT does not maintain a duplicate renderer copy of the complete database or add Redux without demonstrated need.

The UI uses progressive disclosure, responsive composition, and reusable information presentation. It must support sparse records without making them look erroneous and detailed records without becoming a giant static form.

Provider/protocol internals stay out of ordinary workflows unless the user is explicitly configuring them.

## Testing and executable evidence

Tests protect user behavior, domain invariants, security boundaries, data integrity, external contracts, and portable artifacts. They do not create product authority.

In particular, a deterministic fixture or acceptance sequence proves that one path works; it must not silently establish that path as the required user workflow when Owner Intent allows alternatives.

Evidence grows with capability and includes as applicable:

- domain/application-service tests outside Electron UI where practical;
- real SQLite migration tests;
- renderer tests through user-observable behavior;
- Electron security and preload allowlist checks;
- deterministic provider fixture tests when AI is involved;
- LaTeX compilation and unrelated-directory portability tests when VCVGenerator is involved;
- a deliberately small packaged-desktop smoke suite for critical boundaries;
- native Windows, macOS, and Linux packaging evidence.

Build success alone is not proof of runtime, visual, security, database, privacy, or portability claims.

## Capability checkpoint state

M0–M5 remain accepted technical/capability checkpoints and their implementation evidence remains valid where technically applicable. Their historical names or Issues do not complete, prohibit, or redefine Owner Intent.

- **M0 — Foundation:** secure Electron/React/TypeScript/SQLite startup, verification, and packaging.
- **M1 — VCVGenerator foundation:** canonical professional data, variants, editable documents, portable LaTeX, and local rendering.
- **M2 — Candidature workspace foundation:** sparse candidature storage, source/search/status/archive representation, concepts, initial Focus projection, and document associations.
- **M3 — AI assistance foundation:** initial direct configured provider, privacy projection, extraction/analysis/tailoring/drafting operation contracts.
- **M4 — External interoperability/setup foundation:** bounded command/MCP integration, demonstrated host setup, structured setup knowledge, backup/restore.
- **M5 — Release hardening:** cross-platform packaging, reliability, security, recovery, documentation, and compatibility evidence.

**M6 product acceptance is paused.** Its technically sound implementation remains in place, but its previous product contract included drifted assumptions. `.agentic/CURRENT_MISSION.md` records the current reconciliation classification.

No speculative M7–M11 sequence is authoritative. After product-authority recovery, exactly one next Mission is derived from Owner Intent + this SPEC + actual current implementation/evidence, then decomposed only after Product Owner activation.

## Prohibited speculative infrastructure

Do not create unused:

- provider/plugin marketplaces;
- generic plugin loaders;
- event buses;
- workflow schedulers/engines;
- generic repositories or arbitrary CRUD surfaces;
- background services/daemons;
- general AI-task databases;
- general REST/GraphQL APIs;
- cloud synchronization;
- v1 compatibility layers;
- future-Mission scaffolding;
- requirements/traceability databases;
- generic EAV persistence merely for architectural purity.

Reusable information capabilities required by Owner Intent are not prohibited merely because they are shared. The design must distinguish legitimate repeated product behavior from an unrelated generic framework.

Default abstraction heuristic remains:

```text
first demonstrated case → implement directly
repeated real behavior → extract the smallest reusable capability that the cases actually share
wider framework/generalization → require demonstrated need and normal decision review
```

Security/process boundaries and real interchangeable providers may justify earlier interfaces. Hypothetical future flexibility does not.

## Non-negotiable acceptance invariants

### Human operability

```text
No AI configured → AAAAT remains usable for its human-operable capabilities, including VCVGenerator.
```

### Producer convergence

```text
manual input / direct AI / bounded external AI → same user-owned information → same application-service rules.
```

### Sparse/raw validity

```text
raw source or very little structured information → candidature remains valid and retrievable.
```

### Configurable Focus

```text
normal user-facing field/value → Focus-eligible; if shown → user controls order + relative prominence.
```

### LaTeX independence

```text
export source → copy elsewhere → compile in a compatible TeX environment → AAAAT is not required.
```

### Data ownership

```text
no cloud account → local workspace remains authoritative.
```

### AI isolation

```text
invalid/conflicting AI result → authoritative data is not corrupted or silently overwritten.
```

### Privacy projection

```text
information excluded/tokenized for AI → real value is removed or replaced before invocation; Focus visibility is independent.
```

### Single mutation authority

```text
UI / direct AI / external integration / import → normal application-service rules.
```

### Renderer isolation

```text
React renderer → no unrestricted filesystem, database, process, credential, or Electron authority.
```

### No v1 implementation inheritance

```text
validated v1 product lesson may return; awkward v1 technical contract does not.
```

### Portable document engineering

```text
default VCVGenerator template → pdfLaTeX baseline → supported alternate engines verified where applicable.
```

### Maintainability

```text
current demonstrated need does not require a new subsystem/framework → do not add one.
```
