# M6 deterministic user journey and visual information contract

Status: M6 product/UX contract for Issue #127. This document constrains M6 renderer composition and the minimum information that later Class C persistence work may justify. It is not a schema specification and does not authorize future-Mission fields.

## Purpose

M6 must make an incomplete opportunity useful for manual understanding and recruiter readiness without recreating the v1 field-sheet experience. The normal path is read-first and progressively editable. Missing information is normal.

The deterministic fixture is fictional:

- Candidate: Alex Rivera, platform/backend engineer.
- Career direction: move toward staff-level platform work.
- Constraint: no relocation.
- Target: Spain/EU remote or hybrid.
- Opportunity: Example Systems, Senior Platform Engineer.

The opportunity begins with only a recruiter message. A separate job description is added later. No AI connection, external agent, or network capability is required for the journey.

## Deterministic journey

```text
Current career context
→ recruiter message creates an incomplete opportunity
→ Focus opens with only what is known
→ job description is added as a second source
→ priority / status / next action are set
→ fit / evidence / gaps are entered
→ current strategy is entered
→ pitch / questions / recruiter preparation are entered
→ Focus answers the recruiter-call questions
→ AAAAT closes
→ AAAAT reopens
→ the same authoritative state is understandable
```

At every step the user may stop with partial information. No step requires inventing an unknown company fact, role detail, date, salary, source, evaluation value, or preparation value.

## Candidature list contract

The list remains useful for rapid selection and filtering while a candidature is incomplete.

Each item emphasizes:

1. company when known, otherwise a neutral unknown-company label;
2. role when known, otherwise a neutral unspecified-role label;
3. lifecycle status;
4. priority only when the user assigned one;
5. next action only when present.

Search continues to cover useful opportunity text and associated concept names/aliases. Archiving remains independent from lifecycle status. Priority is user-authored operational metadata, not a calculated rank.

The list must not expand into a miniature dossier. Pitch, evaluation, source bodies, research text, and document content belong in the selected candidature workspace.

## Selected candidature composition

Selecting a candidature opens `Focus` by default. Detailed editing is separated by user intention rather than presented as one long form.

The M6 composition is:

```text
Focus
Opportunity
Sources
Evaluation & strategy
Recruiter preparation
Concepts
Documents
```

Activity remains secondary/read-only unless real M6 evidence later demonstrates that it deserves primary navigation. These labels are renderer composition only. They do not imply separate domain subsystems or a generic section registry.

### Focus

Focus is a fast read projection. It never owns duplicate persisted values.

The user should be able to answer, within seconds when the information exists:

```text
Who is this company?
What role is this?
Where am I in the process?
What happens next?
What is my pitch?
What evidence should I mention?
What concerns or constraints matter?
What should I ask?
What context should I remember?
Which concepts or keywords matter?
What application material already exists?
```

Information hierarchy:

1. company + role;
2. status + assigned priority;
3. next action and optional date;
4. pitch;
5. important strengths/evidence;
6. gaps/risks/constraints;
7. questions to ask;
8. current strategy and relevant company/role context;
9. notes;
10. associated concepts/keywords;
11. associated CV/cover-letter material.

A missing optional value does not render a large empty card. High-value missing information may expose one small contextual action such as `Add pitch`, `Add evidence`, or `Add questions`. Low-value absence simply disappears.

Focus does not contain field-by-field AI buttons. Existing optional M3 AI may remain accessible without becoming necessary to read or edit the candidature.

### Opportunity

Opportunity contains only operational opportunity facts and lifecycle controls:

- company;
- role;
- location;
- work mode;
- salary text;
- status;
- assigned priority;
- application date;
- next action;
- next-action date;
- notes;
- archive/restore.

Preparation values do not move into the candidature root merely because they are visible near Opportunity in the UI.

The normal Opportunity editor is a bounded form for these facts only. It is not the entire candidature workspace.

### Sources

Sources are independently meaningful user-supplied inputs. M6 needs concrete labels for:

- job posting;
- recruiter message;
- application form;
- conversation-derived material;
- link/source;
- other supplied text.

The Sources view is a list of source cards, not repeated source fields in Opportunity. Each card can communicate:

- source kind;
- short title/label when useful;
- URL/reference when supplied;
- a bounded text preview.

`Add source` opens one focused editor. Source items can be edited and removed independently. Removing a source never removes the candidature. A candidature with zero sources remains valid.

Existing accepted v2 single-source data must appear as one meaningful source after migration; M6 does not require any v1 data migration.

### Evaluation & strategy

This view contains only the durable M6 working understanding:

- fit/suitability summary;
- strengths and supporting evidence;
- gaps, risks, and constraints;
- current role/application strategy;
- relevant company/role context.

Every value is manually editable and may be empty. The page should favor a small number of deliberate multiline editors over a matrix of tiny optional fields.

