# AAAAT candidature interaction contract

Status: Stage 1 design contract for Mission #204 / Issue #207.

This document is subordinate to `docs/UX_DEFINITION.md`, which remains the canonical durable UX contract. `docs/UX_VISUAL_DIRECTION.md` supplies visual character only. `docs/UX_HISTORY_RECONCILIATION.md` is historical evidence only.

This contract defines the candidature journey before production renderer work. It deliberately does not define the global shell, sidebar-vs-tabs choice, exact React composition, CSS, theme implementation, breakpoints, pane ratios, or final candidature section labels.

## 1. Interaction objective

The candidature workspace exists to let the user move naturally through this intention sequence:

**find or capture a candidature → recognize it → recover useful context → inspect or edit detail → inspect original Sources → work with its application material**

The candidature remains the perceptual context throughout selected-candidature work.

Supporting Concepts, notes/checkable reminders, privacy/presentation controls, AI assistance, and Activity appear where they help that work. They do not become peer global destinations merely because they are separate domain concepts.

The design must preserve four product properties simultaneously:

- sparse capture is immediately useful;
- fast recall is faster than administration;
- complete information remains editable and auditable;
- application material stays visibly related to the candidature that uses it.

## 2. Interaction states, not navigation widgets

Stage 1 defines five user intentions inside candidature work:

1. **Collection / search** — “Which candidature am I looking for?”
2. **Focus** — “What do I need to remember about this candidature now?”
3. **Complete information** — “What does AAAAT know, and what do I want to change?”
4. **Sources** — “What original material did this information come from?”
5. **Application material** — “What CVs, letters, and retained application artifacts belong to this candidature?”

These are interaction states. A later design may express them through tabs, segmented navigation, a local index, a master/detail composition, or another conventional desktop mechanism. The widget is not authoritative.

The selected candidature identity must remain visible enough that a user cannot reasonably confuse which candidature they are editing, reading, or preparing material for.

## 3. Collection and search

The collection answers only the retrieval question. It is not a CRM dashboard and should not become a miniature dossier for every record.

### Required behavior

- Search is visually and operationally prominent.
- Search may match meaningful retained candidature information and Source content, including text buried in a recruiter message or job offer.
- Useful filters and archive access remain available but are secondary to ordinary retrieval.
- Creation of a new candidature is directly reachable.
- A result or summary shows enough evidence to identify the record, not every known field.
- Company and role are useful when present but are not required labels.
- Sparse records use another meaningful signal: Source title, URL host/path, recruiter/message excerpt, custom information, or another retained clue.
- When a search match comes from buried Source text or another non-title value, the result should show a short match cue/snippet so the user can understand why it matched.

### Search continuity

Opening a candidature from search must not destroy the search context unnecessarily. Returning to the collection should restore the prior query/filter state unless the user deliberately starts over.

This matters for rapid recall and selected comparison because retrieval often involves checking more than one plausible match.

### Aggregate work boundary

Collection-level comparison begins from explicit user selection of candidatures. It remains an aggregate candidature action; it does not turn the collection into a second data-management product.

## 4. Sparse capture

Creating a candidature begins with the smallest useful request:

**“Paste or add whatever you have.”**

Acceptable first content includes:

- recruiter message;
- raw job offer;
- URL;
- application-form text;
- one manually entered useful fact;
- another piece of job-related material the user wants to retain.

### Required creation flow

```text
New candidature
    ↓
Add/paste whatever exists
    ↓
Save
    ↓
Candidature exists and becomes selected
```

No company, role, status, priority, next action, AI setup, profile choice, CV choice, or completeness step is required before Save.

### Optional structure

The capture surface may offer a secondary way to add structured information before saving, but it must not visually redefine the minimal path as incomplete.

AI extraction is contextual assistance after or alongside explicit Source capture when available. It is never required for record validity.

### Source interpretation

When the user pastes retained raw material, AAAAT should preserve it as a Source rather than silently replacing it with extracted fields. A URL may be retained as a Source even when no network fetch or extraction occurs.

### Post-save state

After Save, the new candidature becomes the selected candidature. The user lands in a useful recognition state, normally Focus.

For a very sparse candidature, Focus may use a compact Source-derived recognition summary/excerpt until the user configures or adds richer information. This is a presentation fallback, not an AI summary and not a second data model.

## 5. Selected candidature context

Selecting a candidature establishes a stable local context: **Candidature X**.

That context remains perceptually present while moving among Focus, complete information, Sources, and application material.

The selected context should show a compact identity using the best useful information available. It must degrade gracefully when company/role are absent.

Examples of useful identity signals, in descending availability rather than mandated hierarchy:

