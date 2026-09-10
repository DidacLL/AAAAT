# AAAAT candidature interaction notes

Status: historical UX and implementation evidence from a completed bounded change. Not product authority or an active work contract.

Use this record only to understand existing candidature interaction after product meaning has been established through [`PRODUCT_DEFINITION.md`](../PRODUCT_DEFINITION.md). It is subordinate to the Product Definition and derived [`SPEC.md`](SPEC.md); [`UX_VISUAL_DIRECTION.md`](UX_VISUAL_DIRECTION.md) is visual guidance and [`UX_HISTORY_RECONCILIATION.md`](UX_HISTORY_RECONCILIATION.md) is historical evidence.

This record describes the candidature interaction considered before production renderer work. It deliberately does not prescribe the global shell, sidebar-vs-tabs choice, exact React composition, CSS, theme implementation, breakpoints, pane ratios, or final candidature section labels.

## 1. Interaction objective

The candidature workspace supports this intention sequence:

**find or capture a candidature → recognize it → recover useful context → inspect or edit detail → inspect original Sources → work with its application material**

The selected candidature remains the perceptual context throughout candidature work.

Supporting Concepts, notes/checkable reminders, privacy/presentation controls, AI assistance, and Activity appear where they help the current work. They do not become peer global destinations merely because they are separate domain concepts.

The design must preserve four properties simultaneously:

- sparse capture is immediately useful;
- fast recall is faster than administration;
- complete information remains editable and auditable;
- application material stays visibly related to the candidature that uses it.

## 2. Interaction states, not navigation widgets

Stage 1 defines five user intentions:

1. **Collection / search** — “Which candidature am I looking for?”
2. **Focus** — “What do I need to remember about this candidature now?”
3. **Complete information** — “What does AAAAT know, and what do I want to change?”
4. **Sources** — “What original material did this information come from?”
5. **Application material** — “What CVs, letters, and retained application artifacts belong to this candidature?”

These are interaction states. A later design may express them through tabs, segmented navigation, a local index, master/detail composition, or another conventional desktop mechanism. The widget is not authoritative.

The selected candidature identity must remain visible enough that a user cannot reasonably confuse which candidature they are editing, reading, or preparing material for.

## 3. Collection and search

The collection answers the retrieval question. It is not a CRM dashboard and should not become a miniature dossier for every record.

Required behavior:

- Search is visually and operationally prominent.
- Search can match meaningful retained candidature information, Source content, and linked Concept terms/aliases where supported by the product.
- Search can therefore find text buried in a recruiter message or job offer.
- Useful filters and archive access remain available but secondary to ordinary retrieval.
- New candidature creation is directly reachable.
- A result shows enough evidence to identify the record, not every known field.
- Company and role are useful when present but are not required labels.
- Sparse records use another meaningful retained clue such as Source title, URL, recruiter/message excerpt, custom information, or another useful value.
- When the match came from buried Source text or another non-title value, the result should expose a short match cue/snippet so the user understands why it matched.

Opening a result must not destroy search context unnecessarily. Returning to the collection should restore the prior query/filter state unless the user deliberately starts over.

Explicit selected comparison belongs around the collection/search context. It does not turn the collection into a second data-management product.

## 4. Sparse capture

Creating a candidature begins with the smallest useful request:

**“Paste or add whatever you have.”**

Valid first content includes a recruiter message, raw offer, URL, application-form text, one useful fact, or other job-related material the user wants to retain.

Required flow:

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

The capture surface may offer a secondary way to add structured information before saving, but it must not make the minimal path look incomplete.

When the user pastes raw material, AAAAT preserves it as a Source rather than silently replacing it with extracted fields. A URL can be retained even when no fetch or extraction occurs.

When extraction is available, it is contextual assistance in the same Source-capture flow after the Source is retained. The user sees the selected connection and exact Source material before requesting it, then reviews each proposed piece of ordinary editable information. It is never required for validity.

After Save, the candidature becomes selected and opens a useful recognition state, normally Focus. A very sparse candidature may use a compact retained Source clue/excerpt for recognition until richer information exists. This is a presentation fallback, not an AI summary or second data model.

## 5. Selected candidature context

Selecting a candidature establishes stable local context: **Candidature X**.

That context remains perceptually present while moving among Focus, complete information, Sources, and application material.

