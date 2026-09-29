# AAAAT Product Definition

Status: **canonical product authority below current explicit Product Owner instruction.**

Historical requirements, Issues, PRs, ADRs, tests and implementations are evidence only. They do not override this document merely because they are newer, more formal or already implemented.

## Northstar

AAAAT is an **open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them**.

The software is local-first and the user's career/application data remains user-owned. The product is not defined by one AI provider, model, host, protocol or transport. It supports human operation, AI assistance initiated from AAAAT, and bounded AAAAT operations initiated from external AI/tools as peer ways to work with the same product.

AAAAT exists to reduce friction around applications: less typing, repeated organization, searching, context switching and reconstruction of CV/cover-letter/application material.

It must stay understandable to ordinary users and maintainable by one developer. Product quality comes from coherent workflows, clear ownership and small explicit architecture—not from enterprise ceremony, generic frameworks or a large integration platform.

## Three interaction directions

AAAAT supports three equally legitimate directions.

### Human → AAAAT

Every essential capability is usable through a coherent graphical interface without JSON, shell commands, protocol knowledge or mandatory AI.

Sparse information is normal. The UI should avoid forcing large empty forms or making incomplete records feel broken. Progressive disclosure and sensible defaults should keep ordinary work direct.

### AAAAT → AI

When the user asks for AI assistance inside AAAAT, AAAAT owns the local product experience: it chooses/configures the intended route, prepares only the allowed context, invokes the configured intelligence, validates the result and presents it for useful review/editing.

AI is optional. Manual/no-AI operation remains complete.

### AI → AAAAT

An external AI/tool may initiate supported AAAAT operations through an appropriate integration when that produces a useful, reliable experience.

MCP, APIs, skills/plugins, commands, browser/desktop bridges, controlled files and copy/paste are possible carriers. They are not product identity and they do not justify a generic plugin/orchestration framework.

External capabilities remain bounded to meaningful AAAAT intentions. They do not gain arbitrary database, filesystem, shell or generic CRUD authority merely because an AI is involved.

## Product boundary

AAAAT's application is a private local career/application workspace containing candidature information, reusable professional information, Sources, Tags and application documents/artifacts.

AAAAT is not:

- a job-discovery engine;
- an applicant-tracking CRM or lifecycle manager;
- a status/priority/next-action workflow product;
- a reminder/task-management system;
- a generic database or knowledge-management system;
- an AI/chat destination;
- an AI provider marketplace;
- an agent orchestration platform.

The user may discover opportunities manually, through websites, recruiters, another AI or another tool. AAAAT begins wherever useful application material or a bounded operation reaches it.

## No canonical journey

These are peer intentions, not stages of one required workflow:

- find and recall an application quickly;
- create an application by filling useful information directly;
- retain raw application material with minimal friction;
- fully inspect or edit an application;
- maintain reusable professional information;
- create/edit/render CVs or cover letters independently;
- create/edit/render application documents in candidature context;
- use configured AI for a bounded operation;
- use AAAAT from an external AI/tool;
- configure, protect, back up and integrate the local workspace.

Navigation and architecture must not force these intentions into a wizard or lifecycle.

## Applications / candidatures

A candidature is the user-owned container for useful information about one opportunity/application context.

It may contain only raw text, a URL, one note, one field, several Sources, many fields, Tags, documents or retained application artifacts. Sparse records are valid. Missing structure is not debt or workflow failure.

AAAAT does not require status, priority, stage, next action or completeness maintenance.

### Creating a candidature

`New candidature` supports two direct approaches because both are normal:

1. **Fill fields directly** — conventional information entry when the user already knows what they want to retain.
2. **Paste raw material** — retain an offer, recruiter message, copied page, URL-containing text, notes or fragments first.

Neither is the canonical route.

The raw path can be as small as:

```text
paste raw material
→ retain Source
```

After retention, the product should make both continuations clear:

- use configured AI to propose information from that Source; and
- fill/edit the candidature manually while keeping the retained Source readily visible.

Retaining the Source is already successful work even if the user does nothing else.

## Sources

Original retained material is first-class and remains independently useful.

A Source may contain job postings, recruiter messages, URLs, application forms, conversation material, copied website content, user research, notes or fragments.

Extraction, summarization or AI assistance never replaces the Source.

## Flexible information

AAAAT must retain useful information the developer did not predict.

Common fields such as organisation, role, compensation, location or recruiter are defaults, not a closed ontology. The candidature field system is user-maintainable product data: users can add and edit field definitions while ordinary value editing stays simple.

The ordinary mental model is:

> I want to keep this information.

not:

> I want to administer a schema.

Different professions and searches need different fields. Code/schema changes must not be required merely because the user has legitimate information outside the shipped defaults.

Configured AI extraction works against the user's current field set rather than a hidden developer-controlled ontology.

## Retrieval and presentation

Applications should be easy to recognize and recover under time pressure.

The same user-maintainable information drives compact corpus recognition and richer selected-application detail. Users can choose favourite/primary information, order and presentation prominence without creating a second candidature model.

AAAAT does not assign semantic identity to fields because of their label or system key. A candidature's durable identity is its internal record identity; human-readable presentation is composed transiently from useful retained information.

Selecting an application should expose progressively richer information rather than forcing the user through duplicate near-identical product modes. Displayed information keeps low-friction editing so corrections can be made during a call without leaving the current task.

## Tags

Use **Tags** as the product/domain term.

A Tag may have a canonical term, aliases, definition and user notes. Tags are reusable across applications and act as a lightweight shared glossary plus retrieval aid.

Applications associate with shared Tags; they do not own independent copies of Tag definitions.

Tag interaction must scale without dumping the full glossary into ordinary application work. Search/autocomplete, attach/create and contextual definition display are appropriate; ontology/knowledge-graph architecture is not.

Optional AI may match existing Tags or propose new ones, but new shared Tag data remains reviewable before becoming durable workspace state.

## Notes and lightweight reminders

Small candidature-attached notes or checkable reminders may be useful secondary information.

They are not a product pillar and do not justify global task management, scheduling, recurrence, lifecycle state, automatic next actions or AI planning.

## Reusable professional information

AAAAT maintains reusable professional information: identity/contact material, experience, education, projects, skills, certifications, languages, links, summaries and other useful career material.

Common groups are defaults, not a closed taxonomy.

Saved variations may express reusable alternate wording/emphasis. Document-specific differences may intentionally diverge from reusable information. Neither should create cloned competing identities or force users to understand patch/rule machinery.

Reusable professional-information items and candidature information may expose one understandable choice such as **AI may use this information**. Local storage, local presentation and external AI disclosure remain separate concerns.

This definition does not infer privacy semantics from field labels, kinds, system keys or other mutable implementation metadata. Default choices are implementation/product-detail decisions only when separately supported by Product Owner authority.

## VCVGenerator / application artifacts

VCVGenerator/document work is independently core, not an extension of candidature tracking.

A valid session can simply be:

```text
open AAAAT
→ create/edit CV or cover letter
→ render/export
→ leave
```

No candidature and no AI are required.

The same document system also works in candidature context so application-specific material is easy to create, find and reuse.

Document concepts remain distinct:

- **My information** — reusable professional information;
- **Profile variant** — saved alternate wording/emphasis for reusable information;
- **CV template** — reusable ordered content/composition;
- **Working CV** — one editable CV composition;
- **Rendered CV** — generated output plus the content/composition snapshot that produced it;
- **Cover letter** — normally candidature-owned, with standalone use still possible;
- **Application packet** — combined application output where useful.

A CV template is content/composition, not a rendered PDF and not presentation-engine ownership. A Working CV can intentionally diverge from reusable information without silently rewriting it.

Users own editable document content, generated source, rendered output and portable document projects. LaTeX is an implementation technology; user ownership and reproducibility are the durable product requirements.