- company + role;
- role + recruiter/source clue;
- recruiter/company clue;
- Source title;
- URL host/path;
- meaningful excerpt;
- user-defined label or useful field.

Do not create a required naming ceremony solely to make navigation convenient.

## 6. Focus

Focus is the default fast-recall projection for a selected candidature.

Its primary job is to support recognition and recall under low attention, including an unexpected recruiter call.

### Interaction character

Focus is:

- read-first;
- stable in ordering;
- configurable by the user;
- dense enough to be useful;
- calm enough to scan quickly;
- free of permanently expanded editing or administration machinery.

It is not:

- a fixed recruiter questionnaire;
- a mandatory preparation workflow;
- an AI-generated dashboard;
- a lifecycle summary;
- a completeness report.

### Content participation

Normal candidature information participates according to Focus visibility/order/prominence configuration.

Structural objects may participate through appropriate summaries:

- Sources: title/type/excerpt/link to inspect;
- Concepts: term plus concise definition/note access;
- reminders: small checkable items;
- application material: useful presence/state summary;
- notes: readable selected content where configured.

Long Source text and deep technical/audit controls do not occupy the primary Focus surface.

### Configuration access

Focus customization is adjacent but secondary. The user can deliberately configure visibility, order, and prominence without making configuration controls permanent call-time chrome.

Focus visibility and AI disclosure remain independent.

## 7. Complete information and editing

The complete information state answers: **“What does AAAAT know about this candidature, and can I change it?”**

### Read-first structure

Populated information should be readable by default. Editing is deliberate and local to the value or bounded group being changed.

Do not render every supported or user-definable value as an empty input.

Missing information is handled through:

- small contextual Add affordances for particularly relevant absent information;
- one deliberate path to browse/add other available information;
- user-defined information creation where the product supports it.

### Progressive depth

The ordinary layer exposes the value and a clear edit affordance.

A detail/advanced layer may expose, where relevant:

- semantic label/type;
- clear/remove behavior;
- Focus visibility/order/prominence;
- AI disclosure;
- user-defined field definition;
- meaningful provenance/activity.

Those controls must remain reachable without dominating first sight.

### Editing scope

An editing draft belongs to a clear object/value/scope. Saving one draft must not commit or erase unrelated drafts.

Editing does not require leaving the candidature context.

## 8. Sources

Sources are original candidature material and should feel trustworthy, readable, and distinct from extracted information.

### Source overview

The Source state first shows recognizable Source summaries, not all raw bodies at once.

Useful summary content can include:

- Source title/type;
- URL when present;
- retained/updated date where meaningful;
- short excerpt;
- indication of length or content kind where useful.

### Source reading

Opening one Source prioritizes readable full content.

For long Sources:

- the reading surface may occupy most of the available workspace;
- content uses page-level or reading-surface scrolling;
- horizontal clipping is not acceptable;
- selected candidature identity remains recoverable;
- the user can return to the Source list without losing position/context unnecessarily.

### Source actions

Actions that specifically operate on a Source stay near that Source, for example:

- edit retained Source metadata/content where allowed;
- remove the Source with explicit destructive handling;
- ask configured AI to extract or help from this explicit Source;
- add selected derived information to the candidature.

AI unavailability does not disable Source reading or manual editing.

Extraction never replaces the original Source.

## 9. Contextual Concepts and reminders

Concepts and reminders support candidature work without becoming peer navigation.

### Concepts

When a Concept is referenced in Focus or candidature information, the user can inspect its concise definition/notes in context and deliberately open deeper maintenance if needed.

The ordinary interaction should not require leaving Candidature X simply to remember what a term means.

### Notes/checkable reminders

A reminder is a lightweight checkable note. In candidature context it may appear near Focus or supporting context as appropriate.

The interaction supports:

- read text;
- check/uncheck;
- add/edit/remove deliberately.

Do not add scheduling, recurrence, workflow state, AI task semantics, or “next action” hierarchy.

## 10. Privacy, presentation, and Activity

These concerns remain reachable from candidature context but are not primary reading destinations.

### Privacy and presentation

For a field/value the user should be able to reach the independent controls that matter:

- stored locally;
- visible in Focus;
- visible to AI.

The interaction must not imply that hiding from AI hides from Focus or deletes the local value.

Focus presentation configuration is naturally reachable from Focus and from relevant information detail. AI disclosure is naturally reachable from the information or action whose disclosure it affects.

### Activity/provenance

Activity is secondary evidence. It is available when the user needs to understand meaningful changes or provenance, but it does not compete with Focus, information, Sources, or application material in ordinary work.

Internal UUIDs, hashes, migrations, or protocol payloads are not ordinary Activity content.

## 11. Application material

Application material is part of Candidature X.

