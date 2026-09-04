# AAAAT Owner Intent

**Status: canonical Product Owner authority**

This document defines what AAAAT is, why it exists, and the product behavior that later specifications, Missions, Issues, tests and implementations must preserve.

For product meaning, current direct Product Owner instruction overrides this document. This document overrides derived specifications and implementation evidence.

## 1. What AAAAT is

AAAAT is a **private, local career/application information workspace and application-artifact generator**.

Its reason to exist is convenience.

Job-search information arrives in inconvenient forms: job advertisements, recruiter messages, links, application forms, conversations, notes, documents and AI chats. Professional information is then repeatedly needed again for CVs, letters, calls, applications and later opportunities.

AAAAT makes that information easy to:

- capture with little effort;
- structure when useful;
- edit;
- retrieve quickly;
- reuse across candidatures and documents;
- turn into application artifacts;
- keep locally under the user's control.

AAAAT is useful whether a user maintains detailed records or barely maintains them.

It is not defined by disciplined application tracking, a fixed job-search process, or continuous record maintenance.

## 2. Users may work however is convenient

AAAAT must support complete human-driven use without AI.

That does **not** make manual entry the preferred or canonical path.

Information may enter AAAAT through:

- manual entry or editing;
- pasted/imported raw material;
- AI invoked from AAAAT;
- an external AI using bounded AAAAT capabilities.

These paths may be mixed freely.

Example:

1. The user pastes a job offer.
2. AI extracts company and role.
3. The user corrects the role.
4. The user manually enters compensation.
5. A later AI operation uses those edited values.

All retained values are ordinary user-owned AAAAT data. Their origin does not create a separate data class.

AAAAT must never block manual entry merely because information could theoretically be extracted by AI.

Likewise, AAAAT should offer lower-effort assisted paths where the user's configured environment can provide them reliably.

## 3. Users may start anywhere

AAAAT does not assume a fixed sequence.

Valid starting points include:

- a complete raw job offer;
- only a URL;
- a recruiter message;
- one manually entered value;
- a fully manually entered candidature;
- an application form;
- an external AI conversation;
- an existing CV;
- a request to create a CV or cover letter without creating a candidature;
- an old candidature reopened because a recruiter unexpectedly called.

The product may offer optional guidance, suggestions, checklists, statuses, ToDos, AI opinions or other conveniences.

Those capabilities are allowed.

They must not become prerequisites for unrelated AAAAT use.

A capability not being fundamental does not mean it is forbidden. A capability being available does not make it mandatory.

## 4. Sparse information is normal

A candidature may contain almost nothing or a great deal.

The user may save a raw source now and complete other information much later or never.

Missing optional information is not product debt. AAAAT must not require completeness, present a sparse candidature as defective, or make a completeness score/percentage the governing interaction model.

This does not mean empty information must always be hidden, that an empty/addable field must never be shown, or that an optional user-requested overview of the user's data is prohibited.

The UI must handle sparse information intelligently.

There is intentionally no global rule that empty fields are always shown or always hidden.

Each view should balance:

- understanding;
- useful populated data;
- available screen space;
- discoverability of information the user may want to add;
- avoidance of clutter;
- avoidance of making a sparse record look erroneous or incomplete.

AAAAT must not become a giant wall of empty controls.

It also must not hide structure so aggressively that the user cannot understand or add relevant information.

## 5. Raw source material is first-class

Original source material must be retainable independently from structured information derived from it.

Useful sources include:

- job advertisements;
- recruiter messages;
- URLs;
- application forms;
- conversation-derived material;
- notes or pasted text;
- other relevant source information.

The user may save source material immediately without first structuring it.

A human may manually derive information from it.

AAAAT may offer AI extraction or enrichment when suitable configured capability exists.

Extraction never replaces the source and never removes manual control.

Sources remain explicit retained AAAAT domain objects. They are not default provider context: an AI operation may use only the Source material it explicitly scopes, when that operation's product purpose genuinely requires it and its privacy/context rules permit disclosure. This does not reserve Sources for one discovery feature or prohibit them from every other AI operation.

## 6. AAAAT information is flexible but meaningful

AAAAT should understand useful semantic information such as:

- company;
- role;
- location;
- work arrangement;
- compensation;
- dates;
- description;
- requirements;
- company or role research;
- strengths;
- gaps, risks or concerns;
- questions;
- pitch;
- technical stack, keywords or concepts;
- notes;
- application-form questions and answers.

This is useful vocabulary, not a mandatory field checklist and not a prescribed workflow.

The architecture must also allow useful information that was not anticipated by the original built-in catalogue.

AAAAT should generalize repeated data behavior while preserving real domain meaning.

## 7. Common capabilities of normal user-facing fields

Every normal user-facing AAAAT field/value participates in the common user-information capability model. System/internal values such as IDs, hashes and migration metadata are excluded.

For every normal user-facing field/value:

- the user can manually inspect and edit it;
- the user can manually create/set it when the domain permits the value to be absent;
- it can be cleared or removed where its domain semantics allow deletion;
- its exposure to AI context is user-controllable;
- it is eligible to be shown or hidden in Focus;
- when shown in Focus, its order and relative prominence/space are configurable.

AI generation or transformation of a field is a separate capability. That operation is offered only when a suitable configured AI capability exists for it.

These capabilities are independent.

For example:

- hiding information from AI does not hide it from Focus;
- hiding it from Focus does not delete it;
- AI-created information remains manually editable;
- manually entered information may later be used by AI.

AAAAT may provide defaults. Defaults do not establish universal importance.

Do not use field type as an excuse to build unrelated privacy, Focus, or editing mechanisms for each semantic field.

This common field/value requirement does not convert structural domain entities such as documents, sources, concepts, or ToDos into generic fields. Those remain explicit domain concepts with their own appropriate behavior.

## 8. Identifying a candidature

A candidature must be easy to find even when sparse.

Company and role are useful default identifying information when available, but they are not validity requirements.

The product must allow identification/presentation to use other useful available or user-selected information without redesigning the candidature model.

Exactly how fallback labels are chosen is a UI/specification decision, not an owner-level requirement.

## 9. Focus is a core AAAAT capability

Focus exists for rapid identification and retrieval, especially during an unexpected recruiter or interview call.

Its job is to:

1. help the user find the relevant candidature quickly;
2. use the available screen effectively;
3. show the information that user wants immediately available.

Focus may contain any suitable stored information, including facts, concepts, notes, questions, research, reminders, pitch, compensation, links, documents, ToDos, or other user-defined data.

Every normal user-facing field/value is eligible to be shown or hidden in Focus. When shown, the user can configure its order and relative prominence or allocated space.

Structural domain entities such as documents, sources, concepts, and ToDos may also participate in Focus through domain-appropriate presentation; that does not convert them into generic fields.

AAAAT may ship sensible defaults.

Those defaults are merely starting presentation choices.

Focus is not defined as a recruiter script, checklist, fixed "next action" area, or fixed list of privileged fields.

The mature v1 product lesson to preserve is configurable, high-density focused retrieval. The old wx implementation and its clutter are not requirements.

## 10. Full candidature access

AAAAT also needs a complete way to browse and manage saved candidature information.

The user must be able to:

- browse/search candidatures;
- inspect a selected candidature;
- see its stored information;
- add information;
- edit information;
- clear/delete information;
- inspect sources;
- manage concepts;
- manage ToDos;
- manage related documents and artifacts;
- control AI privacy;
- configure Focus.

A candidature can retain or associate the actual application material used for that opportunity, including the relevant CV, cover letter, or other submitted/generated artifacts. This historical information is valuable independently from lifecycle/status tracking and must not require the user to maintain a formal application-state workflow.

This experience must avoid one enormous static form.

Use progressive disclosure, reusable information components and sensible use of screen space.

The exact screen/view implementation is not an owner requirement.

## 11. ToDos

ToDos are confirmed AAAAT data.

A ToDo is a lightweight user-created note with a done/not-done state and may be related to a candidature.

A ToDo does not inherently imply:

- a workflow step;
- scheduling;
- recurrence;
- a predicted next action;
- an AI task;
- a workflow engine.

Additional optional behavior would require its own justification.

## 12. Status, lifecycle, priority and next action

These are not defining AAAAT concepts.

They may exist as optional information if useful.

AAAAT must remain useful when the user never maintains them.

