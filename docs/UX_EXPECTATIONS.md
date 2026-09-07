# AAAAT product UX expectations

Status: active UX guidance for Mission #204 / Issue #205.

This document translates current product meaning into user-experience expectations. It is subordinate to `docs/OWNER_INTENT.md` and `docs/SPEC.md`; direct Product Owner instruction still wins. Historical v1 material is research evidence only. Preserve the intent behind older UX discussions, not their Python/wx implementation, exact panes, field catalogues, task queues, or navigation mechanics.

## Product feel

AAAAT should feel like a calm local workspace rather than an administration console.

A non-technical user should be able to capture an opportunity, find it again, understand what they know, edit it, prepare for a call, manage useful notes/ToDos, and create documents without learning database concepts, AI protocols, JSON, shell commands, or implementation terminology.

An advanced user should be able to inspect and edit all normal user-facing information, see retained raw Sources, understand what material exists and where it came from, control Focus presentation and AI disclosure, access document source/PDF output, and reach explicit setup/recovery controls without the product hiding state behind automation.

These are not two separate products or modes. The normal interface should be simple by default and progressively reveal deeper controls when the user asks for them.

## Core interaction principles

### 1. Recognition before administration

The first job of a candidature surface is to help the user recognize the opportunity and recover useful context quickly. Editing machinery is secondary until requested.

Useful recognition may come from company/role when known, but sparse records remain first-class and may be identified by source text, a recruiter name/message, a URL, user-defined information, concepts, or other configured material.

Do not require the user to complete lifecycle fields or structured metadata before the candidature becomes useful.

### 2. Read first, edit deliberately

Normal views should favor readable information over permanently visible controls. Editing should be close to the information being edited, but it should not turn every screen into a wall of inputs.

A user must still be able to reach complete candidature information. Progressive disclosure must not become omission. Every normal user-facing field/value remains inspectable and editable according to its domain semantics.

### 3. Sparse information is normal

Missing data should not dominate the page or be presented as failure. Avoid large empty cards, completeness meters, or a checklist that implies the user must finish the record.

High-value missing information may expose a small contextual `Add …` affordance. Lower-value absence can simply stay out of the way until the user enters a full editing surface.

### 4. Focus is the fast-retrieval surface

Focus preserves the validated v1 lesson of a fast recruiter/interview-call workspace, but it is not a fixed script and not a second candidature model.

Focus is derived from authoritative information plus user presentation configuration. Every normal user-facing value is eligible for Focus. Users can control visibility, order, and relative prominence/space. Structural objects such as Sources, Concepts, ToDos, Documents and retained artifacts participate through suitable presentation.

Shipped defaults are useful starting points only. They must not hard-code a universal hierarchy such as status/priority/next-action being required.

During use, presentation should be predictable: information should not jump between unrelated locations because of arbitrary content length or inferred importance. Responsive rearrangement is acceptable when it preserves reading order and context.

### 5. Full access without a giant form

AAAAT must support complete inspection and editing of a candidature without recreating v1's giant field-sheet problem.

The exact screen decomposition is not fixed. A useful implementation may group work by intention, object, or context, but it should distinguish at least:

- quick retrieval / Focus;
- ordinary opportunity information;
- retained Sources;
- evaluation, strategy, research, questions, pitch and other useful information;
- shared Concepts;
- ToDos;
- Documents and retained application material;
- privacy / AI-disclosure and Focus-presentation controls;
- secondary Activity/provenance when useful.

Do not create a generic section framework merely to implement these groupings.

### 6. Raw/source material remains visible and trustworthy

Original material is first-class. A retained recruiter message, job posting, URL, application form or other Source must remain inspectable even after extraction or manual structuring.

Long source text should be readable when requested but should not overwhelm first-sight recognition. Extraction never replaces the Source.

### 7. Simple ordinary language, technical depth on demand

Ordinary career workflows should use product/domain language. Provider names, MCP, host configuration, filesystem details, IDs, migration concepts and protocol terminology do not belong in normal candidature/document work.

When a technical detail matters for trust, portability, privacy, setup or recovery, expose it in the relevant advanced/details surface rather than hiding it completely.

### 8. AI is optional assistance, not the navigation model

Human-only operation remains complete. AI assistance belongs near the information or document being worked on, and only when a suitable configured capability exists.

Do not make `AI assist` the conceptual center of the product. Connection/provider/setup controls belong in secondary setup/settings surfaces. AI-created information becomes ordinary editable user-owned information.

### 9. Stable local ownership and explicit trust

The interface should make local ownership understandable without repeating slogans on every screen. Workspace identity, backup/recovery, document ownership and disclosure controls should be discoverable and explicit when relevant.

Do not expose implementation status text as if it were user value (for example, framework/foundation readiness labels). Prefer user-meaningful state.

## Information architecture expectations

The exact top-level destination names remain an output of the #205 packaged audit, but the product must separate three classes of action.

### Primary work

Frequent career work should be directly reachable: finding/working with candidatures, lightweight ToDos, reusable professional information, and standalone CV/letter work.

A user opening AAAAT only to edit/render a CV or cover letter should not have to enter candidature management first.

### Global / workspace controls

Workspace switching, backup/restore, application setup, AI connections/capabilities, import/export configuration and other environment controls are global or workspace-level concerns. They should not compete visually with the user's main career content during ordinary work.

### Contextual actions

Actions that operate on one selected candidature, Source, Concept, ToDo, profile item, document or field should live near that context. Avoid global action walls or duplicate controls repeated in every panel.

## First-run and empty-state expectations

First run should answer, in this order:

