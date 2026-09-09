# AAAAT Product Definition

## Purpose

AAAAT is a private, local job-search workspace and application-document tool. Its purpose is convenience.

Job-search information arrives fragmented across job advertisements, recruiter messages, URLs, application forms, conversations, notes, AI chats, CV files and cover letters. The same information then has to be found, reorganized, copied, rewritten and reused repeatedly.

AAAAT exists to reduce that work. It should reduce clicks, typing, repetition, searching, tool switching and required learning.

AAAAT is a domain application for job searching. It is not a chatbot, career adviser, CRM, workflow engine, generic database, knowledge-management platform or AI orchestration product.

## Core product model

AAAAT has two primary working concerns:

1. job opportunities and candidatures;
2. professional information and application documents.

They interact but remain independently useful.

```text
AAAAT
├── Candidatures
│   ├── original Sources
│   ├── useful candidature information
│   ├── shared Concepts
│   ├── notes / lightweight reminders where useful
│   └── application material
├── Professional information
│   └── reusable information about the user
└── VCVGenerator
    ├── CVs
    ├── cover letters
    └── combined application documents
```

AI is not another product branch. It is optional intelligence that may assist suitable operations or access AAAAT from an external AI application.

## Candidatures

A candidature represents one job opportunity or application context. It is primarily a container for whatever information the user finds useful about that opportunity.

A candidature may be extremely sparse or extensively developed. Valid examples include only a recruiter message, only a URL, a pasted advertisement, a company name plus one note, or a mature application with several Sources, notes, concepts and documents.

No particular amount of structure makes one more valid than another. Company, role, status, priority, dates or other familiar values may be useful but do not define candidature validity.

AAAAT must never force the user to organize information merely so the application will accept it.

## Capture with almost no effort

One of AAAAT's most important jobs is accepting information before the user has organized it.

A normal capture may be as small as:

```text
New candidature
→ paste whatever I have
→ save
```

The supplied material may later be structured manually, automatically or not at all.

Missing information is normal. It is not an error, completeness problem or unfinished workflow.

AAAAT must not become a large static form that implicitly asks the user to maintain every possible property of every application.

## Sources are first-class

Original material has independent value and remains retrievable.

Sources may include job advertisements, recruiter messages, URLs, application forms, copied website content, conversation material, user research, notes and other relevant text.

A Source represents what was received or retained. Structured candidature information represents what AAAAT or the user currently wants to know or remember about it.

Extraction never replaces the Source.

Sources should be searchable, readable and associated with their candidature.

## Information, not schema administration

AAAAT must retain useful candidature information that was not predicted by the developer. Different jobs and professions naturally require different information.

For example:

```text
software role
- technologies
- on-call expectations
- security clearance
```

```text
pilot role
- base
- fleet
- type rating
- minimum flight hours
- roster
```

The durable requirement is:

> AAAAT must allow useful information to evolve without requiring a new product feature for every new concept.

This does not mean ordinary users should administer database-style fields.

The user's mental model is:

> I want to keep this information.

Not:

> I want to define a field.

A technical field/value representation may exist internally, but schema, types, cardinality, identifiers and field-management machinery must not become the primary UX.

## Common behavior of normal information

Normal candidature information should behave consistently wherever sensible. The user should ordinarily be able to read, add, edit, remove or clear, search or retrieve it, decide whether it participates in Focus, and decide whether it may be exposed to AI where relevant.

Information entered manually and information produced through automation are not separate product data classes. After accepted processing, both are ordinary editable AAAAT information.

## Human input and assisted input are peers

AAAAT must work completely without AI. That does not mean manual typing is the preferred path.

The product should favor whichever interaction removes unnecessary work.

Example:

```text
User pastes job offer
```

Without AI:

```text
retain Source
→ user may copy/edit useful information manually
```

With suitable AI:

```text
retain Source
→ extract useful information
→ populate ordinary editable candidature information
```

The user should not need to formulate prompts such as “extract company, role, salary and location”. They performed an AAAAT domain action: paste a job offer.

If optional intelligence can perform useful extraction reliably, AAAAT should use it as part of that action.

## AAAAT is not an AI chat interface

AAAAT does not need a general conversation surface and should not require prompt-writing for ordinary product operations.

The AAAAT → AI relationship is:

```text
user performs domain action
        ↓
AAAAT determines whether useful intelligence is available
        ↓
bounded processing
        ↓
ordinary AAAAT result
```

Examples may include extracting information, summarizing retained material, explaining a concept, transforming text, drafting a document or adapting document content.

The user operates AAAAT. They should not need to operate another embedded AI product inside it.

