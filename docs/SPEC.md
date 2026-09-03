# AAAAT v2 Specification

## Status and authority

This is the canonical product and architecture specification for AAAAT v2.

Accepted Architecture Decision Records may refine this specification. The current Mission narrows what may be built now; it does not weaken this specification. GitHub Issues define bounded implementation work. If historical AAAAT v1 code, documentation, tests, schemas, or protocols disagree with this document, the v1 material is research evidence only.

## Product definition

AAAAT is a private, local-first career workspace for:

- maintaining reusable professional knowledge;
- creating and managing CVs and cover letters;
- tracking candidatures and source material;
- preparing for recruiter calls, interviews, and assessments;
- using optional AI assistance through controlled, privacy-projected operations;
- exposing bounded capabilities to external AI tools when a reliable integration exists.

AAAAT is complete and useful without AI. It is not an LLM wrapper, agent framework, workflow engine, cloud service, or generic plugin platform.

VCVGenerator is a core product capability, not an optional extension. AAAAT must produce ordinary, user-owned LaTeX projects that remain useful without AAAAT.

## Clean-restart rule

AAAAT v2 preserves the problem, product knowledge, useful workflows, privacy principles, and visual lessons learned from AAAAT v1 and AgenticCareerBoost. It does not preserve their implementation contracts.

There is no requirement to retain or migrate:

- the Python or wxPython implementation;
- Smart View and Detailed View as technical architectures;
- the v1 SQLite schema;
- the v1 task/capability state machine;
- handwritten MCP or JSON-RPC code;
- watched-folder AI exchange;
- tagged-chat envelopes;
- the external-host-first inference model;
- the v1 zero-runtime-dependency rule.

The v1 implementation remains available through Git history and recovery tags.

## Interaction directions

### Human to AAAAT

Every essential product capability must be available through a coherent graphical interface. Ordinary users must not need JSON, shell commands, protocol knowledge, repository access, or intermediate exchange files.

Incomplete data is normal. The UI uses progressive disclosure and focused workflows rather than presenting a wall of empty fields.

### AAAAT to AI

When a user requests AI assistance from AAAAT, AAAAT owns the experience:

1. select the configured connection;
2. construct the minimum operation-specific context;
3. apply the user's privacy projection;
4. invoke the provider or runtime;
5. validate the response against the operation contract;
6. apply a permitted valid result through the normal application service;
7. explain failures without exposing raw provider or protocol details.

An unreliable integration must not appear as an ordinary one-click action.

### AI to AAAAT

External AI applications may invoke explicitly supported AAAAT capabilities through a suitable bounded integration. An integration may use MCP, commands, a portable import capsule, or another demonstrated host mechanism. Copy/paste is a last-resort compatibility path, not the normal experience.

External integrations call the same application services as the desktop UI. They never receive general database, filesystem, shell, process, network, or repository authority from AAAAT.

## Architectural objectives

AAAAT v2 is one local desktop application with four cooperating product capabilities:

```text
Candidature management
Profile and career knowledge
VCVGenerator
AI interoperability
```

They share one application core and one local workspace.

The normal mutation path is:

```text
human or bounded external integration
                ↓
        validated command
                ↓
       application service
                ↓
      validated domain change
                ↓
      SQLite + local artifacts
```

AI assistance adds a controlled proposal path:

```text
user intention
      ↓
operation contract
      ↓
minimum required context
      ↓
privacy projection
      ↓
configured model provider
      ↓
typed validated proposal
      ↓
normal application command
```

Document production follows:

```text
canonical career data
      ↓
named profile variant
      ↓
document-specific rules
      ↓
editable document model
      ↓
portable LaTeX project
      ↓
standard TeX engine
      ↓
local PDF
```

## Technology baseline

The approved baseline is:

| Concern | Decision |
| --- | --- |
| Desktop | Electron |
| Renderer | React |
| Language | TypeScript strict mode |
| Build | Vite |
| Packaging | Electron Forge |
| Package manager | npm |
| Runtime schemas | Zod |
| Database | SQLite through Electron's embedded `node:sqlite` runtime when proven |
| Unit and integration tests | Vitest and React Testing Library |
| Limited desktop smoke tests | Playwright Electron support where useful |
| Styling | ordinary CSS with explicit design tokens |
| LaTeX programming | standard LaTeX plus `expl3` |
| Baseline TeX engine | pdfLaTeX |
| Capability extensions | LuaLaTeX and XeLaTeX |
| LaTeX build helper | `latexmk` |
| Future MCP implementation | official TypeScript SDK, never handwritten protocol framing |