The identity uses whatever retained information is useful. Examples include company/role, recruiter clue, Source title, URL, meaningful excerpt, or user-defined information. These examples are not ranked and do not create required identity fields.

Do not introduce a naming ceremony solely to make navigation convenient.

## 6. Focus

Focus is the default fast-recall projection for a selected candidature.

Its primary job is recognition and recall under low attention, including unexpected recruiter calls.

Focus is read-first, stable in ordering, user-configurable, dense enough to be useful, calm enough to scan, and free of permanently expanded administration machinery.

Focus is not a fixed recruiter questionnaire, mandatory preparation workflow, AI-generated dashboard, lifecycle summary, or completeness report.

Normal candidature information participates according to Focus visibility/order/prominence configuration. Structural objects may participate through appropriate summaries:

- Sources: title/type/excerpt and path to inspect;
- Concepts: term plus concise definition/note access;
- checkable reminders: small current items;
- notes: readable selected content where configured;
- application material: useful presence/state summary.

Long Source text and deep audit/configuration controls do not occupy the primary Focus surface.

Focus customization is adjacent but secondary. The user can deliberately configure visibility, order, and prominence without making configuration controls permanent call-time chrome.

Focus visibility and AI disclosure remain independent.

## 7. Complete information and editing

The complete information state answers: **“What does AAAAT know about this candidature, and can I change it?”**

Populated information is readable by default. Editing is deliberate and local to the value or bounded group being changed.

Do not render every supported or user-definable value as an empty input.

Missing information is reached through small contextual Add affordances where useful, a deliberate path to browse/add other available information, and user-defined information creation where supported.

The ordinary layer exposes values and clear edit affordances. A detail/advanced layer may expose, where relevant:

- semantic label/type;
- clear/remove behavior;
- Focus visibility/order/prominence;
- AI disclosure;
- user-defined field definition;
- meaningful provenance/activity.

Those controls remain reachable without dominating first sight.

An editing draft belongs to a clear object/value/scope. Saving one draft must not commit or erase unrelated drafts. Editing does not require leaving the candidature context.

## 8. Sources

Sources are original candidature material and should feel trustworthy, readable, and distinct from extracted information.

The Source overview shows recognizable summaries rather than all raw bodies at once. Useful summary content can include title/type, URL, short excerpt, retained/updated date, and a useful length/content cue.

Short Sources may be readable directly when that remains clear and compact. Every Source must still have a deliberate full-content reading path.

For long Sources:

- the reading surface may occupy most available workspace;
- content uses page-level or reading-surface vertical scrolling;
- horizontal clipping is not acceptable;
- selected candidature identity remains recoverable;
- the user can return to the Source list without losing context unnecessarily.

Actions that specifically operate on a Source stay near that Source, for example editing retained content/metadata where allowed, removing it explicitly, asking configured AI to extract/help from this Source, or adding selected derived information to the candidature.

AI unavailability never disables Source reading or manual editing. Extraction never replaces the original Source.

## 9. Contextual Concepts, notes, and reminders

Concepts, notes, and reminders support candidature work without becoming peer navigation.

When a Concept is referenced in Focus or candidature information, the user can inspect its concise definition/notes in context and deliberately open deeper maintenance if needed. Ordinary recall should not require leaving Candidature X just to remember what a term means.

Plain candidature notes remain editable user-owned contextual information. They are not required to be checkable or promoted into ToDos.

A checkable reminder is deliberately smaller: lightweight text plus done/not-done state. In candidature context the interaction supports read, check/uncheck, add/edit/remove deliberately.

Do not add scheduling, recurrence, workflow state, AI task semantics, or “next action” hierarchy.

## 10. Privacy, presentation, and Activity

These concerns remain reachable from candidature context but are not primary reading destinations.

For a field/value, the user should be able to understand three independent facts/controls:

- the authoritative value is stored locally;
- Focus visibility is independently configurable;
- AI visibility/disclosure is independently configurable.

Local storage is a state/ownership fact, not a privacy toggle. The interaction must not imply that hiding from AI hides from Focus or deletes the local value.

Focus presentation configuration is naturally reachable from Focus and relevant information detail. AI disclosure is naturally reachable from the information or action whose disclosure it affects.

Activity/provenance is secondary evidence. It is available when the user needs to understand meaningful changes or origin, but it does not compete with Focus, information, Sources, or application material in ordinary work.