## External AI is a legitimate alternative entrance

The inverse direction is different. The user may already be working in ChatGPT, Claude, a local model application, an IDE assistant or another AI environment.

AAAAT should expose bounded domain operations through suitable integrations so useful information from that environment can be retained or used without manual re-entry.

The exact bridge may be MCP, skills, plugins, commands, a local API or another demonstrated mechanism. Copy/paste is an acceptable fallback, not the desired normal path.

No one protocol defines AAAAT.

External intelligence must not receive arbitrary database, filesystem, shell or process authority merely for convenience.

## AI should reduce work, not create another workflow

Good examples of optional intelligence include:

```text
pasted offer → extracted candidature information
application form → extracted questions
professional information + candidature → draft cover letter
professional information + candidature → adapted CV content
unknown terminology → explanation
external AI conversation → useful retained AAAAT information
```

The model is an information-processing resource, not the authority controlling AAAAT.

## Advice and judgment

AAAAT does not manage the user's career or choose opportunities for them.

It should not turn candidature management into ranking opportunities, selecting winners, prescribing next actions or defining a required career workflow.

A user may deliberately ask an AI for an opinion about one opportunity. That is legitimate optional assistance, not the core AAAAT relationship.

The durable rule is:

> AAAAT manages the information; the user owns the decisions.

## Cross-candidature work means corpus use

AAAAT becomes more useful as it accumulates candidatures. The user must be able to work effectively across the whole local corpus.

This includes browsing, visual recognition, search, filtering, retrieval, summarization where useful and finding older opportunities quickly.

“Cross-candidature” does not inherently mean pairwise comparison.

A defining example is an unexpected recruiter call:

```text
Recruiter introduces company/role
        ↓
user sees candidatures
        ↓
identifies the relevant one within seconds
```

## Candidature overview

Before one candidature is selected, the product needs an effective corpus overview.

The exact visual mechanism is open: list, cards, grid, table or another coherent desktop composition.

The requirement is functional:

> Multiple candidatures must be recognizable at once with enough relevant information to find the desired one quickly.

A summary should expose enough information for identification, not become a miniature complete editor.

Search and filtering must help when the user remembers only fragments from the opportunity or its retained Sources.

## Focus

Focus is one of AAAAT's defining capabilities. Its purpose is fast contextual recall, especially during an unexpected recruiter or interview call.

The user may be listening, speaking, nervous, taking notes and searching memory at the same time. Focus therefore optimizes for divided attention.

Its goal is:

```text
find candidature
→ recognize it
→ immediately recover useful context
```

Focus is a projection of stored information, not a second data model.

Potential Focus information may include company, role, compensation, location, important offer details, personal notes, useful questions, concerns, concepts, technical definitions, links, recruiter details, application material, Source excerpts or other information the user values.

No fixed list defines Focus.

The user should eventually be able to control suitable properties such as visibility, order and relative prominence/space.

Focus is not a recruiter script, checklist, next-action system, AI coach or preparation workflow.

## Complete candidature access

Fast retrieval does not replace complete information management.

The user also needs a deliberate way to inspect and edit everything AAAAT retains about one candidature: information, Sources, Concepts, associated documents/material and useful secondary metadata.

The complete candidature experience must not become one enormous static form. Use progressive disclosure according to the user's current purpose.

## Views are projections, not product entities

Historical names such as Smart View, Detailed View, Focus and User View have changed meaning and should not themselves define the product.

The durable needs beneath them are:

- corpus overview: find and identify candidatures quickly;
- Focus: rapid recall for one candidature;
- complete candidature work: inspect and edit everything relevant to one opportunity.

These may be implemented as views, modes, transitions, panels or another coherent interface.

## User View

A configurable modular User View was an early legitimate product idea: a user-controlled workspace where visible modules, arrangement and possibly sizing can be customized and retained.

That idea remains potentially useful but is not required for the first complete working AAAAT.

Its later reinterpretation as a user/profile menu was a different concept.

The product should first become coherent and usable. Architecture should not deliberately make a future configurable view impossible, but no dashboard-builder framework is currently required.

## Shared Concepts

AAAAT may retain shared concepts or keywords that recur across candidatures.

A Concept may contain a canonical term, aliases, definition and user notes.

The purpose is to avoid relearning or rewriting the same job-search concepts for every candidature and to make them useful in search and Focus.

AAAAT is not a general knowledge-management system.

## Professional information

AAAAT maintains reusable information about the user: identity/contact information, experience, education, projects, skills, certifications, languages, links, summaries and other useful career material.

Its purpose is avoiding repeated entry and enabling document reuse.

The user-facing concept is:

> my reusable professional information

