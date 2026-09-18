# AAAAT Product Definition

Status: **canonical product authority below current explicit Product Owner instruction.**

Historical requirements, Issues, PRs, ADRs, tests and implementations are evidence only. They do not override this document merely because they are newer, more formal or already implemented.

## Purpose

AAAAT is a private, local workspace for candidature information, reusable professional information, and application documents/artifacts. Its purpose is convenience: reduce typing, repeated organization, searching, tool switching and friction around job applications and CV/cover-letter work.

AAAAT is not a job-discovery engine, applicant-tracking CRM, lifecycle/workflow manager, reminder product, generic database, knowledge-management system, AI platform, chatbot or agent orchestrator.

The user may find opportunities manually, through websites, recruiters, another AI system, or another tool. AAAAT does not own that preceding process. It can nevertheless be entered from any of those contexts when useful material or a bounded operation reaches it.

## No canonical journey

AAAAT supports several direct intentions. None is the mandatory entrance to the others:

- find and recall a candidature quickly;
- create a candidature by filling useful fields directly;
- capture new/raw candidature material with minimal effort;
- fully inspect or edit a candidature;
- create/edit/render CVs or cover letters without a candidature;
- create/edit/render CVs or cover letters in candidature context;
- maintain reusable professional information;
- use optional configured AI for a bounded contextual operation;
- receive bounded operations from an external AI/tool;
- configure, protect, back up or integrate the local workspace.

Navigation and architecture must not force these intentions into one lifecycle or wizard.

## Candidatures

A candidature is the user-owned container for whatever information is useful about one opportunity/application context.

A candidature may contain only raw text, only a URL, one note, one field, several Sources, many fields, Tags, documents or retained application artifacts. Sparse data is normal and valid. Missing structure is not debt, incompleteness or a workflow error.

AAAAT must never require the user to maintain status, priority, next action, stage, completeness or another lifecycle concept for a candidature to remain useful.

## Creating a candidature without forcing one style of work

`New candidature` must support two direct approaches because both are normal:

1. **Fill fields directly** — for users who already know the useful information and prefer a conventional field-by-field entry surface.
2. **Paste raw material** — for users who want to retain an offer, recruiter message, copied page, URL-containing text, notes or fragments first and structure it afterward.

Neither approach is more authoritative than the other.

The raw-material path can be as small as:

```text
Paste raw material
→ retain it as a Source
```

After that paste/retention step, the same view must make two continuations explicit at the same time:

- **send the retained material to a configured AI** to propose values for the currently defined candidature fields; and
- **fill the candidature manually**, opening the retained raw Source beside the candidature fields so the user can copy/enter information with minimal switching.

There is no intermediate generic “structure this candidature” step hiding those choices. The user should be able to see that one action uses AI and the other is manual.

If no AI is configured, the manual side-by-side path remains complete. Future deterministic or embedded extraction of obvious values such as company, role or salary may further reduce effort, but that is an optional enhancement rather than a prerequisite or a reason to remove the manual path.

Raw offer text, recruiter text, copied web content, a URL embedded in text, form material, conversation material or fragments are all valid input. The user should not need to classify the material before retaining it.

Retaining the raw material is already a successful operation even if the user does nothing else.

## Sources

Original retained material is first-class and remains independently useful.

A Source can contain job postings, recruiter messages, URLs, application forms, conversation text, copied website material, user research, notes or other retained inputs.

Extraction or summarization never replaces the Source. Sources remain searchable, readable and candidature-owned.

## Flexible information, shipped defaults

AAAAT must retain useful information that was not predicted by the developer. Different opportunities and professions require different information.

AAAAT may ship common field definitions and labels such as company, role, salary, location, recruiter or similar values. These are useful defaults, not a permanent closed ontology.

The candidature field system is **user-maintainable product data**. The user must be able to add and edit field definitions rather than being restricted to developer-shipped fields or a text-only escape hatch. Field-definition controls can be progressively disclosed so ordinary value editing stays simple, but the capability itself is not optional product direction.

This matters because useful fields can differ radically by profession or search. A pilot may care about flight hours, aircraft type, licences or domestic/international operation; a software engineer may care about stack, remote policy or architecture; a script writer may care about format, genre, production context or rights. AAAAT must not encode one profession's ontology as universal.