No interview-preparation, assessment-preparation, application-question, web-research, or generic preparation framework is introduced here.

### Recruiter preparation

This view contains:

- pitch;
- questions to ask;
- recruiter-call preparation/reminders.

It is deliberately narrower than future interview or assessment preparation. The user can prepare an unexpected recruiter call without AI and without completing unrelated candidature data first.

### Concepts

Keep the accepted shared-concept semantics. The selected candidature associates existing concepts and may create/update concepts through the existing fixed intention. Concepts remain shared reusable knowledge, not working-brief fields.

The normal candidature path should emphasize associated concept names/aliases and definitions rather than exposing a large concept-management form next to every other editor.

### Documents

Keep the accepted candidature-to-document association semantics. Focus shows currently associated material compactly; Documents owns association/detail work. M6 does not introduce sent/used/superseded lifecycle state.

## Current career context

Career context is maintained adjacent to Profile but is semantically separate from canonical professional evidence and difference-only profile variants.

The M6 current context contains only:

- career direction;
- objectives;
- constraints;
- target roles;
- target markets/locations;
- work preferences;
- application/writing preferences.

The normal Profile view should summarize only non-empty values under `Current career context` and expose one deliberate edit action. It is current reusable decision context, not `career_plans`, not an application-specific copy, and not a history/state machine.

## Dirty-state and navigation contract

Existing accepted dirty-edit protections remain a hard UX baseline:

- switching candidature does not silently discard an edited section;
- leaving an edited section does not silently discard its draft;
- saving a document/concept/source association does not commit or erase unrelated dirty Opportunity or preparation edits;
- archive/restore acts on persisted candidature state and does not accidentally commit unrelated drafts;
- a successful bounded save refreshes only the relevant authoritative projection without destroying another section's local draft.

The implementation may use ordinary local React state. This contract does not justify a renderer state framework or workflow engine.

## Incomplete-state examples

### Recruiter message only

Known:

- Example Systems;
- Senior Platform Engineer;
- recruiter message source.

Focus shows company and role plus any source-derived note the user entered. It does not show empty salary, evaluation, pitch, questions, documents, or concepts cards. A small `Add next action` / `Add pitch` affordance may appear.

### Opportunity with evaluation but no application material

Focus shows status/priority/next action, pitch, evidence, risks, questions, and context. The absence of a CV or letter is communicated compactly only where material is relevant; it does not reserve a large empty document region.

### Unknown company and role

The candidature remains selectable and editable using neutral placeholders. The UI never blocks capture of the supplied source merely because structured opportunity facts are not yet known.

## Representative desktop layout constraints

Normal desktop width should support a compact candidature list beside the selected workspace when space allows. Focus is readable without horizontal scrolling.

At a smaller ordinary window:

- primary section navigation may wrap or become horizontally scrollable;
- the content column remains readable;
- source cards and Focus blocks stack vertically;
- controls retain visible labels and keyboard focus;
- no essential content is hidden behind hover-only behavior.

The product does not need a new responsive framework to meet these constraints.

## Accessibility and interaction baseline

- section navigation uses buttons/tabs with an observable selected state;
- regions have useful accessible names;
- Add/Edit/Save actions describe their object rather than using repeated unlabeled icon buttons;
- keyboard users can reach section navigation and primary actions in reading order;
- status/priority meaning is not conveyed by color alone;
- confirmation is reserved for destructive/discard behavior, not routine navigation when no draft is dirty.

## Explicitly rejected shapes

M6 must not introduce:

- a single candidature form containing all Opportunity, source, evaluation, recruiter, concept, and document controls;
- Smart View / Detailed View compatibility;
- forty optional empty fields;
- a persisted Focus model;
- a generic preparation/content section registry;
- field-level task/action buttons;
- a renderer workflow engine;
- provider or MCP terminology in ordinary candidature work;
- interview, assessment, form-answer, web-research, or material-usage placeholders for later Missions.

## Persistence-neutral constraints for Class C work

This document authorizes persistence only for user information demonstrated by the journey. It intentionally does not decide SQL details.

The Class C reviews for career context and candidature sources/working brief must preserve these semantic boundaries:

- canonical profile remains professional evidence;
- career context remains one small current reusable context;
- candidature root remains operational opportunity data;
- multiple supplied sources remain independently meaningful;
- preparation remains one candidature-owned M6 working brief;
- priority remains a small user-authored value;
- Focus remains a projection;
- accepted concepts/documents/application-service/security boundaries remain unchanged.

If an implementation needs a generic registry, workflow state, hidden compatibility model, or future-Mission field to realize this contract, the design should be simplified before merge.

## Acceptance use

This contract is the deterministic reference for #128–#131. Final M6 capability acceptance still requires actual packaged/manual runtime evidence. A document or green unit suite alone cannot establish that the completed UI feels recruiter-ready rather than like a database editor.