not internal profile architecture.

## Documents may legitimately differ

A particular CV or cover letter may intentionally differ from general reusable professional information.

The natural model is:

```text
reusable professional information
        ↓
document reuses what is useful
        ↓
document may intentionally specialize or override some content
```

Reusable variants may be valuable for recurring alternate emphasis. Document-specific differences are also legitimate. Neither should create cloned competing identities.

## VCVGenerator

VCVGenerator is independently core.

A valid AAAAT session is simply:

```text
open AAAAT
→ edit/create CV
→ edit/create cover letter
→ render
```

No candidature and no AI are required.

VCVGenerator should support CVs, cover letters, combined output, reusable professional information, document-specific differences, editable content, multilingual content, local rendering, understandable output access and user-owned portable source.

VCVGenerator is not merely a subordinate output step of candidature tracking.

## Application material

Within a candidature, the user needs to understand what material belongs to that opportunity: working CVs, cover letters, combined output, material actually used/sent and other relevant application material.

The candidature supplies context. The document itself remains part of the same VCVGenerator/document system used independently elsewhere.

The user should not have to reconstruct candidature-document relationships manually through a generic document repository.

## Local ownership

AAAAT is local-first. The authoritative state belongs to the user.

This includes candidature information, Sources, reusable professional information, Concepts, documents, generated source, rendered output and relevant configuration.

No mandatory cloud service or AI account is required.

## Document ownership

Generated application documents belong to the user and must not be trapped inside AAAAT.

The user should be able to access editable content, generated source, rendered output and portable document projects.

LaTeX is currently the production technology, but the user's mental model is:

> this is my CV/letter and I own its source and output.

## Privacy

AAAAT contains sensitive and highly profilable information. Local information is authoritative.

When external intelligence is used, the user should retain meaningful control over what information is exposed.

These are distinct concerns:

```text
stored locally
shown in Focus
allowed to this AI operation
```

Hiding something from AI does not delete or hide it locally. Hiding it from Focus does not imply anything about AI access.

Privacy mechanisms should be understandable but must not dominate ordinary UX.

## Research and enrichment

AAAAT may benefit from external information about a candidature, such as company context, legitimacy, recent relevant developments or role context.

This is secondary enrichment, not a defining core workflow.

The mechanism may be manual research, the user's external AI application, another configured service or a future native capability if justified.

The fundamental requirement is that useful enrichment can become ordinary candidature information. AAAAT does not need to become a dedicated research product.

## Deterministic processing when AI is unnecessary

AAAAT should use ordinary software where ordinary software is sufficient.

Future intake may improve through deterministic cleaning of copied web content, whitespace normalization, common metadata detection or structure recovery.

AI should be used when it adds genuine value, not because the product is AI-enabled.

The objective is effort reduction, not AI usage.

## Setup

AAAAT can depend on technically awkward external tools such as LaTeX, local model runtimes, remote AI services and external AI hosts.

Ordinary users should not need to understand implementation details.

Setup should answer practical questions:

```text
What already works?
What is missing?
What do I need to do?
```

## installer.ai / configuration assistance

`installer.ai` is a legitimate product concept because some setup tasks are too environment-specific for a traditional installer alone.

The same installation/configuration knowledge may be usable through normal AAAAT UI, an AI assistant or a compatible external AI host.

Its purpose is reducing setup friction. It must not make AAAAT dependent on AI.

Ordinary users should not need to learn MCP, JSON schemas, ports or provider internals merely to use the application.

## Multiple AI environments

AAAAT is provider-agnostic.

A user may have no AI, one or several local models, remote models, one or several external AI applications.

AAAAT should use an available suitable intelligence source when it materially reduces effort, without becoming a provider marketplace or orchestration framework.

## Lightweight reminders

Small candidature-related reminders can be useful, for example:

```text
☐ Ask recruiter about remote policy
```

This does not imply project management, workflow state, scheduling, recurrence, AI planning or automatic next actions.

## Status and lifecycle

Application status may be useful information, but AAAAT must remain useful even when the user does not maintain lifecycle data consistently.

Lifecycle information must not transform AAAAT into a conventional applicant-tracking CRM.

## Product time scales

AAAAT serves two different interaction speeds.

### Ordinary work

The user has time to inspect, edit, add Sources, maintain professional information and work on documents.

### Immediate retrieval

The user has seconds:

```text
phone rings
→ recruiter names company
→ identify candidature
→ recover context
```

The interface may legitimately use different information density for these situations. Focus primarily serves the second.

## Product character

AAAAT should feel direct, fast, calm, local, comprehensible, information-efficient, professional and flexible.

