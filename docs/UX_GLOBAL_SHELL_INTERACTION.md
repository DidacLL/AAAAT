# AAAAT global shell and navigation interaction contract

Status: Stage 5 design contract for Mission #204 / Issue #217.

This document is subordinate to `docs/UX_DEFINITION.md` and synthesizes the accepted bounded interaction contracts:

- `docs/UX_CANDIDATURE_INTERACTION.md`;
- `docs/UX_VCVGENERATOR_INTERACTION.md`;
- `docs/UX_PROFESSIONAL_INFORMATION_INTERACTION.md`;
- `docs/UX_SETTINGS_RECOVERY_INTERACTION.md`.

`docs/UX_VISUAL_DIRECTION.md` supplies visual character only. `docs/UX_HISTORY_RECONCILIATION.md` is historical evidence only.

This contract defines the durable global information hierarchy and shell interaction. It does not define React components, routing libraries, CSS implementation, exact pixel geometry, design-system tokens, or persistence architecture.

## 1. Global product hierarchy

AAAAT has three primary work destinations:

1. **Candidatures** — job/application work.
2. **CVs & letters** — standalone and candidature-linked document work.
3. **Professional information** — reusable user-owned professional content.

**Settings** is secondary administration and is not a peer primary work destination.

This destination set is derived from accepted user journeys, not persisted entities or implemented screens.

## 2. Why these destinations exist

### Candidatures

Candidatures is the primary destination for job/application work because a Candidature is the durable central context for an application and contains the user’s retained Sources, Focus, complete information, application material, and contextual support.

### CVs & letters

CVs & letters is a primary destination because standalone CV/cover-letter work is independently core and must be directly reachable without a candidature.

The same destination also hosts document work entered from Candidature X; candidature context is retained during that handoff.

### Professional information

Professional information is a primary destination because the user maintains reusable source content independently of any one candidature or document.

The destination is named for the user’s content, not for implementation concepts such as canonical profile, variants, patches, or career-context tables.

### Settings

Settings supports workspace, backup/recovery, TeX, AI connections, portability, and external-host administration. These are important but infrequent and secondary to ordinary work.

## 3. Explicit non-destinations

The following are not global primary destinations:

- Focus;
- Sources;
- application material;
- ToDos/reminders;
- Concepts;
- Activity/provenance;
- privacy/presentation controls;
- AI;
- retained artifacts;
- variants/saved variations;
- TeX;
- backup/recovery;
- provider connections;
- generic Documents;
- a generic dashboard/Home area.

They remain contextual, local, secondary, or progressively disclosed according to their accepted Stage contracts.

## 4. No generic Home/dashboard requirement

AAAAT does not require a dashboard or Home destination merely to provide a landing page.

A generic dashboard would duplicate candidature retrieval, document selection, reminders, Settings status, or other existing contexts and would recreate the additive/entity-driven hierarchy that Mission #204 is replacing.

If a future bounded user need justifies an overview, it must be derived from that need rather than introduced as shell filler.

## 5. Primary shell behavior

The shell provides stable, ordinary-user access to:

- Candidatures;
- CVs & letters;
- Professional information.

The primary destinations should remain recognizable and consistently placed across ordinary work.

The exact control may be a rail, top-level switcher, conventional sidebar, or equivalent desktop navigation mechanism. Implementation may choose the smallest conventional mechanism that preserves the hierarchy.

The interaction contract requires:

- labels remain understandable without icon knowledge;
- current primary destination is apparent;
- primary navigation does not compete visually with the current work surface;
- primary navigation does not expand into a tree of entities/features;
- changing primary destination preserves dirty-state safety.

## 6. Secondary shell utilities

Secondary shell access includes:

- Settings;
- workspace identity/switching entry where appropriate;
- other truly global utility actions justified by existing product semantics.

Settings should be reachable consistently but visually secondary to the three work destinations.

Backup, TeX setup, AI connections, and external-host configuration are reached through Settings or contextual handoffs into the relevant Settings section; they do not receive independent shell destinations.

## 7. Initial/open behavior

After a usable workspace is open, AAAAT should restore the last safe persisted work context when doing so is understandable and does not imply recovery of an unsaved draft that was never persisted.

If no meaningful prior context exists, open **Candidatures** at the collection/search state.

This avoids a generic Home page while preserving continuity for returning users.

First run remains governed by Stage 4: create/open workspace first, then enter ordinary work.

## 8. Candidatures destination

Entering Candidatures establishes the collection/search context.

The local candidature interaction then owns:

- search/filter/archive;
- sparse capture;
- selection of Candidature X;
- Focus;
- complete information/editing;
- Sources;
- application material;
- contextual Concepts/notes/reminders/privacy/Activity.

The global shell does not duplicate those local intentions.

## 9. CVs & letters destination

Entering CVs & letters directly establishes standalone document selection/creation.

A user can:

- select/create a CV;
- select/create a cover letter;
- edit/render/export without any candidature;
- work fully without AI.