Configured AI extraction also works against the user's current field set. Therefore users must be able to shape that field set: changing which fields exist changes what information AAAAT can sensibly ask an AI to extract or help populate.

The ordinary mental model is:

> I want to keep this information.

Not:

> I want to administer a schema.

Database-style field IDs, cardinality, schema concepts and type machinery must remain secondary/advanced implementation detail even though the user can manage the resulting information definitions.

## Rapid candidature retrieval and progressive detail

The user should not need to learn a separate “Focus” product mode in order to understand candidature information.

The Applications surface presents each candidature as one configurable information object. The same user-maintainable candidature fields drive compact corpus recognition and the richer selected-candidature view.

A field can be marked as a **favourite** presentation field. Favourite fields appear first, in user-controlled order, and may use a user-controlled presentation prominence.

AAAAT does not decide which candidature fields are important. Shipped field definitions such as Role, Organisation, Location or Compensation are conveniences only; they receive no identity or semantic priority because of their names or system keys. Neutral first use must still be immediately legible: enabled fields begin included equally in the primary presentation with ordinary presentation size, rather than leaving candidature cards blank until the user configures favourites. The user then demotes/unfavourites, reorders and resizes fields according to their own workflow.

A candidature has no semantic identity assembled from its fields. Its durable identity is its internal record ID only. There is no `identityOrder` product concept and no derived domain label made from Role, Organisation, Source title or any other retained value.

When the local UI needs a compact human reference, it composes a transient presentation from the primary/favourite fields. That presentation is not stored as candidature data, is not searchable as an extra hidden value, and must never cross an AI/privacy/external boundary as a substitute for the underlying explicitly permitted fields. A neutral fallback is only for genuinely sparse records with no retained displayable values; retained candidature information must not be hidden behind an unexplained “Saved application” placeholder.

Corpus presentation must stay compact, recognisable and information-efficient. It should be an actual configurable information grid, not a generic list of label/value text lines. Presentation size belongs to this corpus/summary presentation: compact, normal and wide fields must visibly change their span/emphasis there. Editing surfaces remain content-driven and must not become larger merely because a field is wide in the corpus. Values carry the visual emphasis; labels and update metadata are secondary. One long value must not make unrelated candidature cards unnecessarily large. Search may show a bounded Source or Tag excerpt when it explains an active match, but that evidence is temporary and is not an implicit normal field.

Selecting a candidature expands the same information surface instead of switching to a second near-duplicate screen. Favourite fields remain immediately visible. A compact **More** / advanced disclosure reveals the remaining enabled fields and deeper candidature-owned material when needed.

The ordinary control for this is direct and local: a star/favourite affordance on a field moves it immediately into or out of the primary set. Deeper ordering or presentation controls may be progressively disclosed, but the user should not have to open a separate “Choose Focus information” configuration screen to understand the model.

Displayed editable fields keep low-friction edit affordances. During a call the user must be able to correct a value or add useful information without navigating to another conceptual mode.

## Complete candidature work

Complete candidature work is the expanded state of the same selected-candidature surface, not a duplicate peer view.

It exposes the rest of the candidature-owned information progressively: all enabled fields, Sources/raw material, Tags, linked application material, retained artifacts, relevant privacy/presentation controls, and secondary notes/reminders or provenance where useful.

The user can still open a candidature directly for deliberate maintenance. Populated information is primarily readable; editing/addition happens close to the value; field-definition management and deeper machinery remain progressively disclosed.

## Tags

## Tags

Use **Tags** consistently as the product/domain term.

A Tag can have a canonical term, aliases, definition and user notes. Tags are reusable across candidatures and act as a lightweight shared glossary/wiki plus retrieval aid.

Example: if a candidature uses `Spring Boot`, selected Focus can expose the stored Spring Boot definition without forcing the user into a separate knowledge-management workspace.

A competing `Concepts` product vocabulary is not justified. Historical `Concept` code/schema names are implementation evidence to reconcile, not product meaning.