Direct dependency versions are pinned exactly in `package.json` and `package-lock.json`. Dependency upgrades are isolated, verified changes. A dependency is acceptable when it removes more maintained complexity than it introduces.

The Electron Forge Vite integration and `node:sqlite` boundary are M0 proof obligations. A failure may justify a bounded Class C build-integration or database-adapter decision. It does not silently authorize replacing the approved product architecture.

## Desktop privilege boundary

AAAAT uses the standard Electron process boundary:

```text
React renderer — unprivileged
        ↓ narrow typed preload
Electron main — privileged adapters and application services
        ↓
SQLite, files, TeX, providers, integrations, installer services
```

Every application window maintains:

```text
contextIsolation = true
sandbox = true
nodeIntegration = false
webviewTag = false
```

The renderer has no direct authority over:

- SQLite;
- the filesystem;
- process execution;
- credentials;
- Electron main APIs;
- arbitrary privileged networking.

The main process restricts navigation, new windows, permissions, and remote content. Production content uses a restrictive Content Security Policy. Privileged IPC validates the sender and validates inputs and outputs at runtime.

The preload exposes fixed domain methods. It never exposes `ipcRenderer`, generic `invoke`, generic events, arbitrary fetch, SQL, paths, shell, process, or filesystem primitives.

## Application services and durable mutations

All durable mutations pass through explicit application services:

```text
validate input
→ load current state
→ enforce rules
→ start transaction
→ mutate
→ record meaningful provenance/activity
→ commit
→ notify affected views
→ return validated result
```

React components, AI providers, integration adapters, installer recipes, and the LaTeX renderer do not write application tables directly.

Valid bounded AI results may apply directly when the operation policy permits it. AAAAT must not introduce a universal mandatory approval queue. Invalid output never mutates authoritative data. A proposed value that conflicts with an existing authoritative value never silently overwrites it.

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

Schema evolution uses immutable numbered SQL migrations:

```text
migrations/001_name.sql
migrations/002_name.sql
```

Applied migrations record their version, name, cryptographic hash, and application time. A merged migration is never edited; a change creates a new migration. A hash mismatch fails closed. There is no v1 database migration requirement.

`node:sqlite` remains behind a small main-process adapter because its API stability and Electron packaging behavior are executable compatibility concerns. Synchronous access is acceptable for bounded local operations until measured evidence demonstrates the need for another process boundary.

## Canonical professional profile

One canonical professional profile owns authoritative career data. Profile items are independently identifiable and typed, such as identity, contact, summary, experience, education, project, skill, certification, language, link, and justified custom data.

Named profile variants represent focus and visibility rules, not another person. A variant may contain:

- a stable ID and human name;
- target tags and preferred language;
- item include/exclude rules;
- item content overrides;
- ordering rules;
- document defaults and metadata overrides.

Variants store only differences from canonical data.

A document may specialize a profile variant further. Document-specific rules do not mutate the canonical profile or the selected variant.

## Candidature workspace

A candidature represents one job-search opportunity and remains useful with partial data. It may own source material, company, role, location, work mode, salary text, notes, status, dates, next action, concepts, analysis, documents, and artifacts.

Lifecycle states remain small and understandable. Archiving is independent from lifecycle state.

Technologies, domain concepts, role keywords, aliases, and definitions may be shared entities. Recruiter-call and focus views are projections over existing records, not separate domain models.

## VCVGenerator

VCVGenerator supports:

- CVs;
- cover letters;
- combined CV and cover-letter output;
- multilingual content;
- editable structured document content;
- shared reusable LaTeX logic and template preambles;
- profile-variant and document-specific selection and overrides;
- visible source and artifact locations;
- local rendering;
- portable independent export.

### Portability

Generated LaTeX belongs to the user. A generated project must:

- contain every non-standard source it needs inside its own project directory;
- avoid absolute paths into AAAAT, the developer repository, temp directories, or the workspace;
- compile from its source directory with ordinary compatible tools;
- remain editable and compilable after AAAAT is removed;
- be suitable for another directory, Git repository, TeX IDE, removable device, or Overleaf-style import.

`latexmk` is a convenience, not a proprietary compiler.

### LaTeX language and engines

AAAAT document code uses standard LaTeX and `expl3`. Lua is not the document implementation language.

The compatibility baseline is pdfLaTeX. LuaLaTeX and XeLaTeX are supported capability extensions. Ordinary Latin-script built-in templates should support all three engines. A template may declare a narrower set only when a real capability such as OpenType fonts or complex-script shaping requires it.