The candidature shows its associated working CVs/cover letters and retained exact artifacts actually used/submitted when available.

### Required distinction

The user must be able to understand the difference between:

- a working document that may continue changing;
- a retained application artifact that preserves what was actually used.

This distinction is semantic, not a requirement for exact labels or visual controls in Stage 1.

### Opening VCVGenerator from a candidature

The transition is:

```text
Candidature X
  → application material
  → select/create CV or cover letter
  → VCVGenerator document work
```

The transition carries explicit candidature context so the user understands the document is being worked on for Candidature X.

VCVGenerator may become the dominant work surface while the document is open, but there must be an obvious route back to Candidature X without reconstructing the association.

Stage 1 does not design standalone VCVGenerator. Stage 2 will define the full document interaction model and the exact candidature-linked handoff/return behavior.

## 12. Contextual AI

AI appears as an action attached to the current object or intention.

Examples:

- Source: “Help extract useful information from this Source.”
- information: “Help with this value/question.”
- candidature: “Evaluate or compare this selected context.”
- application material: “Help tailor/draft this CV or letter.”

The user does not navigate to an AI workspace and reselect context.

If no suitable configured capability exists:

- ordinary manual actions remain enabled;
- unavailable assistance is explained only where relevant;
- provider/configuration administration is not injected into the candidature workspace.

## 13. Dirty-state and navigation safety

Navigation must never silently discard drafts.

A **dirty boundary** exists whenever leaving the current interaction would destroy or replace unsaved user edits.

Examples include:

- switching to another candidature while editing a value;
- leaving a Source editor with unsaved changes;
- opening another document when the current document handoff would discard unsaved work;
- switching significant candidature context if the current editor cannot preserve its draft.

When a dirty boundary is crossed, the user is given an explicit safe choice such as:

- save and continue;
- discard and continue;
- stay.

Exact wording is not fixed.

No confirmation is shown when there is no unsaved work.

Where the implementation can preserve a draft safely while the user inspects adjacent context, it should prefer preservation over unnecessary blocking prompts.

## 14. Default desktop composition

Stage 1 does not freeze pane geometry, but the default desktop design should exploit available width for orientation and speed.

A valid composition may show collection/search and selected candidature context together when space permits, provided that:

- the collection remains scannable rather than becoming tiny;
- the selected candidature has enough width for readable Focus/information/Source content;
- long content has a clear reading surface;
- supporting context does not crowd the primary task;
- navigation and actions remain obvious.

The design must not assume a maximized window.

### Low-fidelity default example

```text
┌──────────────────────────────────────────────────────────────┐
│ candidature collection/search      selected: Candidature X  │
├───────────────────┬──────────────────────────────────────────┤
│ Search…           │ local candidature intentions            │
│ New candidature   │ Focus / Information / Sources / Material│
│                   ├──────────────────────────────────────────┤
│ result A          │                                          │
│ result B          │      current selected work surface       │
│ result C          │                                          │
│                   │      contextual support appears here     │
│                   │      only when relevant                  │
└───────────────────┴──────────────────────────────────────────┘
```

The literal row, split, and labels are illustrative only.

## 15. Minimum `720×600` behavior

At the declared minimum, the design prioritizes one principal task at a time rather than squeezing all desktop regions into unusable columns.

### Required transition model

```text
Collection/search
      ↓ select
Selected candidature
      ↓ open Source / Information / Material
Selected sub-context
      ↑ back / local context control
```

### Required properties

- Collection and selected detail may become separate interaction states.
- The selected candidature identity remains visible in selected context.
- A clear route returns to collection/search while preserving query state.
- Local candidature intentions remain reachable without horizontal clipping.
- Long Source text uses vertical scrolling and wrapping.
- Contextual Concepts/reminders/advanced controls stack below or open deliberately rather than crushing primary content.
- Important actions remain labeled and reachable by keyboard.
- Fixed chrome must not consume enough space to make the content unusable.
- Page/work-surface scrolling is preferable to nested miniature scroll panes.

### Low-fidelity minimum examples

Collection:

```text
┌───────────────────────────────┐
│ Search candidatures…          │
│ [New candidature] [Filters]   │
├───────────────────────────────┤
│ result A — matching excerpt   │
│ result B — source clue        │
│ result C — company / role     │
│                               │
│            scroll             │
└───────────────────────────────┘
```

Selected candidature:

```text
┌───────────────────────────────┐
│ ← Candidatures   Candidature X│
│ Focus · Info · Sources · …    │
├───────────────────────────────┤
│                               │
│ current readable work surface │
│                               │
│ contextual support below      │
│                               │
│            scroll             │
└───────────────────────────────┘
```

Again, these wireframes express interaction hierarchy, not final widgets.

