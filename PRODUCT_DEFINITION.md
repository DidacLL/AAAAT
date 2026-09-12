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

## Capture with almost no effort

The normal low-friction capture can be as small as:

```text
New candidature
→ provide whatever material exists
→ save
```

Raw offer text, recruiter text, copied web content, a URL embedded in text, form material, conversation material or fragments are all valid input. The user should not need to classify the material before saving.

Structured information can be added manually, extracted with optional AI, derived deterministically where sensible, or never added at all. Retaining the raw material is already a successful operation.

## Sources

Original retained material is first-class and remains independently useful.

A Source can contain job postings, recruiter messages, URLs, application forms, conversation text, copied website material, user research, notes or other retained inputs.

Extraction or summarization never replaces the Source. Sources remain searchable, readable and candidature-owned.

## Flexible information, shipped defaults

AAAAT must retain useful information that was not predicted by the developer. Different opportunities and professions require different information.

AAAAT may ship common field definitions and labels such as company, role, salary, location, recruiter or similar values. These are useful defaults, not a permanent closed ontology.

The field system must remain compatible with user-maintainable/custom fields even when a bounded implementation tranche does not yet expose full field-definition administration.

The ordinary mental model is:

> I want to keep this information.

Not:

> I want to administer a schema.

Database-style field IDs, cardinality, schema concepts and type machinery must remain secondary/advanced implementation detail.

## Focus: rapid retrieval with two states

Focus is a defining candidature capability. Its purpose is to let the user identify the right candidature and recover useful context within seconds, especially under divided attention such as an unexpected recruiter/interview call.

Focus is one experience with two states.

### 1. Corpus Focus

Before a candidature is selected, Focus shows multiple candidatures simultaneously so the user can recognize the right one quickly.

Each candidature shows only a deliberately small set of Focus-selected fields/signals. AAAAT ships sensible defaults, but the user controls which available fields participate. Focus must not dump every stored value or every candidature-owned object into the overview.

Search and filtering support partial memory across meaningful retained information, including Sources and Tags/aliases where appropriate.

The requirement is fast recognition with minimal visual noise. The exact composition may evolve; old Smart View/card/table implementations are not design authority.

### 2. Selected-candidature Focus

Selecting a candidature gives that candidature the available working space rather than expanding a cramped card inside the corpus.

This state shows the richer subset the user configured as useful for recall: selected fields, relevant Tags/glossary knowledge, notes or other deliberately chosen Focus information.

It remains a curated recall surface, not a complete dump of all Sources, all documents, all reminders or all stored information.

Displayed editable fields must have low-friction edit affordances. During a call the user must be able to correct a value or add useful information without leaving Focus merely because editing exists elsewhere too.

A shortcut to complete candidature management is useful, but complete editing is not the mandatory continuation of Focus and Focus is not the only candidature journey.

## Complete candidature work

The user can directly open a candidature for deliberate maintenance without first going through Focus.

Complete candidature work exposes everything the user owns for that candidature: all structured information, Sources/raw material, Tags, linked application material, retained artifacts, relevant privacy/presentation controls, and secondary notes/reminders or provenance where useful.

Complete access must not mean a giant permanent form. Populated information is primarily readable; editing/addition happens close to the value; deeper machinery is progressively disclosed.

## Tags

Use **Tags** consistently as the product/domain term.

A Tag can have a canonical term, aliases, definition and user notes. Tags are reusable across candidatures and act as a lightweight shared glossary/wiki plus retrieval aid.

Example: if a candidature uses `Spring Boot`, selected Focus can expose the stored Spring Boot definition without forcing the user into a separate knowledge-management workspace.

A competing `Concepts` product vocabulary is not justified. Historical `Concept` code/schema names are implementation evidence to reconcile, not product meaning.

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

## VCVGenerator / CVs and letters

CV/cover-letter work is independently core.

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

AI belongs beside the domain action it assists: extract information from this Source, help populate this field, explain/translate/rewrite this text, tailor this CV, draft this letter, perform genuine research when the chosen connection supports it, or similar bounded work.

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