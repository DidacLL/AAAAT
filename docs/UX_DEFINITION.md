# AAAAT UX Definition

Status: derived UX reference, not product authority or an active Mission contract.

Current explicit Product Owner instruction and [`PRODUCT_DEFINITION.md`](../PRODUCT_DEFINITION.md) establish product meaning. [`SPEC.md`](SPEC.md) records the derived technical architecture. This document records useful UX guidance within that established meaning; it cannot add, alter, or settle product requirements. [`UX_HISTORY_RECONCILIATION.md`](UX_HISTORY_RECONCILIATION.md) is research evidence only.

This is not a screen specification. It does not prescribe React components, tabs, sidebars, card layouts, routes, CSS, exact labels, breakpoints, pane ratios, visual theme, or component decomposition.

When deciding where a capability belongs, use:

**user intention → object/context being worked on → information needed now → action needed now → progressive access to deeper detail**

Do not derive UX from database entities, services, APIs, current components, or implementation order.

## 1. Product experience and mental model

AAAAT is a local job-application workspace where the user can rapidly capture, understand, retrieve and work with candidatures while also creating and maintaining reusable CV/cover-letter material independently.

AAAAT should not feel like a CRM, task manager, generic document warehouse, AI control panel, database editor, developer tool, or persistent setup wizard.

The durable mental model is:

1. A **Candidature** is the central object for job/application work.
2. **Sources** are retained original material/evidence belonging to a candidature.
3. Reusable **professional information** belongs to the user and can support many candidatures and documents.
4. **VCVGenerator** serves two legitimate contexts: candidature-specific application material and standalone CV/cover-letter work without a candidature.
5. **AI** is assistance attached to the work currently being performed. It is not navigation.
6. **ToDos** are optional lightweight checkable notes/reminders, usually related to a candidature. They are not a task-management product.
7. **Concepts** are reusable contextual knowledge, not a separate knowledge-management product.
8. **Settings/setup/recovery** are secondary administration, not ordinary career work.
9. The normal UX is simple for non-technical users while remaining editable, inspectable and auditable through progressive disclosure.
10. Sparse input is normal. A recruiter message, URL, raw offer, or one useful fact is already a valid candidature.

## 2. Representative interaction flows

These examples illustrate interaction needs. They do not prescribe one mandatory lifecycle, workflow, or navigation sequence.

### Capture

User receives a recruiter message, offer, URL, or other material.

Desired flow:

**open AAAAT → new candidature → paste/provide whatever exists → save**

No company, role, status, priority, next action, AI setup, document choice, or completeness ceremony is required.

Structured information can be added manually or extracted later. A sparse candidature must not be presented as unfinished, broken, or low quality.

### Fast recall / unexpected recruiter call

User remembers only part of an application.

Desired flow:

**search by any useful retained material → identify candidature → open Focus → immediately recover useful call context**

Search may use company, role, recruiter, Source text, URL, custom information, Concepts/aliases, or other meaningful retained text.

Focus is the modern continuation of the validated v1 Smart View user need: rapid recognition, stable information locations, readable rather than edit-heavy presentation, user configurability, no giant form, and no arbitrary AI hierarchy.

Focus is a projection of the candidature, not another data model.

### Serious candidature work

User selects candidature X to understand or maintain it.

The candidature context must naturally provide access to:

- Focus;
- complete candidature information;
- Sources;
- associated application material;
- supporting Concepts;
- notes/checkable reminders;
- relevant privacy/presentation controls;
- secondary Activity/provenance when useful.

Do not automatically make each of those a peer top-level navigation destination.

### Raw offer → application

User may retain a Source, manually add information, ask AI to extract from that explicit Source, evaluate fit, prepare questions/notes, create or use a CV, create or use a cover letter, and retain the exact material actually used.

AAAAT supports these actions without forcing a prescribed workflow. The user may perform them in another order or omit any optional step.

### Candidature-specific application material

From candidature X:

**application material → create/select CV or cover letter → edit/render through VCVGenerator → retain candidature context**

CVs and letters associated with candidature X must be visible from candidature X. The user must not have to reconstruct the relationship from a generic document warehouse.

### Standalone VCVGenerator

User may open AAAAT only to edit a general CV, create another CV, edit/create a cover letter, render, export portable LaTeX, or inspect/edit source.

No candidature is required. This is the major parallel journey to candidature management.

### Reusable professional information

User maintains reusable experience, skills, education, projects, identity/contact, languages, links, summaries, and relevant objectives/preferences/constraints.