1. What is AAAAT for?
2. What do I need to do now?
3. Can I use it without AI or a cloud account?
4. Where will my data live?
5. How do I recover an existing workspace if needed?

The primary choice is creating or opening a local workspace. Recovery is important but secondary. Setup guidance and AI configuration should not dominate before a workspace is selected unless a concrete prerequisite blocks use.

Branding may establish identity, but it must not displace the primary action or force important controls below fixed chrome at supported window sizes.

Once a workspace exists, the product should transition to ordinary work rather than continuing to behave like onboarding.

## Candidature / opportunity expectations

The candidature list/search surface should help users recognize and locate opportunities quickly. Rows/cards should stay compact enough to scan and should not become miniature dossiers.

Selecting a candidature should open a useful read projection by default. Complete editing remains reachable without switching into a technical/admin mode.

Useful information can include facts, compensation, dates, descriptions, requirements, research, strengths, evidence, concerns, questions, pitch, notes, application-form answers and user-defined fields. This vocabulary is not a mandatory checklist.

Sources are separate objects, not just hidden backing text for fields. Concepts are shared knowledge, not candidature-owned duplicates. ToDos remain lightweight. Documents/artifacts remain distinct from ordinary information fields.

## ToDo expectations

ToDos should feel lightweight: text/body, done/not-done, optional candidature relation. The UI should not imply scheduling, recurrence, workflow orchestration, AI task queues or predicted next actions unless separately introduced by product authority.

## Profile and reusable professional information

Profile/career information should be understandable as reusable user-owned professional context, not as an implementation schema.

The normal surface should summarize useful current information and allow deliberate editing. Advanced users must be able to inspect/edit individual profile items, variant differences, career context and visibility/disclosure controls without cloning entire profiles.

Do not require users to understand or administer variants before they can create a normal CV.

## Documents / VCVGenerator expectations

Document work is independently primary. Users should be able to create, edit and render CVs and cover letters without a candidature or AI.

The normal UI should focus on document content and useful reuse. Advanced users should be able to reach resolved content, deliberate overrides, source project files, `main.tex`, `aaaat.sty`, generated `data.tex`, output PDF and retained application artifacts where relevant.

Source ownership must be understandable: AAAAT may regenerate feeder-owned data, but it must not silently overwrite user-authored blueprint/package edits.

## Advanced-user auditability

Advanced access is a product property, not a debug mode. When relevant, the UI should make it possible to inspect:

- all normal stored candidature information;
- retained Source title/URL/full text;
- shared Concept aliases/definition/notes;
- ToDo body/state/association;
- canonical profile items and variant/document differences;
- document content and owned source/PDF output;
- retained application artifacts;
- Focus visibility/order/prominence configuration;
- AI disclosure controls independently from Focus visibility;
- meaningful Activity/provenance where the product records it;
- workspace path/ownership, backup/recovery and configuration export/import;
- configured AI connections/capabilities and honest host-access implications.

Internal IDs/hashes/migration metadata do not need to become ordinary UI content simply because advanced auditability is required.

## Visual hierarchy and layout

The interface should be dense enough to be useful, but not crowded. Prefer strong information grouping, readable typography, stable alignment, and responsive composition over decorative containers.

Avoid:

- giant static forms;
- walls of empty cards;
- repeated full-width action buttons for secondary operations;
- long raw text dominating recognition surfaces;
- layout that only works at one maximized desktop size;
- fixed footer/header regions that cover content;
- hover-only essential controls;
- unlabeled icon-only actions when the meaning is not obvious;
- arbitrary animation or movement during time-sensitive retrieval.

At the declared minimum window size, all primary content/actions must remain reachable, normally through responsive stacking and/or scrolling rather than clipping.

## Accessibility baseline

- keyboard users can reach primary destinations, controls and editors in sensible reading order;
- focus state is visible;
- actions use clear object-specific labels;
- meaning is not conveyed by color alone;
- destructive/discard confirmations are explicit, while routine navigation without unsaved work is not interrupted;
- unsaved drafts are never silently discarded by navigation or workspace switching;
- text remains readable without requiring hover;
- responsive layouts preserve logical reading order.

## Historical lessons deliberately not carried forward as contracts

Do not preserve these merely because v1 used them:

- `Smart View`, `Detailed View`, `User View` as mandatory top-level modes;
- a fixed 20/60/20 pane split;
- fixed center-card names or fixed notes-band placement;
- first-click-expand / second-click-focus mechanics;
- wx AUI or any v1 widget/module registry;
- `active/closed` as the only valid lifecycle representation;
- task queues as the normal user/AI interaction model;
- v1 provider/bridge/carrier mechanics;
- fixed preparation fields or a permanent field catalogue.

The surviving lesson is the user experience behind them: quick recognition, focused retrieval, complete editability, contextual depth, readable raw material, local control and low cognitive load.

## Acceptance questions for the #205 packaged audit

For every current screen/journey, record:

- What is the user's primary question/task here?
- What currently dominates attention? Should it?
- What is primary, secondary, contextual or advanced?
- Is any implementation terminology visible?
- Can a sparse/new user proceed without guessing required fields?
- Can an advanced user reach the complete authoritative information without leaving the graphical product?
- Are raw Sources, provenance/ownership and disclosure controls understandable where relevant?
- Does the layout remain usable at default and minimum supported sizes?
- Does the screen duplicate controls or concepts introduced by additive development?
- Could any visible section/control be removed, collapsed, relocated or merged without losing capability?

The audit should propose a coherent information architecture before any production renderer/CSS redesign begins.