Applications contain associations to shared Tags. They never own independent copies of Tag definitions. Attaching a Tag therefore changes only the candidature-to-Tag association; editing the Tag changes the one shared canonical name/aliases/definition/notes seen wherever it is attached.

Tag interaction must scale to a large glossary. Ordinary candidature work shows only attached Tags plus compact search/autocomplete for attaching an existing Tag and a create-new path when no match exists. It must never render the complete glossary as a permanent checkbox/button selection list.

Optional AI extraction may use the existing Tag glossary as bounded context. It may match existing Tags or propose new candidates, but every new candidate needs a proposed definition and remains reviewable before it becomes shared workspace data.

## Notes and lightweight reminders

Small candidature-attached notes or checkable reminders may be useful secondary information.

They are not a product pillar and do not justify task management, scheduling, recurrence, lifecycle state, automatic next actions, AI planning, global reminder navigation, or prominence in Focus by default.

The user can ignore them completely without losing the core AAAAT experience.

## Professional information

AAAAT maintains reusable professional information about the user: identity/contact material, experience, education, projects, skills, certifications, languages, links, summaries and any other useful career material.

Common categories are defaults, not a closed taxonomy.

The ordinary product concept is:

> my reusable professional information

not internal profile architecture.

Saved variations may express reusable alternate emphasis. Document-specific differences may intentionally diverge from the reusable information. Neither should create cloned competing identities or force the user to understand patch/rule machinery for normal use.

Every reusable professional-information item has one ordinary AI visibility choice: **AI may use this information**. The same meaning applies to candidature fields. When enabled, an empty candidature field may be requested during Source extraction and a populated value may be disclosed as bounded context; when disabled, it is neither requested nor disclosed. Internal implementation may separate mechanics only where a demonstrated product behavior requires it; ordinary UI and durable product meaning remain one user choice.

## CV templates, working CVs and rendered artifacts

Document concepts are intentionally distinct:

- **My information** is the reusable career record.
- **Profile variant** is saved alternative wording/emphasis for reusable career information.
- **CV template** is a reusable ordered composition of sections and selected information.
- **Working CV** is one editable CV derived from a template, a candidature, My information, or a blank start.
- **Rendered CV** is a generated PDF plus the content/composition snapshot that produced it.
- **Cover letter** is normally owned by one candidature.
- **Application packet** is a generated CV plus cover letter combination.

A CV template is not a rendered CV and a PDF is not a template section. A template owns ordered sections; section names/order; selected/reordered reusable profile items; optional custom content; and, per item, a source mode of current My information, a saved profile variant, or a template-specific override. Common structures such as Profile, Experience, Projects/Selected work, Education, Skills, Languages and Links are useful section defaults, not a closed template ontology.

Excluding an item from a template never removes it from My information. A profile-loaded template item follows the current reusable value. A template-specific override never mutates My information automatically. A working-document override never mutates the template or My information automatically. Where an edited value creates a real ownership decision, explicit contextual actions may save it to the template, save a new template, save a profile variant, or update My information.

Rendering is an action on current working composition. It creates a separate artifact record containing the generated output and enough content/composition snapshot to inspect, duplicate, or reproduce that rendered CV. A rendered artifact may reference the template it came from but does not require a saved template relationship; unsaved document-specific changes can be rendered without silently changing reusable state.

Letters remain discoverable in the document collection, but a letter created from a candidature is candidature-owned and must surface there immediately. The existing combined CV+letter behavior is an Application packet when its semantics match this meaning; AAAAT does not need a second packet engine.

## VCVGenerator / CVs and letters

CV/cover-letter work is independently core.

A cover letter normally belongs to one candidature and should be created, found and edited from that candidature. Reusable CVs have a direct collection because one CV may serve several candidatures. Standalone cover-letter work remains possible, but it is a secondary exception rather than a peer global collection.

A valid AAAAT session is simply:

```text
open AAAAT
→ create/edit CV or cover letter
→ render/export
→ leave
```

No candidature and no AI are required.

The same document system can also be entered in candidature context. A candidature can expose the working CVs/letters and exact retained application artifacts that belong to it without creating a separate candidature-only document engine.

Users own editable document content, generated source, rendered output and portable document projects. LaTeX is an implementation technology; user ownership is the durable requirement.

## AI inside AAAAT