Engine-specific logic begins inside the common package and is split only when substantial real code justifies separate files.

### Templates and document model

The first implementation uses a small set of data/resource templates and a reusable `aaaat.sty` package. It does not begin with a template marketplace, executable JavaScript plugins, or a custom document class without demonstrated need.

AI normally proposes structured CV or cover-letter content. AAAAT validates and renders that document model deterministically. AI does not generate an arbitrary executable TeX project by default.

Managed documents detect direct source edits before regeneration. A user may preserve manual TeX changes by moving the document into an explicit manual mode; AAAAT never silently overwrites those edits.

## AI architecture

The core product is provider-neutral: domain code does not import provider request types or provider-specific behavior.

An application-facing model provider contract remains deliberately small and operation-oriented. Initial direct support is expected to reuse a generic OpenAI-compatible HTTP adapter for demonstrated local and remote systems, with convenience detection or defaults for systems such as Ollama and LM Studio.

AAAAT does not initially adopt an agent framework, workflow framework, provider marketplace, or cloud gateway. Provider-specific dependencies require evidence that they remove more complexity than they add.

AI operations are bounded user intentions such as extracting a job, assessing fit, recommending an existing profile variant, tailoring a CV, or drafting a cover letter. Each operation owns:

- input and output schemas;
- required context;
- privacy requirements;
- capability requirements;
- instructions;
- mutation/conflict policy.

There is no generic field-action registry or durable general task system.

## Privacy projection

AI receives an intentionally constructed operation-specific projection immediately before inference.

Each eligible value may be:

- exposed;
- omitted;
- replaced by a local opaque token.

Token mappings remain local. After validation, permitted tokens may be rehydrated into an editable local draft. The authoritative profile and candidature data are never changed merely to construct an AI-safe view.

Connections are classified as local, remote, or unknown. The UI makes remote disclosure understandable and requires proportionate acknowledgement for unusually broad remote analysis. A system already granted unrestricted screen, shell, or filesystem access is outside AAAAT's application-level privacy boundary.

Credentials are not plaintext application records. Where secure OS storage is available, Electron `safeStorage` is the expected primitive; the application must explain insecure fallback conditions instead of pretending all platforms offer identical protection.

## External integrations

AAAAT separates direct inference from external control:

```text
AAAAT to AI → ModelProvider
AI to AAAAT → bounded application capabilities
```

Initial external mechanisms are introduced only when tested against real hosts. MCP uses the official SDK. A bounded command surface and portable import capsule may coexist. A localhost HTTP service is not created without a concrete consumer and an explicit authentication/security design.

Generated host-side integration material begins disabled and proposed. Activation validates its manifest, capability names, transport, permissions, connection, test operation, and privacy disclosure. AAAAT does not create a generic executable plugin runtime to host it.

## Installation and configuration

Installation and configuration are product infrastructure, implemented incrementally after earlier Missions prove the product paths they configure.

The setup UI and future `installer.ai` harness consume one structured source of installation knowledge. Recipes reference known AAAAT actions; they do not contain unrestricted generated shell programs.

Setup detects and validates existing environments before recommending replacement. A working TeX distribution, preferred editor, or local model runtime is accepted. AI remains optional; failure to configure AI does not make local setup unsuccessful.

## Workspace, artifacts, backup, and activity

The workspace remains understandable outside the database and owns its SQLite file, document projects, artifacts, templates/configuration, integrations, and exports.

Backup includes a consistent SQLite backup plus relevant user-owned files and a manifest. Secrets are excluded by default. Restore validates the manifest, schema, integrity, and paths before activation.

AAAAT records meaningful changes for provenance and supported undo. This is not event sourcing; SQLite remains authoritative current state. Undo executes another normal application command.

## Renderer and user experience

Initial top-level product areas are Candidatures, VCVGenerator/Documents, Profile, and Settings. They are introduced only when their Mission begins.

Renderer state is kept close to its owner:

- application/domain state is queried through the typed desktop API;
- local UI state uses React component state/hooks;
- small shared app state may use React context when demonstrated.

AAAAT does not initially use Redux or maintain a duplicate renderer copy of the complete database.

The UI normalizes incomplete information, uses progressive disclosure, and hides provider/protocol details from ordinary workflows. It preserves the useful visual identity and product lessons of v1 without porting its widget hierarchy.

## Testing and executable evidence

Tests protect user behavior, domain invariants, security boundaries, data integrity, external contracts, and portable artifacts. They do not freeze incidental source layout, exact documentation wording, branch names, PR numbers, or temporary labels.