It should avoid unnecessary ceremony.

It should not feel like a SaaS admin console, generic AI assistant, developer tool, workflow tracker, configurable database, oversized-card dashboard, permanent setup wizard or system that requires the user to learn its architecture.

## Effort is the primary UX metric

Ask:

> Does this reduce or increase the total effort required for the user's actual job-search task?

Effort includes typing, repetition, decisions, navigation, learning, remembering, reorganizing, copying between tools and interpreting technical concepts.

A technically powerful feature that introduces more cognitive overhead than the work it saves is not necessarily useful.

## Progressive depth

AAAAT should be approachable without becoming opaque.

The same product may expose:

- ordinary interaction: only what is needed now;
- detailed interaction: complete user-facing information and editing;
- advanced/audit interaction: technical ownership, privacy, document source and configuration when genuinely requested.

This does not require separate beginner and expert products.

## Sparse data and progressive disclosure

A flexible information model must not produce a flexible-form nightmare.

```text
possible information
≠
information that must be displayed
```

The interface should primarily expose useful retained information, relevant actions and contextual ways to add something else.

## Product flexibility

All of these are valid:

```text
paste recruiter message → save → retrieve later
```

```text
paste offer → optional extraction → correct useful values
```

```text
manual entry → no AI
```

```text
retain reference → create/tailor CV → write letter → render
```

```text
several Sources → notes → Concepts → context → documents
```

```text
discuss opportunity in preferred AI → bounded AAAAT action → local retained result
```

```text
open AAAAT → work only on CV/letter
```

No journey is the canonical complete workflow against which the others are incomplete.

## What AAAAT must not become

AAAAT must not drift into a product primarily defined by:

- application-process management;
- career advice;
- AI chat;
- AI-operation consoles;
- schema editing;
- generic document management;
- generic task management;
- generic knowledge management;
- generic agent platforms;
- dashboard design.

A configurable User View may eventually be valuable, but only as an optional extension over an already coherent product.

## Interpretation rules

When ambiguity arises, recover the underlying user intention rather than relying on historical implementation terminology.

- “Track candidatures” means retaining and retrieving useful application information; not automatically pipeline management.
- “Cross-candidature” means working across the candidature corpus; not automatically comparing opportunities.
- “AI support” means reducing work through suitable intelligence; not automatically a chatbot.
- “Flexible information” means retaining unanticipated useful data; not automatically exposing a schema editor.
- “Focus” means rapid contextual retrieval; not automatically a fixed recruiter script.
- “Professional information” means reusable information about the user; it is not defined by internal profile architecture.
- “User View” refers, in its original sense, to an optional configurable modular workspace.
- “Research” means useful external enrichment where available; it does not require a dedicated AAAAT research subsystem.
- “Manual operation” means full operation without AI; it does not mean manual typing should be preferred when reliable automation can reduce effort.

## Product north star

A successful AAAAT should make these statements true:

> I can put almost any job opportunity into AAAAT immediately without first organizing it.

> I do not need to fill irrelevant fields just to keep something.

> If useful automation exists, AAAAT does the boring extraction rather than asking me to reproduce it manually.

> I can always return to the original material.

> I can see my candidatures together and find the one I need quickly.

> If a recruiter calls unexpectedly, I can recover the useful context within seconds.

> AAAAT does not prescribe one job-search workflow.

> I can maintain reusable professional information instead of rewriting it for every application.

> CVs and cover letters are first-class working documents, not disposable outputs.

> I can use AAAAT only for CV/cover-letter work if that is what I need.

> Application-specific documents remain connected to the relevant candidature.

> I can use AAAAT completely without AI.

> If AI is available, it removes work rather than becoming another interface I must learn.

> If I prefer another AI application, it can interact with AAAAT through bounded suitable capabilities.

> AAAAT manages my information and documents; it does not choose my career for me.

> My authoritative information remains local and under my control.

> I should spend less time organizing the mechanics of job searching because AAAAT exists.

## Durable definition

AAAAT is a private local working memory and production environment for job searching.

It receives messy opportunity information with minimal effort, retains the original evidence, organizes whatever information proves useful, makes the candidature corpus fast to search and recognize, provides high-density contextual recall when needed, reuses professional and conceptual knowledge across opportunities, and produces editable user-owned CVs and cover letters.

It is designed around reducing friction rather than enforcing process.

Manual work, AAAAT-assisted intelligence and external-AI interaction are alternative ways of working with the same user-owned information.

AI provides optional intelligence; it is neither the application's interface nor its authority.

The user owns the data, the documents, the interpretation of their career and the decisions.

AAAAT's job is to make everything around those decisions substantially easier.