Ordinary UX should present actual professional information. Users must not need to understand “canonical profile”, patches, rule engines, or variants before normal use.

Variants/differences remain available through progressive disclosure.

### Contextual AI

The user thinks: **“Help me with this Source / field / candidature / CV / letter.”**

They should not navigate to an AI administration workspace and rebuild context. Assistance belongs near the work. Provider/connection administration belongs in Settings.

If no valid AI route exists, manual work remains complete.

### Aggregate candidature work

Search, filter, archive, and explicitly selected comparison belong around the candidature collection. They help the user find/select candidatures; they do not create a second CRM/table-management product.

### Setup / recovery

Workspace, backup/restore, TeX capability, AI connections, configuration portability, and host-access explanation are important but secondary and infrequent. They must not dominate candidature or VCVGenerator work.

## 3. Candidature experience

### Collection level

The candidature collection answers: **“Which candidature am I looking for?”**

It should provide strong search, useful filtering, archive access, recognizable compact summaries, and quick sparse candidature creation.

A candidature summary is not a miniature dossier. It exposes only enough information to identify/select the record.

Company and role are useful labels when present but are not required identity fields. Sparse records should use another meaningful retained signal.

### Selected candidature

Once selected, the perceptual context is **Candidature X** and should remain stable while the user explores it.

The exact tabs/panes/navigation mechanism is not fixed, but selected candidature work must make it easy to reach:

- Focus;
- all candidature information;
- Sources;
- candidature-specific application material;
- supporting Concepts, notes/checkable reminders, privacy/presentation controls, and Activity when useful.

Contextual support must not be promoted into peer navigation simply because it is a separate persisted concept.

## 4. Focus

Focus is a candidature projection optimized for fast human recall.

It is not a separate record, an AI summary, a dashboard builder, a fixed recruiter questionnaire, or a lifecycle checklist.

For normal candidature values, Focus visibility is independent from storage and AI disclosure.

Focus configuration should support:

- visibility;
- ordering;
- relative prominence/space.

Sources, Concepts, reminders, documents, and similar structured objects may participate through domain-appropriate summaries.

Focus prioritizes readability over controls. Configuration is adjacent but secondary, not permanently occupying the call-support surface.

Stable spatial expectation matters. Information must not unpredictably jump because of arbitrary inference.

## 5. Complete information and editing

The complete candidature experience answers: **“What does AAAAT actually know about this candidature, and can I change it?”**

Every normal user-facing value remains accessible and editable according to its domain semantics.

“Complete” must not mean “render every possible field as an empty textbox.” Default behavior should be:

- populated information is readable;
- relevant missing information may have small Add affordances;
- complete/additional available information can be deliberately requested;
- editing happens locally around the value where practical;
- destructive actions are explicit.

Advanced users must be able to reach field/value details, semantic label/type where relevant, edit/clear/remove controls, AI disclosure, Focus visibility/order/prominence, and user-defined field definition where applicable.

The normal reader should not see all that machinery at once.

## 6. Sources

Sources are candidature-owned retained inputs such as job postings, recruiter messages, URLs, application forms, conversation text, pasted research, or other relevant raw material.

A Source remains recognizable, searchable, inspectable, and independently editable/removable where allowed.

Source content must be readable in full when requested. Long raw material should not dominate Focus.

Extraction never replaces or destroys the original Source.

AI actions that specifically use a Source belong near that Source or near the target information being derived from it.

## 7. Notes and checkable ToDos

A ToDo is a lightweight checkable note/reminder, usually in candidature context.

It is not a product pillar and must not imply task management, calendar scheduling, recurrence, workflow state, productivity methodology, AI-agent work, or “next action” architecture.

A global summary of unchecked reminders may later be convenient, but it is a secondary projection. It does not make ToDos a primary workspace.

## 8. Concepts

Concepts are shared reusable contextual knowledge with a canonical term, aliases, definition, and user notes.

A candidature can reference a Concept. During preparation or Focus, the user should be able to inspect its definition/notes without unnecessarily leaving context.

Global concept maintenance may exist for advanced use, but Concepts are not a separate knowledge-management application.

## 9. Candidature-specific application material

Within candidature X, show material for candidature X, including working CVs/cover letters, useful document state, and the exact retained artifacts actually submitted/used when available.

The user can create, associate, inspect, or open material from candidature context.

Application material is candidature context; it is not a detached generic document library.

## 10. Standalone VCVGenerator