Required evidence grows with implemented capability and includes:

- domain/application-service tests outside Electron UI where practical;
- real SQLite migration tests;
- renderer tests through user-observable behavior;
- runtime Electron security and preload allowlist checks;
- deterministic provider fixture tests when AI begins;
- LaTeX compilation and unrelated-directory portability tests when VCVGenerator begins;
- a deliberately small packaged-desktop smoke suite for critical boundaries;
- native Windows, macOS, and Linux packaging evidence.

Build success alone is not proof of runtime, visual, security, database, or portability claims.

## Capability Missions

Missions are capability checkpoints, not waterfall phases. M0–M5 are accepted foundation and capability checkpoints forming the initial AAAAT v2 restart/alpha series. Their acceptance does not mean the AAAAT product-completion roadmap is complete. Only the active Mission is decomposed into Issues.

Accepted restart/foundation checkpoints:

- **M0 — Foundation:** secure Electron/React/TypeScript/SQLite startup, verification, and packaging.
- **M1 — Manual VCVGenerator:** canonical career data, variants, manual documents, portable LaTeX, and local rendering.
- **M2 — Candidature Workspace:** manual candidature tracking, source, search, status, notes, concepts, focus views, and document associations.
- **M3 — AI Assistance:** direct configured providers, privacy projection, extraction, recommendation, tailoring, and drafting over working manual paths.
- **M4 — Agentic Interoperability and Setup:** bounded external commands, official MCP, adaptive host integration, installer knowledge, configuration portability, backup, and restore.
- **M5 — Release Hardening:** platform packaging, reliability, security, recovery, documentation, compatibility evidence, and cleanup without architectural expansion.

Product-completion Missions continue from that accepted architecture:

- **M6 — Opportunity Understanding & Recruiter Readiness — active:** make one candidature genuinely useful manually through reusable career context, multiple source inputs, priority, durable evaluation/strategy/recruiter preparation, and a fast recruiter-ready projection.
- **M7 — Application Preparation & Material Lifecycle:** complete the manual candidature workflow through interview/assessment preparation, actual application questions/answers, manual research context, and document usage/supersession.
- **M8 — VCVGenerator & Setup Completion:** complete remaining VCVGenerator, privacy/setup, GUI recovery, and safe configuration-portability product capability.
- **M9 — Contextual AI Assistance:** move validated optional AI assistance into the authoritative manual workflows and persist operation results through normal product data paths.
- **M10 — Research & Bounded External Collaboration:** add real research capability and only the bounded external contributions demonstrated by actual workflows.
- **M11 — Product Completion Acceptance:** integrate and prove the complete packaged manual/no-AI candidature lifecycle, plus bounded assisted paths, without adding speculative architecture.

M7–M11 remain capability-level roadmap direction only until activated. They must not be pre-decomposed into implementation Issues or scaffolding.

## Prohibited speculative infrastructure

Do not create unused:

- provider registries;
- plugin loaders or marketplaces;
- event buses;
- workflow schedulers;
- generic repositories;
- background services or daemons;
- agent/task databases;
- general REST or GraphQL APIs;
- cloud synchronization;
- compatibility layers for v1;
- future-Mission domain scaffolding.

Default abstraction heuristic:

```text
first real case → implement directly
second similar case → tolerate small duplication or extract an obvious helper
third real case → evaluate a generalized abstraction
```

Security/process boundaries and real interchangeable providers may justify earlier interfaces. Hypothetical future flexibility does not.

## Non-negotiable acceptance invariants

### Manual independence

```text
No AI installed → core manual AAAAT and VCVGenerator workflows still work.
```

### LaTeX independence

```text
Export source → copy elsewhere → compile in a compatible TeX environment → AAAAT is not required.
```

### Data ownership

```text
No cloud account → the local workspace remains authoritative.
```

### AI isolation

```text
Malformed or conflicting AI result → authoritative data is not corrupted or silently overwritten.
```

### Privacy projection

```text
Hidden field → the real value is removed or tokenized before provider invocation.
```

### Single mutation path

```text
UI, external integration, and import → the same application-service rules.
```

### Renderer isolation

```text
React renderer → no unrestricted filesystem, database, process, credential, or Electron authority.
```

### No v1 inheritance

```text
An old code/test/schema contract creates an awkward design → discard the old contract.
```

### Portable document engineering

```text
Default VCVGenerator template → pdfLaTeX baseline → supported alternate engines verified.
```

### Maintainability

```text
If the current Mission can succeed without a new subsystem, framework, abstraction, extension mechanism, or runtime service → do not add it.
```