No core feature should require a perfectly maintained candidature lifecycle.

They must not become central merely because conventional application trackers use them.

## 13. Shared concepts and keywords

AAAAT must support reusable concepts/keywords with information such as:

- canonical term;
- aliases/admitted forms;
- definition;
- user notes.

Concepts can be associated with multiple candidatures.

Information encountered in one candidature may improve shared concept knowledge used elsewhere.

Concepts are particularly useful in retrieval, search and Focus.

This remains a bounded AAAAT capability, not a generic knowledge-management platform.

## 14. Professional information

AAAAT maintains reusable professional/career information.

The current v2 canonical profile and difference-based profile variants are valuable and should be preserved unless a later owner decision changes them.

Professional information may include experience, skills, identity/contact data and user-stated objectives, preferences, constraints, targets, markets/locations, writing preferences or other useful information.

AAAAT may assist with extracting or organizing that information.

The user determines what it means and what they want to retain.

## 15. VCVGenerator is independently core

VCVGenerator is a primary AAAAT capability, not merely a candidature output screen.

AAAAT must support:

- CV creation/editing;
- cover-letter creation/editing;
- combined CV + cover-letter output;
- reusable professional information;
- profile variants;
- document-specific differences/overrides;
- editable content before rendering;
- multilingual document content;
- local rendering;
- portable user-owned LaTeX;
- clear access to source and generated artifacts.

VCVGenerator must remain usable without AI and without a candidature.

A valid AAAAT use is:

1. save a raw offer or reference;
2. create/tailor a CV;
3. manually write a cover letter;
4. render both;
5. leave the remaining candidature data untouched.

Another valid use is opening AAAAT only to work on a CV.

## 16. AI is optional assistance, not a product decision-maker

AI is valuable where it reduces effort or solves uncertain information-processing problems.

Useful operations include:

- extracting information from raw material;
- summarizing;
- comparing selected information;
- explaining terminology;
- identifying possible matches, gaps or concerns;
- external research when genuine research capability exists;
- transforming text;
- drafting;
- filling or proposing selected information;
- generating/tailoring document content;
- selected cross-candidature analysis;
- giving an opinion or suggestions when the user explicitly asks for them.

User-requested AI opinion is a legitimate capability, including asking what a model thinks about an opportunity.

It is AI-dependent and therefore must not be the default foundation or be presented as universally available.

If no suitable configured AI capability exists, AAAAT should not pretend that operation is available.

AI output is not more important or true merely because a model produced it.

Useful retained results become ordinary editable AAAAT information.

AAAAT has no product notion that an AI result, a field value, or a workflow has authority over the user. A generated value is ordinary user-owned information: the user may keep it, edit it, replace it by asking again, clear it, or leave the field blank. Internally, AAAAT keeps local data consistent through explicit product structures, normal application-service mutations, validation, bounded integrations, and renderer/process privilege boundaries. AAAAT does not own or secure an external model's reasoning, prompt interpretation, provider internals, network, or research behavior.

AAAAT therefore does not make prompt-injection detection, an AI firewall, adversarial prompt sanitization, generic model-security middleware, or a generic AI policy engine part of this product boundary. Provider/model behavior is not relied on to protect AAAAT's local data or decide what AAAAT stores.

AI/provider output is ordinary input to a bounded operation. Before AAAAT stores it, it follows that operation's normal value-shape and conflict rules; this prevents accidental corruption, not a special AI governance process. There is no universal requirement that every valid AI result pass through a human-approval queue.

Privacy projection is a separate product capability. An operation may expose a value, omit it, or locally replace/tokenize it when consistent reference is useful without disclosing the authoritative literal. The authoritative literal remains local, and AAAAT restores it locally only where that operation requires restoration or final rendering. This validated v1 convenience/privacy use case does not give AI a special role in deciding what AAAAT stores and does not turn token syntax, generation, collision handling, or restoration mechanics into architectural security requirements.

The operation model is:

```text
bounded operation → validated result → operation-specific mutation/conflict policy → normal application service
```

Some operations are proposal-only, including cases where an existing authoritative value must not be replaced without explicit acceptance. Others may apply a valid bounded result directly when their defined policy permits it. Neither case creates a universal workflow or approval queue.

## 17. AI-native configuration without hard-coded clutter