Internal UUIDs, hashes, migrations, or protocol payloads are not ordinary Activity content.

## 11. Application material

Application material is part of Candidature X.

The candidature shows associated working CVs/cover letters and retained exact artifacts actually used/submitted when available.

The user must be able to understand the distinction between a working document that may continue changing and a retained application artifact that preserves what was actually used. Stage 1 does not fix the exact labels or control shapes for that distinction.

Opening VCVGenerator from a candidature follows this context handoff:

```text
Candidature X
  → application material
  → select/create CV or cover letter
  → VCVGenerator document work
```

The transition carries explicit candidature context so the user understands the document is being worked on for Candidature X.

VCVGenerator may become the dominant work surface while the document is open, but there must be an obvious route back to Candidature X without reconstructing the association.

Stage 1 does not design standalone VCVGenerator. Stage 2 defines the full document interaction model and exact candidature-linked handoff/return behavior.

## 12. Contextual AI

AI appears as an action attached to the current object or intention.

Examples:

- Source: help extract useful information from this explicit Source;
- information: help with this value/question;
- candidature: evaluate or compare explicitly selected context;
- application material: help tailor/draft this CV or letter.

The user does not navigate to an AI workspace and rebuild context.

If no suitable configured capability exists, ordinary manual actions remain enabled. Unavailable assistance is explained only where relevant; provider/configuration administration is not injected into candidature work.

## 13. Dirty-state and navigation safety

Navigation must never silently discard drafts.

A dirty boundary exists whenever leaving the current interaction would destroy or replace unsaved user edits, for example switching candidature while editing, leaving a dirty Source editor, or opening another document when the current document draft cannot be preserved.

When crossing a dirty boundary, provide an explicit safe choice such as save and continue, discard and continue, or stay. Exact wording is not fixed.

No confirmation appears when there is no unsaved work.

Where the implementation can safely preserve a draft while the user inspects adjacent context, prefer preservation over unnecessary blocking prompts.

## 14. Default desktop composition

Stage 1 does not freeze pane geometry, but the default desktop design should use available width for orientation and speed.

A valid composition may show collection/search and selected candidature context together when space permits, provided that:

- collection remains scannable;
- selected candidature content remains readable;
- long content gets a clear reading surface;
- supporting context does not crowd the primary task;
- navigation and actions remain obvious.

The design must not assume a maximized window.

Illustrative low-fidelity composition:

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
│                   │      contextual support when relevant    │
└───────────────────┴──────────────────────────────────────────┘
```

The split and labels are illustrative, not final widgets.

## 15. Minimum `720×600` behavior

At the declared minimum, prioritize one principal task at a time rather than squeezing all desktop regions into unusable columns.

Required transition model:

```text
Collection/search
      ↓ select
Selected candidature
      ↓ open Source / Information / Material
Selected sub-context
      ↑ back / local context control
