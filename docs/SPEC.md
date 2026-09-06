# AAAAT v2 — Master architecture

**Owner summary:** Keep v2 and correct its direction. Reconcile authority and the harness, correct confirmed disclosure and data-loss defects, then complete the required capabilities below through small usable slices. Earlier technical checkpoints do not prove the whole product complete.

This is the single masterplan. [OWNER_INTENT.md](OWNER_INTENT.md) defines product meaning; [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) identifies the one active capability and its GitHub work. Destinations here are required outcomes, not pre-created work packages or a prescribed user workflow.

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

AAAAT is a private local workspace for capturing, maintaining, retrieving, and reusing career and opportunity information, and for creating application documents. It makes these activities convenient through a coherent graphical experience and optional integration with the user's chosen AI.

AAAAT supplies context and dependable operations; the user or their chosen AI supplies judgment and intelligence. “Specific RAG + orchestrator” describes this role; it does not prescribe a vector database, agent loop, workflow engine or general retrieval platform.

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

The contract also represents the field's semantic key/scope/label, value shape and cardinality, and whether it is built-in or user/configuration-defined.

The common contract provides the same cross-cutting behavior rather than hard-coding unrelated UI, editing, privacy, or Focus mechanisms for each semantic field. For every normal user-facing field/value:

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
canonical professional data + optional variant + document-specific content
→ resolved editable document model
→ TypeScript feeder
→ generated data.tex
→ editable main.tex blueprint using the AAAAT package
→ local pdfLaTeX
→ portable source project and PDF
```

AI may assist with content selection, transformation, tailoring, or drafting, but managed document rendering remains deterministic and user-editable. AI does not generate arbitrary executable TeX projects by default.

The feeder owns its generated data file. It never silently overwrites user-authored blueprints or edited package sources. Package updates are deliberate. Profile reuse must be convenient without requiring ordinary users to administer variants first. Existing whole-project manual mode is a foundation, not completion of this separate data/blueprint ownership model.

The package exposes a documented CV/letter API usable by both managed documents and advanced users writing their own TeX. Begin with one useful blueprint. Detailed sections, executive/classic/dense styles, typography and language/font handling remain the explicitly deferred owner LaTeX collaboration. Multilingual document content remains required under the pdfTeX strategy. This does not authorize a template marketplace.

Combined CV-and-letter output is a bounded production capability. Explicit artifact capture preserves the actual source/PDF used for an opportunity; links to mutable working documents alone do not satisfy this requirement. Later document edits cannot change a retained application artifact.

AgenticCareerBoost's validated-data/template feeder and P3CTeX's public LaTeX API with expl3 internals are precedents, not dependencies to import wholesale.

### LaTeX portability

Generated LaTeX belongs to the user. A generated project must:

- include required non-standard project sources within its own directory;
- avoid absolute paths into AAAAT, the developer repository, temporary directories, or the workspace;
- compile from its source directory with ordinary compatible tools;
- remain editable and compilable after AAAAT is removed;
- be portable to another directory, Git repository, TeX IDE, removable device, or Overleaf-style import.

The public API uses LaTeX2e, implementation uses `expl3`, and production uses pdfTeX through pdfLaTeX. Previous mandatory LuaLaTeX/XeLaTeX extension requirements are superseded by [ADR 0015](adr/0015-owner-approved-recovery-boundaries.md). Do not require users to install another engine or expand the engine matrix speculatively.

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
| LaTeX | LaTeX2e public API + `expl3` implementation |
| Baseline TeX engine | pdfLaTeX |
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

AAAAT currently has no real-user v2 data-compatibility baseline. During this pre-use development phase, development databases, fixtures, and already-merged migration files are not compatibility commitments. If current product meaning makes a development-era schema wrong, correct or consolidate that schema directly rather than preserving obsolete columns, compatibility projections, or migration chains for nonexistent users. Git history preserves the engineering evidence.

Once the Product Owner explicitly establishes a real-use/release data baseline, schema evolution from that baseline uses immutable numbered SQL migrations. Applied migrations record version, name, cryptographic hash, and application time; released/applied baseline migrations are never edited, later corrections use new migrations, and hash mismatch fails closed.

There is no v1 database migration obligation and no pre-use v2 migration-compatibility obligation.

`node:sqlite` remains behind a small main-process adapter because its API stability and Electron packaging behavior are executable compatibility concerns. Synchronous access is acceptable for bounded local operations until measured evidence demonstrates the need for another process boundary.

A persistence generalization requires demonstrated need; product flexibility alone does not authorize an EAV rewrite.

## AI architecture

AI is optional assistance. It does not make product decisions or turn a generated value into something more important than ordinary user-owned information.

AAAAT's technical boundary is structural and local: authoritative data structures, narrow application-service mutation paths, typed/domain validation, bounded operation capabilities, and the existing process/renderer privilege boundaries. It keeps AAAAT's own local state consistent; it is not a product claim that an AI result has authority over the user. AAAAT does not own or secure an external model's reasoning, prompt interpretation, provider internals, network, or research behavior.

Provider/model output is ordinary operation-scoped input. It is accepted, rejected, or applied according to the operation's typed validation and conflict/mutation policy. AAAAT does not rely on model obedience to protect its local state and does not require a universal human-approval queue.

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

External/provider contracts are separate from internal application-service and renderer contracts. Sharing mutation rules does not require sharing local identifiers or the renderer's access surface. Keep durable record, field, choice, variant and item IDs local. Use temporary references only for a required round trip, resolve them locally inside the validated operation scope, and reject unrelated or expired references. These references must not become a general object-access API.

Receiving permitted information does not authorize changing it. An operation's input or result cannot broaden its selected targets or capabilities. Keep ordinary text separate from executable commands, filesystem paths, queries and generated TeX syntax through typed and escaping boundaries. Tags, labels, notes and document text receive disclosure consideration too; they are not automatically harmless metadata.

If the selected/configured environment cannot reliably perform an operation, AAAAT does not pretend that operation is available.

No agent framework, workflow framework, durable general AI-task system, generic field-action registry, provider marketplace, cloud gateway, AI firewall, prompt-injection subsystem, or generic model-security/policy layer is implied.

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

Privacy projection controls disclosure; it is not the domain-security boundary. Token/placeholder syntax, generation, collision strategy, namespace shape, and restoration algorithm remain replaceable implementation details unless a concrete correctness issue makes one relevant. Tests assert non-disclosure and correct local restoration where required rather than one tokenizer mechanism.

Remote disclosure must be understandable. Broad cross-candidature remote analysis can expose highly profilable career/application information and therefore requires proportionate privacy disclosure before sending.

Credentials are not plaintext application records. Where secure OS storage is available, Electron `safeStorage` is the expected primitive; the application must explain insecure fallback conditions instead of pretending all platforms offer identical protection.

AAAAT cannot guarantee application-level privacy from an external agent already granted unrestricted screen/filesystem/shell access; setup must represent that limitation truthfully.

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

An external integration exposes only the named, product-specific AAAAT operations deliberately provided for that demonstrated use case. It does not expose generic CRUD, entity browsing/listing/search/query, arbitrary entity-ID access, or a scraping surface. Each operation has bounded purpose-specific input and output and converges on the same local application-service behavior as manual use. This does not require a generic task queue, workflow engine, or external data API.

The required external-assistant destinations are demonstrated named operations to:

1. Receive permitted user-written career direction and relevant professional context.
2. Inspect AI-visible CV tags and notes so the assistant can judge whether existing material is suitable.
3. Obtain permitted document content when those descriptions are insufficient.
4. Contribute bounded information or document content and request supported local production actions.

AAAAT does not rank CV suitability. Purpose-specific CV description disclosure is permitted; it does not establish generic profile/document browsing or candidature-corpus access. Broader sharing requires an understandable deliberate user choice. Omitted identifiers do not make recognizable disclosed content anonymous.

Other bounded capabilities may support uses such as:

- create or enrich a candidature;
- read explicitly scoped candidature information;
- obtain privacy-projected professional information;
- find relevant existing documents/material;
- contribute information or concepts;
- create document material;
- request rendering.

External AI does not receive arbitrary database, filesystem, shell, process, network, repository, generic entity-ID write access, or unbounded data-query capability merely for convenience.

Durable changes use the same application services as desktop/manual and direct-AI paths.

Retained Sources are not implicit default context. A bounded operation may receive explicitly scoped Source material when its product purpose requires it and its privacy/context rules permit it. Source use is operation-specific, not globally forbidden.

MCP uses the official SDK. A localhost service is not created without a concrete consumer and explicit authentication/security design. Host-specific integration material is validated and does not become a generic executable plugin runtime.

## Installation and configuration

Installation and configuration are product infrastructure.

One structured configuration/capability model should drive, where practical:

- graphical setup;
- `installer.ai`;
- `configurator.ai`;
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

AI/privacy tests prove operation context, non-disclosure, validation, bounded mutation, operation-specific conflict behavior, and local restoration where required. They do not freeze incidental token syntax/numbering/identity, exact prompt wording, one collision-corpus strategy, one rehydration algorithm, or a universal approval workflow unless a concrete product correctness invariant requires it.

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

The former M6 journey is superseded as a product contract. Keep its technically useful implementation where aligned; historical acceptance wording cannot impose a mandatory lifecycle or fixed Focus hierarchy.

The owner-approved recovery is active in [Issue #158](https://github.com/DidacLL/AAAAT/issues/158). The existing ToDo [Issue #156](https://github.com/DidacLL/AAAAT/issues/156) is a later capability proposal, not evidence of an active successor Mission. Verify live state before acting; cached branches are not authority.

Orchestrators may activate one next bounded capability under this accepted masterplan after checking Owner Intent, actual implementation, evidence and live GitHub state. Routine activation does not require owner approval. Escalate only consequential unresolved product meaning and Class D decisions. The current Mission records active work; GitHub records execution and evidence. Do not pre-create a speculative sequence of future Missions.

## Required capability destinations and acceptance

The sequence is **reconcile authority → correct confirmed privacy and data-loss defects → complete these destinations through small usable slices → establish real-use acceptance**. Destination completion requires its stated user behavior, not merely a foundation bearing the same name.

| Destination | Required outcome | Evidence that demonstrates it |
| --- | --- | --- |
| Reliable local information and retrieval | Raw Sources searchable by title, URL and full text; no silent draft loss; configurable Focus includes useful Sources/material; concept notes and lightweight ToDos; repeated editing/privacy/presentation behavior across meaningful career/application information. | Save/reopen a raw message and find text beyond the label excerpt. Navigate away from dirty editors, change workspace and use adjacent actions without silent loss. Reproduce an unexpected-call retrieval scenario with user-selected layout and material. |
| Context and operation boundaries | Separate wire/local contracts, operation-scoped references, deliberate Source context, non-disclosure and local restoration, same ordinary service/conflict rules for all producers. | Inspect actual provider/MCP payloads for no durable local IDs, private paths, excluded values or unrelated records. Verify temporary references only resolve inside their operation. Return malformed, conflicting and out-of-scope results and prove no unrelated mutation. |
| External assistance | Permitted career context, AI-visible CV descriptions, further scoped document content, bounded contributions and local production; real research routes only when capable. | Let an assistant judge existing CV suitability from permitted descriptions without candidature-corpus access, then obtain permitted content and contribute through the named operation. |
| Reusable document system | Package/feeder/blueprint ownership; optional variants; editable CV/letter and combined output; multilingual content; retained application artifacts separate from working documents. | Create a CV or letter with no candidature or AI. Compile an exported project and an independently authored TeX document using the package outside AAAAT. Capture used material, edit the working document, recover the exact retained source/PDF. |
| Accessible setup and recovery | One small explicit environment/capability model for GUI and installer.ai/configurator.ai guidance; detect/reuse software; multiple named connections and operation defaults; honest access descriptions; config import/export and usable backup/recovery. | Complete no-AI, available-connection and free-chat-guidance paths. Verify actual host configuration agrees with disclosure. Validate backup/restore and portable configuration through ordinary user controls. |

Assistance must be integrated with the information/document being worked on; a separate AI area must not become necessary merely because an input came from AI. A mixed-input scenario must permit manual entry, AI enrichment, another manual edit and later reuse of the same ordinary data.

The source audit baseline is `84222de`. It found stable external IDs, inaccurate workspace-path disclosure, incomplete raw-source retrieval and top-level draft loss. The foundations for documents and setup do not yet prove all destinations above. Source-audit results and focused tests do not substitute for fresh packaged, visual or release verification when the active change requires those checks.

Use focused unit/service tests, real SQLite evidence, a small number of realistic UI scenarios and relevant TeX/package checks. Follow the impact selection in `verify.yml`; repeat expensive checks when changes or unresolved evidence justify them. A protected status-context acknowledgement is not an actual packaging test.

### Maintainable execution and owner transport

Use [AGENTS.md](../AGENTS.md) as the single entry sequence. The skill and role files refer there instead of creating competing authority orders. Preserve independent scrutiny and invoke the Simplifier when material complexity warrants it. Tests and role labels alone do not establish review independence.

Routing is advisory: Classic for bounded GitHub implementation/coordination/review, Terra for local tests/native/visual/TeX evidence, Astra for difficult product/architecture interpretation. Owner attention is for consequential unresolved meaning, constitutional decisions and the agreed LaTeX collaboration. Access and economics may change; do not encode model names into product architecture.

Meaningful completions and actual handoffs begin with `Now`, `Next` (including destination), `Owner attention`, and `Evidence` in a few plain lines. When transport is needed, supply the exact message with repository, authoritative scope, current Issue/ref, outcome, exclusions, required evidence and expected return. The receiving agent verifies live state. Keep temporary prompts, transcripts and acceptance ledgers outside the repository; use existing GitHub coordination rather than another status system.

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
- generic EAV persistence merely for architectural purity;
- AI firewalls, prompt-injection middleware, or generic model-security/policy layers without a separate demonstrated AAAAT-owned need.

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

### Structural security

```text
external AI/model → bounded context + bounded capabilities; authoritative mutations → normal application services.
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
LaTeX2e package API + expl3 implementation → pdfLaTeX → portable managed and independently authored documents.
```

### Maintainability

```text
current demonstrated need does not require a new subsystem/framework → do not add one.
```