AAAAT's core should not hard-code every provider-specific capability, suggested field, recommended layout or AI-dependent convenience into the application.

`installer.ai` / `configuration.ai` and the shared structured setup harness are important because they can understand the user's actual environment and preferences.

That environment may include:

- no AI;
- local model runtimes;
- remote providers;
- several simultaneous AI connections;
- external AI applications with different tool/skill/plugin mechanisms;
- different research capabilities;
- preferences obtained through normal configuration or conversation.

The configuration layer may help determine or suggest:

- which AI operations are actually available;
- which connection is appropriate for an operation;
- host-specific integration artifacts;
- useful field definitions or optional field sets;
- useful Focus defaults/presentation;
- other conveniences appropriate to that user's setup.

This adaptability must produce explicit local configuration/defaults consumed by AAAAT. It must not silently and opaquely reshape authoritative user data or make hidden career decisions.

Suggestions/defaults remain editable and optional.

The baseline product remains coherent when no AI configuration exists.

## 18. installer.ai / configuration.ai

Installation and configuration are product infrastructure.

The same structured knowledge should drive, where practical:

- graphical setup;
- `installer.ai`;
- `configuration.ai`;
- AI-assisted setup;
- provider/host-specific generated integration artifacts.

Setup should incrementally cover:

- workspace configuration;
- LaTeX detection and installation guidance;
- VCVGenerator validation;
- one or more AI connections;
- capability validation;
- external-AI integration artifacts where useful;
- relevant user preferences;
- configuration import/export;
- backup/recovery.

Known working environments should be detected and reused rather than replaced.

A normal user should not need to understand JSON, MCP, ports, shell commands or provider internals for ordinary use.

## 19. Multiple AI connections

Multiple AI connections may coexist and are an intended capability.

Different connections may provide different operations.

The user may choose a connection for an operation, and configuration may provide useful defaults.

No provider is assumed to support everything.

This requirement does not justify a generic provider marketplace or plugin platform.

## 20. Research is different from ordinary inference

Operations requiring current external research need an actual research-capable route.

If the selected connection cannot research the web, AAAAT must not label ordinary model recall as current research.

Research may come from:

- the user;
- a research-capable configured connection;
- a bounded external AI capable of research.

Retained research is editable AAAAT information and should preserve useful source/provenance information where available.

## 21. Cross-candidature retrieval and analysis

AAAAT becomes more useful as it accumulates a private local corpus.

The user must be able to search/filter/retrieve candidatures.

AAAAT may support selected multi-candidature summarization, comparison or filtering with AI.

When a remote AI operation would expose a broad and highly profilable set of career/application information, the privacy implications must be made clear before sending it.

AAAAT does not need to choose the user's "best" life decision in order to make comparison useful.

## 22. External AI is a real entrance into AAAAT

External AI applications may use bounded AAAAT capabilities through demonstrated host mechanisms such as official MCP, commands, skills/tools/plugins or other appropriate integrations.

Copy/paste may exist as a fallback, not the desired normal experience.

AAAAT offers an external host only the specific product tasks it deliberately provides for that integration. An external process does not receive a general CRUD endpoint, record-listing/search/query surface, generic entity-ID interface, or a way to scrape AAAAT data at will. Each provided task has the smallest useful input and output for its purpose and uses AAAAT's normal local application-service behavior. This is a fixed, product-specific operation surface, not a generic task queue or external data API.

Bounded capabilities may support real workflows such as:

- create/enrich a candidature;
- read explicitly scoped candidature information;
- obtain privacy-projected professional information;
- find relevant existing documents/material;
- contribute field values or concepts;
- create document material;
- request rendering.

External AI must not receive arbitrary database, filesystem, shell, process, repository access, or unbounded data-query capability merely for convenience.

Durable changes ultimately use the same AAAAT application services as manual UI changes.

Sources remain explicit retained domain objects. They must not be implicitly dumped into unrelated AI operations, but they may be supplied when an operation deliberately requires and scopes them and the operation's privacy/context rules permit it.

AAAAT controls the data and capabilities exposed to an external AI; it does not attempt to secure or govern that external system's internal reasoning.

## 23. Privacy

AAAAT's local workspace is authoritative.

