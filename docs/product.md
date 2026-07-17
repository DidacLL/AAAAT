# AAAAT product definition

## Purpose

AAAAT is a local, owned job-application workspace. It keeps candidatures, source material, professional context, recruiter-call preparation, interview preparation, generated text, and document artifacts in one private desktop application.

AAAAT is designed for the practical work of an active job search: capturing an opportunity quickly, understanding what matters, knowing the next action, preparing communication, and retaining the material already produced for that candidature.

External LLMs may perform reasoning, research, extraction, and writing through bounded interfaces. They are optional. AAAAT is not an LLM provider wrapper, an agent orchestrator, an MCP product, or a chat client.

## Value and differentiation

AAAAT combines four capabilities that are usually scattered across unrelated tools:

1. a fast operational tracker for current candidatures;
2. reusable private professional context;
3. candidature-specific preparation and generated material;
4. controlled access for whichever external LLM environment the user already uses.

The product keeps the database, application state, templates, rendering, artifacts, and privacy rules in the local application. Reasoning remains outside the product. This avoids provider lock-in without reducing AAAAT to a thin protocol wrapper.

## Product principles

### Local ownership

The authoritative workspace is local SQLite plus local artifact files. The workspace is separate from the installed application and can be backed up or moved by its owner. AAAAT has no cloud database, telemetry service, or required online account.

### Useful without AI

The complete human workflow is available through the wx desktop without an LLM, network connection, model account, terminal, Git installation, or development checkout.

A candidature can be created, stored, edited, searched, prepared, and retained indefinitely without connecting an AI. An incomplete candidature remains a valid record. Unknown values remain empty until they are entered or derived later.

### Autonomous assistance without review bureaucracy

When an external LLM is connected, valid bounded results are applied directly to the intended local records. AAAAT does not impose a human approval queue, thought review, suggestion acceptance ritual, or mandatory confirmation between routine operations.

The user may edit any result through the normal application, but continuous human supervision is not a product requirement. Privacy and authority are enforced by the data model, schemas, capability scope, and inaccessible command surfaces—not by asking a person to inspect every generated step.

### Provider neutrality

AAAAT does not ask for a provider, API key, model URL, model name, or provider SDK. The external host owns credentials, provider selection, network policy, and host-specific setup.

### Candidature-centred operation

The candidature is the central unit of work. It connects the original source, current state, next action, notes, research, evaluation, preparation, generated material, artifacts, and lifecycle history.

### Fast operational UX

AAAAT is used during real recruiter calls and time-sensitive preparation. Primary views must answer quickly:

- Which company and role is this?
- What is the current stage?
- What happens next?
- What is the pitch?
- What should be asked?
- What should not be overstated?
- What source material and artifacts already exist?
- What does a selected keyword mean?

The interface should avoid documentation-heavy panels, giant lists, duplicate drafts, decorative navigation, and protocol terminology in normal use.

### Minimal implementation

The product uses Python, wxPython, SQLite, and small amounts of standard-library code. PyInstaller is used for native packaging. Heavy frontend frameworks, provider SDKs, plugin frameworks, workflow engines, database servers, and speculative abstraction layers are out of scope.

## Desktop application

The wx desktop is the complete human application.

### Welcome View

Welcome View introduces AAAAT, selects or creates the private workspace, and provides direct routes into profile, candidature, and optional AI connection workflows. It does not expose repository concepts, protocol diagnostics, connector certification, or developer controls.

### User View

User View stores reusable professional context: identity and contact details, links, summaries, skills, experience, education, preferences, constraints, target roles, target markets, and career direction.

Profile values are stored once in the authoritative variable store. Templates and bounded contexts resolve those values according to purpose and exposure rules.

### Smart View

Smart View is the recruiter-call and urgent-preparation cockpit. It keeps the selected candidature, keyword information, notes, next actions, preparation material, and current artifacts visible together. Its no-selection state provides an overview of active work.

Smart View is intentionally compact. It is not a reduced copy of Detailed View.

### Detailed View

Detailed View provides complete candidature inspection and editing, including fields that would overload the call-oriented Smart View: raw source material, research, evaluation, form answers, document material, interview preparation, lifecycle information, and artifact metadata.

### Assistance and connection surfaces

AI connection is optional and subordinate to the application. The normal surface prepares an AAAAT connection request in plain language. Advanced file exchange or command execution may be available without becoming the main user experience.

## Candidature model