Multilingual document content is part of the intended document capability. Presentation/layout implementation belongs below this product definition.

## AI inside AAAAT

AAAAT owns no model and no inference. AI is optional intelligence supplied through configured connections.

AAAAT is provider- and runtime-agnostic. No provider, protocol, runtime, model family or vendor is product authority. Affordable/local/lightweight inference is an important target, so product correctness should not require premium hosted-model capabilities.

AI belongs beside the domain action it assists: extract information from this Source, help populate this field, explain/translate/rewrite text, tailor this CV, draft this letter, analyse application material, or perform another bounded useful task.

The AI path should minimize unnecessary model burden through compact context/instructions, simple response shapes, local validation and useful partial-result salvage.

AI output becomes ordinary editable AAAAT information or document content through the relevant domain interaction. AAAAT should not silently turn model output into unrelated durable state merely because a route is configured.

## External AI as an entrance

The user may already be working in ChatGPT, Claude, a local model app, an IDE assistant or another environment. That environment may be doing broader work such as research or job discovery before AAAAT is involved.

AAAAT may expose bounded capabilities so the external tool can use or retain AAAAT information without needless re-entry.

`Send to my AI` is the ordinary product interaction for constructing/sending a bounded task from meaningful current context. Task editing, reusable instructions, copy/export, connected routes and returned-result retention may be shared across contexts.

The precise internal transport mechanism—including whether a carrier temporarily or durably records a selected local object—is an implementation detail unless it changes user-visible ownership, privacy or capability authority. Product correctness is the bounded, understandable task/result journey, not a prohibition or requirement for one internal selection mechanism.

## Privacy and local ownership

AAAAT is local-first. Authoritative candidature data, professional information, Tags, Sources, documents, generated source, rendered output and relevant configuration belong to the user.

These remain distinct:

```text
stored locally
shown prominently in the local UI
allowed to a particular AI operation
```

Removing information from primary presentation does not remove it. Hiding information from AI does not hide it locally.

Privacy filtering happens before bounded context leaves AAAAT where AAAAT controls that boundary. An external agent with unrestricted filesystem or screen access is a separate trust decision and cannot be made safe by pretending the provider boundary is stronger than it is.

Privacy controls must be understandable without dominating ordinary work.

## Setup, recovery and integrations

Installation/configuration is product infrastructure, not something ordinary users must solve manually.

First run primarily establishes a usable local workspace. Create/open are normal; restore/recovery is secondary and discoverable.

TeX, AI connections and external-host integration are configured when relevant rather than blocking basic application/document use.

Setup should answer practical user questions instead of exposing MCP, ports, schemas or provider internals. The same underlying setup knowledge may support both guided UI and AI-assisted setup where useful.

Configuration portability and full workspace backup are distinct concerns.

## Product character

AAAAT should feel direct, fast, calm, local, legible, information-efficient, professional and flexible.

At constrained desktop sizes, give the current intention most of the useful space instead of compressing several permanent panes. Scrolling/transition is preferable to clipping or unreadable density.

The visual direction may be distinctive, but decoration must not reduce readability.

## Engineering shape

AAAAT is an open-source personal project maintained by one developer with AI assistance.

Architecture should prefer:

- clean explicit boundaries;
- small abstractions;
- minimal runtime dependencies;
- direct vertical slices that leave useful behavior;
- typed validation and narrow privileged boundaries;
- no speculative framework, registry, plugin system, workflow engine or compatibility programme.

Implementation history is not product authority. Before a real-use compatibility baseline exists, wrong development representations should be corrected directly rather than preserved through migration ceremony.

## Historical interpretation rule

Preserved owner-source material explains provenance and intent. Old implementations, generated Issues/ADRs/tests and prior PLAN states are evidence, not automatic requirements.

When history conflicts, recover the Product Owner intention first. Preserve proven implementation only where it remains independently justified by that intention.