Privacy projection occurs before information is sent to AI.

Normal user-facing fields can be independently controlled for AI exposure.

Depending on field and operation, information may be:

- exposed;
- omitted;
- tokenized/replaced where appropriate.

Authoritative real data remains local and may be restored at the final local step, including document rendering.

Tokenization/replacement is a privacy and convenience capability, not the domain-security boundary. Its concrete placeholder syntax, generation strategy, and restoration mechanism may evolve as long as the operation preserves the configured disclosure and local-restoration behavior.

AI visibility and Focus visibility are independent.

AAAAT cannot promise application-level privacy from an external agent already granted unrestricted screen/filesystem/shell access; configuration should represent that limitation honestly.

## 24. Local ownership, portability and recovery

AAAAT remains a local-first desktop application with a user-owned authoritative workspace.

The product includes:

- local SQLite/workspace data;
- local artifacts;
- portable LaTeX;
- backup;
- restore;
- configuration portability/import/export.

Generated LaTeX projects belong to the user and remain usable outside AAAAT.

No mandatory cloud service is required.

## 25. What v1 teaches us

AAAAT v1 was a failed implementation and successful discovery prototype.

Validated product lessons worth preserving include:

- raw-first opportunity capture;
- sparse/incomplete candidatures;
- fast configurable Focus;
- complete editable information access;
- common user control over field presentation/privacy;
- shared concepts/keywords;
- lightweight ToDos;
- retention of application material;
- local ownership/privacy principles.

A welcome/home dashboard is not a core AAAAT requirement. It may be designed later if useful, but historical v1 dashboard ideas do not establish required product structure.

Do not resurrect merely because v1 had them:

- Python/wx architecture;
- v1 SQLite schema;
- large fixed candidature field catalogue;
- field-specific AI machinery;
- agent task/capability queues;
- agent workflow state machines;
- watched folders;
- tagged chat envelopes;
- handwritten MCP/JSON-RPC;
- browser/FastAPI architecture;
- external-host-first inference;
- mandatory lifecycle logic;
- old `userView` or Smart/Detailed widget architecture.

Preserve the product lesson, not the old mechanism.

## 26. Normative examples

These examples are part of the product intent because they show that AAAAT supports different amounts of effort and different available tooling.

### Manual-only

The user manually creates and edits whatever candidature information they want and creates/renders documents. No AI is configured.

### Raw-only

The user saves a full offer, recruiter message or URL and does nothing else. The candidature is valid and retrievable.

### Mixed manual + AI

The user pastes an offer, asks AI to extract useful information, edits some results manually and adds other values themselves.

### Quick application

The user stores a reference, creates/tailors a CV, writes the letter manually, renders both and sends them without completing unrelated information.

### Unexpected call

Weeks later, a recruiter calls. The user finds the candidature quickly and Focus fills the available screen with the information that user configured as useful.

### User-requested AI opinion

The user asks an available AI what it thinks about an opportunity. AAAAT may offer that operation because a suitable connection exists. The result is optional editable information, not a mandatory workflow or authoritative decision.

### External-AI entry

The user is already discussing an opportunity in another AI tool. That tool uses bounded AAAAT capabilities to save/enrich information or work with relevant existing material.

### Standalone VCVGenerator

The user opens AAAAT only to edit and render a CV. No candidature and no AI are required.

### Different AI installations

A user with no AI gets a coherent complete manual product.

A user with one local model gets operations that model reliably supports.

A user with several AI services/external AI hosts can configure those capabilities without AAAAT turning into a provider marketplace.

## 27. Anti-drift interpretation

Do not add a product requirement because:

- conventional job trackers have it;
- an LLM commonly recommends it;
- v1 implemented it;
- it makes a schema symmetrical;
- it makes a Mission easy to test;
- existing code already contains it.

Do not remove or weaken a requirement because:

- it has not yet been implemented;
- it is uncommon in commercial trackers;
- a simpler CRUD product would omit it;
- it depends on optional AI capability;
- another architecture would be easier.

Do not convert "not fundamental" into "forbidden".

Do not convert "supported" into "mandatory".

The stable product rule is:

> AAAAT should make career/application information and artifacts convenient, flexible, private and reusable while leaving the user free to use as much or as little structure and assistance as they find useful.