Standalone VCVGenerator is a first-class journey for creating and maintaining CV/cover-letter documents without a candidature.

The ordinary experience should answer:

1. What am I editing?
2. What information will appear?
3. Can I change it?
4. What will the output look like?
5. Can I render/export it?

Advanced depth should expose canonical source information, variant differences, document-specific differences, user-authored source, feeder-owned generated data, `main.tex`, `aaaat.sty`, `data.tex`, PDF/output, portable project, retained artifacts, and AI descriptor/content permissions where applicable.

User ownership and auditability justify this advanced layer; they do not require the beginner to learn LaTeX before editing a CV.

## 11. Reusable professional information

The user-facing concept is reusable professional information.

The normal experience should present actual content such as experience, skills, projects, education, identity/contact, languages, links, summaries, and objectives/preferences/constraints.

Avoid centering implementation concepts such as canonical schema, variant rules, IDs, or patches.

A user should be able to create a useful general CV without first creating or understanding a variant. Variants become relevant only when the user deliberately needs reusable alternate emphasis or content.

## 12. Contextual AI

AI is a capability attached to user intentions, not product navigation.

For each AI action, the UI should make understandable:

- what it will help with;
- what context is being used when that matters;
- whether the result proposes or directly produces something under the operation’s rules;
- what will actually change;
- how the user can edit the result afterward.

Do not show unreliable capabilities merely because the backend exposes them.

Provider/network/connection detail belongs in Settings unless needed to diagnose the current action.

## 13. Privacy and disclosure

Privacy should be understandable where it matters.

For ordinary candidature/profile information, users should be able to understand that these are independent concerns:

- stored locally;
- visible in Focus;
- visible to AI.

Do not conflate hide-from-AI, hide-from-Focus, delete, local replacement/anonymization, or hide-from-local-user.

For external-host configuration, advanced/settings UX must honestly explain when the external tool itself has broad filesystem, screen, or shell access and therefore sits outside AAAAT’s application-level privacy guarantees.

Local ownership/trust should be visible when relevant, not repeated as permanent slogans throughout ordinary work.

## 14. Advanced auditability and progressive disclosure

“Simple for beginners” must never mean opaque.

AAAAT uses one interface with increasing depth:

### Normal layer

What most users need to complete the current task.

### Detail layer

Complete user-facing information and normal controls.

### Advanced/audit layer

Ownership, source, privacy, provenance, rendering, configuration, and technical detail.

Do not create separate beginner/expert products or incompatible modes.

Advanced users should be able to reach the complete underlying information without forcing that machinery into first sight.

## 15. First-run experience

First run has one job: **get the user into a usable local workspace with minimal uncertainty.**

It should establish what AAAAT does, that it works without AI, that data is local/user-owned, and how to create/open a workspace or restore an existing backup.

Recovery must be discoverable but should not compete equally with the primary create/open action.

TeX configuration, AI configuration, and external-host setup should enter first run only when genuinely necessary for something the user is trying to do.

After workspace creation, onboarding should stop dominating the product.

## 16. Responsive behavior

Desktop is the target, but supported window size is variable.

At smaller supported dimensions:

- essential content remains reachable;
- scrolling is preferable to clipping;
- contextual columns may stack;
- candidature list/detail may transition rather than compress indefinitely;
- important actions remain labeled;
- reading order stays logical;
- fixed chrome must not obscure content.

The declared `720×600` minimum must be genuinely usable, not merely a window that technically opens.

This contract does not freeze exact breakpoints or layout ratios.

## 17. Editing safety

Navigation must never silently destroy work.

Unsaved state must be protected when switching candidature, switching significant context, switching workspace, restoring backup, or selecting another document/profile item where the existing editor is dirty.

Routine navigation with no unsaved changes should not trigger confirmation noise.

Save operations in one area must not accidentally commit or clear unrelated drafts.

## 18. Empty, loading, error, and optional-capability states

Every major context must design these deliberately.

### Empty

Explain what the area is for and give the smallest meaningful action. Do not fill empty states with technical descriptions.

### Loading

Preserve orientation. Avoid making the whole product appear unavailable when only one contextual element is loading.

### Error

Explain what failed, whether authoritative data changed, and what the user can reasonably do next. Avoid raw implementation errors in ordinary UI.

### Unavailable optional capability

For example, no AI route or no TeX installation. Core/manual product use remains available. Explain the missing capability where relevant rather than globally presenting AAAAT as broken.