```

Required properties:

- Collection and selected detail may become separate interaction states.
- Selected candidature identity remains visible in selected context.
- A clear route returns to collection/search while preserving query state.
- Local candidature intentions remain reachable without horizontal clipping.
- Long Source text wraps and scrolls vertically.
- Contextual Concepts/reminders/advanced controls stack below or open deliberately rather than crushing primary content.
- Important actions remain labeled and keyboard reachable.
- Fixed chrome must not make the content unusable.
- Page/work-surface scrolling is preferable to nested miniature scroll panes.

Illustrative minimum collection:

```text
┌───────────────────────────────┐
│ Search candidatures…          │
│ [New candidature] [Filters]   │
├───────────────────────────────┤
│ result A — matching excerpt   │
│ result B — source clue        │
│ result C — useful identity    │
│                               │
│            scroll             │
└───────────────────────────────┘
```

Illustrative selected candidature:

```text
┌───────────────────────────────┐
│ ← Candidatures   Candidature X│
│ local candidature intentions  │
├───────────────────────────────┤
│                               │
│ current readable work surface │
│                               │
│ contextual support below      │
│                               │
│            scroll             │
└───────────────────────────────┘
```

These express hierarchy, not final navigation controls.

## 16. Empty, loading, error, and optional-capability states

### No candidatures

Explain that almost any job-related material is enough to begin and offer one clear New candidature action. Do not present a required field checklist.

### Empty Focus

A sparse candidature can still show its best retained recognition clue and a small path to add/configure Focus information. Do not present a completeness failure.

### No Sources

Explain that Sources preserve original material and offer Add Source. The candidature remains valid without one.

### No application material

Offer create/associate CV or cover letter without implying it is required to complete the candidature.

### Loading one context

Keep Candidature X and local orientation visible while the affected content loads where practical. Do not blank the entire product for a contextual request.

### Error loading or saving contextual content

State what failed and whether authoritative data changed. Preserve current candidature orientation and existing readable information when possible.

### AI unavailable

Manual work remains normal. Contextual AI actions may be absent or explain that assistance is unavailable; candidature work does not look broken.

### TeX unavailable

Candidature and application-material association remain usable. Rendering limitations are explained in document context rather than disabling candidature work.

## 17. Canonical scenario walkthroughs

### Sparse recruiter-message capture

```text
New candidature
→ paste recruiter message
→ Save
→ selected candidature
→ Focus shows recognizable retained clue
```

No other field is mandatory.

### Unexpected recruiter call

```text
Collection/search
→ search remembered phrase
→ result shows matching retained clue
→ select candidature
→ Focus
→ read configured call context
→ inspect Concept or Source only if needed
```

No edit form or AI setup interrupts the path.

### Serious maintenance

```text
Select candidature X
→ Focus for orientation
→ complete information
→ edit one value
→ inspect Source
→ return to information
→ add note/reminder
→ inspect application material
```

Candidature X remains the local context throughout.

### Long offer reading

```text
Candidature X
→ Sources
→ select long job offer
→ full readable Source surface
→ optional contextual extraction/help
→ return to Source list or candidature work
```

The full offer remains reachable without occupying permanent Focus space.

### Application CV

```text
Candidature X
→ application material
→ select/create CV
→ enter VCVGenerator with Candidature X context
→ edit/render
→ return to Candidature X
```

The candidature continues to show the related working document and retained used artifact where applicable.

### Dirty candidature switch

```text
Candidature X editor (dirty)
→ select Candidature Y
→ explicit safe draft boundary
→ continue only after draft is safe
```

If nothing is dirty, the switch is immediate.

## 18. Acceptance decisions captured by Stage 1

1. Collection/search is a retrieval surface, not a CRM dashboard.
2. Sparse capture has one required outcome: retain what the user has and Save.
3. Selecting a candidature establishes stable local context and normally opens Focus.
4. Focus, complete information, Sources, and application material are principal selected-candidature intentions, not newly invented global destinations.
5. Concepts, notes/reminders, privacy/presentation controls, Activity, and AI remain contextual/progressively disclosed.
6. Sources remain independently readable original evidence and can drive explicit contextual assistance.
7. Application documents are visible from their candidature; opening VCVGenerator carries candidature context.
8. Dirty navigation protects unsaved work without confirmation noise when clean.
9. Default desktop may use simultaneous collection/detail when useful; `720×600` transitions to one principal surface rather than clipping or crushing panes.
10. Empty/loading/error/optional-capability states preserve orientation and manual/no-AI usability.

## 19. Decisions deliberately deferred

Stage 1 does not decide:

- final global navigation;
- sidebar, top navigation, tabs, or another shell mechanism;
- exact local candidature labels;
- exact desktop split proportions;
- exact breakpoint values;
- exact component structure;
- visual tokens/theme implementation;
- standalone VCVGenerator interaction architecture;
- reusable professional/profile interaction architecture;
- Settings/setup/recovery architecture;
- final global shell synthesis.

## 20. Stage-1 acceptance check

The design passes if all answers are yes:

- Can the user save almost any job-related material immediately without organizing it first? **Yes.**
- Can search identify a candidature from text buried in retained Source material or other meaningful retained context? **Yes.**
- Can the user reach Focus immediately after identifying a candidature? **Yes.**
- Can all important information remain inspectable/editable without a giant form? **Yes.**
- Can full Sources remain trustworthy and readable without dominating Focus? **Yes.**
- Are candidature-linked CVs/letters visible from the candidature? **Yes.**
- Do Concepts, notes, and reminders remain contextual rather than product pillars? **Yes.**
- Does navigation protect unsaved work without confirmation noise when clean? **Yes.**
- Is `720×600` addressed through transition/stacking/scrolling rather than clipping? **Yes.**
- Is the candidature journey complete without AI? **Yes.**
- Does this avoid deciding the global shell before Stages 2–4? **Yes.**