When CVs & letters is entered from Candidature X application material, the destination remains the same document system but carries a visible candidature context.

## 10. Candidature → CV/letter handoff

Required interaction:

```text
Candidature X
  → application material
  → open/create CV or letter
  → CVs & letters / current document
      context: Candidature X
  → return to Candidature X application material
```

The user should be able to tell both:

- “I am in CV/letter work”; and
- “this document work is for Candidature X.”

The candidature context must not become a second global navigation level.

## 11. CV/letter → Professional information handoff

Required interaction:

```text
Current CV/letter
  → open contributing reusable information
  → Professional information / selected item
      return context: current document
  → save/cancel
  → return to current document
```

The global destination changes to Professional information because the user is deliberately editing reusable source content.

The shell/context cue must preserve a clear return path to the originating document.

Document dirty-state safety remains active during the handoff.

## 12. Contextual Settings handoff

Ordinary work may enter Settings at a specific subsection when an optional capability or administration action is relevant.

Examples:

```text
CV render unavailable
  → Settings / Document rendering
  → return to current CV
```

```text
AI action has no configured route
  → Settings / AI connections
  → return to originating Source/field/document
```

```text
Workspace backup action
  → Settings / Backup & recovery
```

Contextual Settings entry should preserve a return path when practical.

Settings does not become primary navigation because it can be reached contextually.

## 13. AI is never shell navigation

AI does not receive a primary destination, shell button representing a workspace, or global administration page outside Settings.

AI actions remain attached to the current object/intention.

The shell may expose no permanent AI affordance at all. Contextual surfaces decide when assistance is relevant.

## 14. Sources, Concepts, reminders, and Activity remain contextual

The shell must not promote candidature-owned/supporting concepts into global work destinations.

- Sources belong to Candidature X.
- Concepts are inspected/reused contextually and may have advanced maintenance without becoming a primary work area.
- reminders are lightweight contextual notes/checkable items.
- Activity is secondary provenance.

A future aggregate convenience view does not automatically earn primary shell status.

## 15. Professional information versus variants

The primary destination is **Professional information**, not Profiles, Variants, Career rules, or Canonical data.

Saved variations are reached from within Professional information or document reuse where relevant.

The shell does not expose variation identities as destinations.

## 16. Settings versus setup status

The shell should not permanently display setup completion, TeX health, AI connection health, backup freshness, or provider status as primary work chrome.

Capability status appears where relevant:

- Render surfaces TeX availability;
- AI actions surface route availability;
- Settings shows administrative status/details.

This prevents optional setup from dominating ordinary work.

## 17. Search boundary

The shell does not require a universal global search box.

Candidature retrieval search belongs prominently inside **Candidatures** because its canonical purpose is to find a candidature from meaningful retained material, including Source text.

Document selection may use local search/filter inside CVs & letters when needed.

Professional information may use local finding/search when a large information set justifies it.

Do not create a global search whose unclear scope mixes candidatures, raw Sources, documents, profile items, Settings, and commands without a demonstrated user need.

## 18. Dirty-state behavior across global navigation

Changing global destination must never silently destroy unsaved work.

A dirty boundary exists when leaving the current destination/context would discard an unsaved draft that cannot be safely preserved.

When a dirty boundary is crossed, provide a clear safe choice such as:

- save and continue;
- discard and continue;
- stay.

No confirmation is shown for clean navigation.

Where drafts can be safely preserved while the user temporarily visits another context, preservation is preferable to unnecessary blocking prompts.

## 19. Navigation state and back behavior

The user should be able to understand the difference between:

- switching global work destination;
- moving within a destination;
- following a contextual handoff and returning.

Contextual return should return to the originating object/surface, not merely to the root of the destination.

Examples:

- Professional information opened from CV X returns to CV X.
- Settings opened from CV X render error returns to CV X.
- CV/letter opened from Candidature X returns to Candidature X application material.

## 20. Stable orientation

The shell provides two layers of orientation:

1. **global work area** — Candidatures / CVs & letters / Professional information;
2. **local context** — Candidature X, current document, selected professional item, or Settings subsection.

The interface should never require the user to infer current context solely from content in the work surface.

## 21. Workspace identity

Workspace identity is global utility context, not a primary destination.

When multiple workspaces or switching matter, the current workspace should be inspectable from a consistent secondary shell location or Settings.

Workspace switching must obey dirty-state protections.

## 22. Keyboard and recognition expectations

At interaction level:

- primary work destinations must be keyboard reachable;
- visible labels should remain available rather than relying only on icons;
- focus order should move logically from shell to local navigation/work surface;
- keyboard users must be able to reach contextual return actions;
- selected/current destination state must be programmatically and visually apparent;
- smaller-window adaptations must not hide the only route to a primary destination.

Exact shortcuts are implementation decisions unless existing product contracts already define them.

## 23. Default desktop shell

A valid default composition is:

```text
┌──────────────────────────────────────────────────────────────────┐
│ AAAAT                                  workspace / Settings       │
├───────────────┬──────────────────────────────────────────────────┤
│ Candidatures  │                                                  │
│ CVs & letters │             current work surface                 │
│ Professional  │                                                  │
│ information   │             local context/navigation             │
│               │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

This example chooses a compact persistent primary-navigation region for clarity, but the implementation may use an equivalent top-level switcher if it preserves the same hierarchy and minimum-size behavior.

No dashboard/home destination is implied.

## 24. Candidature-linked document example

```text
┌──────────────────────────────────────────────────────────────────┐
│ AAAAT                                  workspace / Settings       │
├───────────────┬──────────────────────────────────────────────────┤
│ Candidatures  │ CV: Backend Engineer                             │
│ CVs & letters │ For: Candidature X                 [Return to X] │
│ Professional  ├──────────────────────────────────────────────────┤
│ information   │                                                  │
│               │ document work                                   │
│               │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

The exact labels/control placement are not frozen; the simultaneous global + candidature orientation is.

## 25. Minimum `720×600` shell behavior

At `720×600`, the shell must consume minimal space and preserve one principal work surface.

Required properties:

- all three primary destinations remain reachable with understandable labels;
- navigation may compact, collapse, or transition, but must not become permanently icon-only without accessible labels;
- the work surface receives the majority of available space;
- contextual return cues remain visible/reachable;
- local Stage contracts may transition list/detail rather than compress panes;
- vertical scrolling is preferable to clipping;
- Settings utility access remains reachable without occupying primary navigation space;
- no fixed shell chrome obscures essential content/actions.

A valid compact pattern may show a small destination switcher/menu while a local destination uses the rest of the window. The exact responsive widget is an implementation decision.

## 26. Minimum-size orientation example

```text
┌──────────────────────────────────────┐
│ [Work: Candidatures ▾]   [Settings]  │
│ Candidature X                         │
├──────────────────────────────────────┤
│                                      │
│ current local work surface           │
│                                      │
│ scroll                               │
└──────────────────────────────────────┘
```

The drop-down is illustrative; the contract is that primary work-area switching remains labeled/reachable while local context remains clear.

## 27. Empty/global states

### No candidatures

Candidatures shows its Stage-1 sparse-capture empty state. The shell remains unchanged.

### No CVs/letters

CVs & letters offers standalone creation. No candidature is required.

### No professional information

Professional information offers adding one useful item. No profile-completion ceremony.

### Optional capability unavailable

The shell remains usable. The relevant contextual action explains the capability and may hand off to Settings.

### No workspace

First-run workspace entry replaces ordinary shell work until a usable workspace is selected/created/restored.

## 28. Visual hierarchy implications

Without freezing theme implementation, the shell should visually communicate:

- primary work destinations are durable but quiet;
- local work is more visually prominent than shell chrome;
- contextual return bars/cues are informative rather than banner-heavy;
- Settings/utilities are secondary;
- optional-capability warnings are scoped rather than persistent global alarms.

`docs/UX_VISUAL_DIRECTION.md` governs character, not hierarchy reversal.

## 29. Anti-patterns

Stage-6 implementation must not drift into:

1. a global destination per entity/table;
2. ToDos as a primary work area;
3. Concepts as a knowledge-management destination;
4. Sources as a global repository;
5. Activity as global navigation;
6. AI as a workspace/destination;
7. generic Documents detached from candidature relationships;
8. vague Career navigation hiding professional information;
9. variants/profile mechanics as primary navigation;
10. Settings as equal-weight ordinary work;
11. a generic Home/dashboard invented to host miscellaneous cards;
12. universal search with undefined mixed scope;
13. shell chrome that crowds local work at `720×600`;
14. icon-only navigation that harms recognition;
15. contextual handoffs that lose their return object;
16. silent draft loss during global navigation.

## 30. Acceptance mapping

The shell is acceptable only if:

- Candidatures is the clear primary job/application area;
- CVs & letters is directly reachable for standalone document work;
- Professional information is directly reachable for reusable source editing;
- Settings is consistent but secondary;
- no Sources/ToDos/Concepts/Activity/AI/privacy/application-material peer destinations appear;
- candidature-linked document work retains Candidature X and returns naturally;
- document → professional-information edits preserve return context;
- contextual Settings handoffs preserve return context when practical;
- candidature search remains scoped and prominent within Candidatures;
- global navigation protects dirty drafts;
- no generic Home/dashboard is required;
- `720×600` remains usable;
- the hierarchy is sufficiently resolved for implementation without reopening IA.

## 31. Stage-6 implementation boundary

This contract completes the design prerequisites for renderer reorganization.

Stage 6 should not attempt one monolithic rewrite. It must derive the smallest coherent implementation slice from this hierarchy while preserving accepted behavior.

Broad renderer/shell reorganization is Class C and requires:

- independent Reviewer assessment;
- Skeptical Simplifier assessment;
- packaged UX evidence at default size and `720×600`;
- functional/privacy/security/local-ownership gates appropriate to changed surfaces.

No implementation is authorized by this document alone without a bounded Stage-6 Issue.