## 19. Terminology

Prefer vocabulary ordinary users of a job-application tool can understand:

- Candidature / application;
- Source;
- CV;
- Cover letter;
- professional information/profile;
- Focus;
- note/reminder;
- backup;
- workspace.

Avoid exposing MCP, IPC, provider route, schema, field ID, migration, payload, artifact ID, operation capability, feeder, or similar implementation terminology during ordinary work unless the user deliberately opens an advanced/technical context where it is useful.

Exact candidature section labels, the final name of the reusable-profile destination, and the ordinary-user name of VCVGenerator remain later design outcomes.

## 20. Visual and interaction character

AAAAT should feel calm, information-dense where useful, legible, stable, direct, professional, and non-technical by default.

It should not be decorative at the expense of information, sparse merely for fashion, card-heavy because every component became a card, an admin console, a setup wizard, or a generic web SaaS dashboard clone.

Dense information can be calm; clutter is the failure mode, not density itself.

## 21. Anti-patterns

UX development must not drift into:

1. **Entity navigation** — every persisted entity gets a primary page.
2. **Feature navigation** — every capability gets a top-level destination.
3. **AI navigation** — AI becomes a workspace users must operate.
4. **Form-first candidature UX** — a candidature becomes a mandatory giant form.
5. **Workflow coercion** — required statuses, tasks, funnels, or checklists.
6. **Generic document warehouse** — application documents lose candidature context.
7. **Dashboard-widget framework** — users manage layout machinery instead of applications.
8. **Beginner/advanced forks** — two incompatible interfaces.
9. **Settings dumping ground** — unrelated configuration is stacked endlessly.
10. **Persistent onboarding chrome** — setup language occupies ordinary work.
11. **Implementation-derived navigation** — current tables/components determine hierarchy.
12. **Silent draft loss** — navigation discards unsaved work.
13. **Minimum-size clipping** — content exists but becomes unreachable.

## 22. Global navigation: what is and is not known

This contract deliberately does not freeze the final navigation mechanism.

It establishes two primary product journeys:

1. candidature-centred job/application work;
2. standalone CV/cover-letter work.

Reusable professional information supports both. Settings/setup supports the product but is not ordinary career work.

Later navigation design must emerge from validated screen-level journeys. It must not elevate ToDos, Concepts, AI connections, Sources, artifacts, or other incidental entities into equal primary destinations simply because they exist.

## 23. Acceptance questions for future UX features

Before adding or positioning a control, answer:

1. What concrete user intention causes the user to need this?
2. What object/context are they working on?
3. Is this primary work, contextual work, or administration?
4. Is it frequent enough to deserve permanent visual space?
5. Could it appear only when relevant?
6. Does it preserve candidature context where appropriate?
7. Does it work manually without AI?
8. Does it expose implementation terminology unnecessarily?
9. Can a non-technical user understand the next action?
10. Can an advanced user still reach the full underlying information?
11. Does sparse data remain comfortable?
12. Does it create a duplicate editor or source of truth?
13. Does it survive the declared minimum desktop window?
14. Does navigation protect unsaved work?
15. If the control disappeared from the main surface, would any actual capability be lost?

If these questions cannot be answered, the feature is not ready to be placed in the interface.

## 24. Intentionally open design decisions

Later UX work must decide through interaction design, prototypes, and packaged testing:

- exact top-level navigation mechanism;
- sidebar vs tabs vs another desktop pattern;
- exact candidature list/detail transition;
- whether Focus and full information are tabs, modes, panels, or another composition;
- exact candidature section labels;
- exact reusable-profile destination naming;
- exact ordinary-user VCVGenerator naming;
- exact placement of advanced/audit controls;
- responsive breakpoints;
- visual language, typography, density, spacing, and controls;
- whether an aggregate home/recent projection is eventually valuable.

Those decisions are judged against this contract; they must not be inserted here prematurely.

## 25. Stable north star

A successful AAAAT UX keeps these statements true:

> I can throw almost any job-related material into AAAAT and retain it without first organizing it.

> I can find the candidature I need even from text buried in the original material.

> When somebody calls me, AAAAT helps me recover the useful context immediately.

> When I need details, nothing important is hidden and I can edit my own information.

> The CVs and letters for an application are visible from that application.

> I can also use AAAAT only to work on my CV or cover letter.

> I do not need AI; when I use it, it helps with what I am already doing.

> I own the information, Sources and documents and can inspect deeper ownership/privacy/provenance details when I choose.