AAAAT owns no model and no inference. AI is optional intelligence supplied through configured connections.

AAAAT's primary direct-AI target is affordable, resource-constrained inference that users can run or obtain without depending on premium hosted tiers. Local/lightweight models are central to that target, but AAAAT remains provider- and runtime-agnostic: no provider, protocol, runtime, model family or vendor is product authority. The current OpenAI-compatible adapter is an implementation path, not the product baseline. Larger hosted models may work better, but product correctness, extraction usefulness, prompt design and response contracts must not depend on capabilities that effectively require them.

The AI path should therefore minimize model burden: compact context, compact instructions, simple provider-facing response shapes, tolerant recovery, and local validation after inference. A partially correct local-model response is useful when its valid facts can be retained safely. One invalid or missing proposal must not discard unrelated valid proposals. Provider-side JSON-Schema constraints are used only when they are broadly compatible with the supported local runtime; validation that AAAAT can perform deterministically belongs in AAAAT rather than in model decoding.

AI belongs beside the domain action it assists: extract information from this Source into the currently defined candidature fields, help populate this field, explain/translate/rewrite this text, tailor this CV, draft this letter, perform genuine research when the chosen connection supports it, or similar bounded work.

AAAAT must not create an AI destination/chat product, opportunity-ranking system, adviser workflow, provider marketplace, policy framework or generic orchestration layer.

Manual/no-AI use remains complete. Accepted AI output becomes ordinary editable AAAAT information or document content.

## External AI is a legitimate entrance

The user may already be working in ChatGPT, Claude, a local model application, an IDE assistant or another external environment. That environment may itself be doing broader work, including research or job discovery.

AAAAT may expose bounded domain capabilities through suitable integrations so the external tool can retain or use AAAAT information without manual re-entry.

Transport does not define product meaning. MCP, plugins, skills, commands, local APIs or other demonstrated bridges are mechanisms only.

External capabilities are task-scoped. AAAAT must not grant arbitrary database, filesystem, shell or generic CRUD authority merely because an AI integration exists.

## Privacy and local ownership

AAAAT is local-first. The authoritative candidature data, professional information, Tags, Sources, documents, generated source, rendered output and relevant configuration belong to the user.

These are separate concerns:

```text
stored locally
shown in Focus
allowed to a particular AI operation
```

Hiding something from Focus does not remove it. Hiding something from AI does not hide it locally. External disclosure is evaluated per bounded operation and should expose only justified information in the least identifying useful form.

Privacy controls must be understandable but must not dominate ordinary work.

## Setup, recovery and integrations

First run primarily establishes a usable local workspace. Create/open are normal; restore/recovery is secondary and discoverable.

TeX, AI connections and external-host integration are configured when relevant, not as prerequisites to basic candidature/document use.

Setup should answer practical user questions rather than expose MCP, ports, schemas, provider internals or other implementation vocabulary.

Configuration portability and full workspace backup are distinct concerns.

## Product character

AAAAT should feel direct, fast, calm, local, legible, stable, information-efficient, professional and flexible.

At constrained desktop sizes, give the current intention most of the available space instead of compressing several persistent panes. Scrolling/transition is preferable to clipping or unreadable multi-column density.

The visual direction may be distinctive, but decoration must never reduce readability or Focus clarity.

## Explicit non-goals

Do not derive product work from familiar industry patterns. In particular, AAAAT does not require:

- job discovery as a native core workflow;
- candidature lifecycle/stage management;
- status/priority/next-action maintenance;
- completeness scoring;
- opportunity ranking or automatic advice;
- reminder/task-management architecture;
- a general AI/chat workspace;
- a generic document warehouse;
- a generic knowledge-management workspace;
- a dashboard/widget framework;
- production/enterprise compatibility ceremony before a real baseline exists;
- generic provider, permission, policy or orchestration frameworks.

## Historical interpretation rule

Old Smart View, Detailed View, User View, `Concepts`, reminder-heavy Focus, migration-era architecture and other implemented/generated designs may contain evidence of underlying needs but are not reusable solutions by default.

When history conflicts, recover the user intention and preserve only what remains independently justified by this product definition and current explicit Product Owner instruction.