A candidature can exist with only source material. Company, role, location, URL, keywords, or other derived fields may remain empty. AAAAT must never invent placeholder facts such as a fake company or role merely to satisfy storage constraints.

A candidature may include:

- company and role;
- status, priority, and next action;
- source and source URL;
- location and remote mode;
- raw offer and application-form material;
- notes and call signals;
- offer snapshot and company research;
- evaluation, strengths, risks, and valuation;
- pitch, questions, and preparation order;
- keywords and glossary definitions;
- form answers;
- CV, cover-letter, recruiter, and interview material;
- generated artifacts and provenance.

Saving the candidature and its source material is independent from creating optional assistance work. Failure or absence of an AI connection must not roll back or delete a valid candidature.

## Lifecycle

AAAAT uses a practical candidature lifecycle rather than a generic workflow engine. The application owns a small vocabulary covering stages such as interest, preparation, applied, recruiter contact, interview, offer, rejection, withdrawal, and archive.

Lifecycle helpers may queue useful preparation work, but they must not make the candidature dependent on an external runtime. Manual edits and ordinary desktop use remain available at every stage.

## Professional context and privacy

Personal and professional data is represented through reusable variables and purpose-scoped facts. The application decides whether a value is exposed to a bounded external task as:

- raw;
- redacted;
- summarized;
- placeholder only;
- denied.

The exposure decision is enforced locally before context leaves AAAAT. The external host does not receive general database, workspace, repository, file, or desktop access.

Templates contain variable references rather than hardcoded personal data. Private rendered documents may contain resolved values; source templates, examples, screenshots, and demos remain fictional or anonymized.

## External LLM mechanism

AAAAT supports external reasoning through passive, provider-neutral interfaces. The installed product supplies an `AAAAT` skill, an opaque connection capability, a bounded bridge tool catalogue, and portable task/result exchange where needed.

A bounded work item contains the context, instructions, permitted operation, result schema, and callback capability required for that one task. The capability is not a database or entity identifier and does not provide arbitrary mutation authority.

Valid results are applied by AAAAT to the internally bound record. The LLM does not choose storage paths or directly edit arbitrary records.

This mechanism is an optional adapter around the product domain. It must remain small enough that the candidature tracker, desktop UX, rendering, and local data model stay recognizably central.

## Generated material and artifacts

AAAAT stores generated text and rendered files with provenance. The current useful version should be prominent; older versions should not dominate the main interface.

Artifact states are organizational metadata:

- `draft` — current working material;
- `reviewed` — optionally classified as checked;
- `submitted` — sent or used externally;
- `archived` — retained older material.

These states do not create mandatory human-review gates. Automated generation can update current material directly. The user may later mark what was sent or archive obsolete versions.

Each artifact records its candidature, type, path, label, creation time, source context, available generating-agent provenance, state, and notes.

## Templates and rendering

AAAAT includes reusable anonymized templates for at least CV and cover-letter output. Profile variables and candidature fields are resolved locally. The external LLM may produce wording or structured material, while AAAAT owns rendering, local paths, version handling, and artifact registration.

Rendering must remain useful without a connected LLM when the required values and text are already available.

## Backup and portability

The private workspace can be backed up independently from the installed application. Backup and restore preserve the SQLite database and artifact files without Git.

Native Windows, macOS, and Linux packages are built from the same source and keep private workspace data outside the application directory.

## Public material

Repository examples, screenshots, tests, issue reproductions, and any static demonstration use fictional data only. Real offers, CV data, recruiter messages, generated documents, databases, or private PDFs do not belong in the repository.

## Non-goals

AAAAT does not aim to provide:

- an LLM provider wrapper or model selector;
- an agent orchestration framework;
- a broad CRUD API for external agents;
- connector certification or a provider catalogue;
- a generic plugin system;
- mandatory human review of AI work;
- automatic external application submission;
- a cloud service or telemetry platform;
- a browser application as the primary human product;
- a generic project-management or workflow-engine product.

## Product completion criteria

A credible release preserves the following:

- complete manual desktop operation;
- fast Smart View and complete Detailed View behavior;
- immediate persistence of incomplete candidatures and raw source material;
- local profile, artifact, backup, and rendering mechanisms;
- optional provider-neutral assistance with bounded authority;
- no mandatory review or acceptance loop for generated work;
- one clear packaged `AAAAT` skill;
- minimal dependencies and a comprehensible source tree;
- behavioral tests for executable product contracts;
- verified native packages for Windows, macOS, and Linux.