## 16. Representative state behavior

### No candidatures

Explain that almost any job-related material is enough to begin and offer one clear New candidature action.

Do not present a required field checklist.

### Empty Focus

A sparse candidature can still show its best recognition clue and a small path to add/configure Focus information. Do not present a completeness failure.

### No Sources

Explain that Sources preserve original material and offer Add Source. The candidature remains valid without one.

### No application material

Offer create/associate CV or cover letter without implying it is required to complete the candidature.

### Loading one context

Keep Candidature X and local navigation visible while the affected content loads where practical. Do not blank the entire application for a contextual request.

### Error loading or saving contextual content

State what failed and whether authoritative data changed. Preserve the current candidature and existing readable information when possible.

### AI unavailable

Manual work remains normal. Contextual AI actions may be absent or explain that assistance is unavailable; the candidature does not look broken.

### TeX unavailable

Candidature and application-material association remain usable. Rendering-specific limitations are explained in the document context rather than disabling candidature work.

## 17. Canonical scenario walkthroughs

### A. Recruiter message capture

```text
New candidature
→ paste recruiter message
→ Save
→ selected candidature
→ Focus shows recognizable retained clue
```

No other field is mandatory.

### B. Unexpected recruiter call

```text
Collection/search
→ search remembered phrase
→ result shows Source-match excerpt
→ select candidature
→ Focus
→ read configured call context
→ inspect Concept or Source only if needed
```

No edit form or AI setup interrupts the path.

### C. Serious maintenance

```text
Select candidature X
→ Focus for orientation
→ complete information
→ edit one value
→ inspect Source
→ return to information
→ add reminder
→ inspect application material
```

Candidature X remains the local context throughout.

### D. Long offer reading

```text
Candidature X
→ Sources
→ select long job offer
→ full readable Source surface
→ optional contextual extraction/help
→ return to Source list or candidature work
```

The full offer is reachable without occupying permanent Focus space.

### E. Application CV

```text
Candidature X
→ application material
→ select/create CV
→ enter VCVGenerator with Candidature X context
→ edit/render
→ return to Candidature X
```

The candidature continues to show the related working document and retained used artifact where applicable.

### F. Dirty candidature switch

```text
Candidature X information editor (dirty)
→ select Candidature Y
→ explicit save/discard/stay boundary
→ continue only after draft is safe
```

If nothing is dirty, the switch is immediate.

## 18. Acceptance decisions captured by this Stage

Stage 1 establishes these interaction decisions:

1. Candidature collection/search is a retrieval surface, not a CRM dashboard.
2. Sparse capture has one mandatory action: retain whatever the user has and Save.
3. Selecting a candidature establishes stable local context and normally opens Focus.
4. Focus, complete information, Sources, and application material are the principal selected-candidature intentions.
5. Concepts, reminders, privacy/presentation controls, Activity, and AI remain contextual/progressively disclosed.
6. Sources remain independently readable original evidence and can drive explicit contextual assistance.
7. Application documents are visible from their candidature; opening VCVGenerator carries candidature context.
8. Dirty navigation protects unsaved work without routine confirmation noise.
9. Default desktop may use simultaneous collection/detail when useful; `720×600` transitions to one principal surface rather than clipping or crushing panes.
10. Empty/loading/error/optional-capability states preserve orientation and manual/no-AI usability.

## 19. Decisions deliberately deferred

This Stage does not decide:

- final global navigation;
- whether the product uses a sidebar, top navigation, tabs, or another shell;
- exact local candidature section labels;
- exact desktop split proportions;
- exact breakpoint values;
- exact component structure;
- visual tokens/theme implementation;
- standalone VCVGenerator interaction architecture;
- reusable professional/profile interaction architecture;
- Settings/setup/recovery architecture;
- final global shell synthesis.

Those remain sequenced later under Mission #204.

## 20. Stage-1 acceptance check

The design passes if all answers are yes:

- Can the user save almost any job-related material immediately without organizing it first? **Yes.**
- Can search identify a candidature from text buried in retained Source material? **Yes.**
- Can the user reach Focus immediately after identifying a candidature? **Yes.**
- Can all important information remain inspectable/editable without a giant form? **Yes.**
- Can full Sources remain trustworthy and readable without dominating Focus? **Yes.**
- Are candidature-linked CVs/letters visible from the candidature? **Yes.**
- Do Concepts/reminders remain contextual rather than product pillars? **Yes.**
- Does navigation protect unsaved work without confirmation noise when clean? **Yes.**
- Is `720×600` addressed through transition/stacking/scrolling rather than clipping? **Yes.**
- Is the candidature journey complete without AI? **Yes.**
- Does this avoid deciding the global shell before Stages 2–4? **Yes.**
