# AAAAT reusable professional information interaction notes

Status: historical UX and implementation evidence from a completed bounded change. Not product authority or an active work contract.

Use this record only to understand existing professional-information interaction after product meaning has been established through [`PRODUCT_DEFINITION.md`](../PRODUCT_DEFINITION.md). It is subordinate to the Product Definition and derived [`SPEC.md`](SPEC.md); related interaction notes, [`UX_VISUAL_DIRECTION.md`](UX_VISUAL_DIRECTION.md), and [`UX_HISTORY_RECONCILIATION.md`](UX_HISTORY_RECONCILIATION.md) do not create requirements.

This record describes reusable professional-information interaction considered before production renderer work. It does not prescribe the final global shell, exact destination name, React composition, CSS, pane ratios, breakpoints, Settings architecture, or persistence schema.

## 1. Interaction objective

The professional-information experience exists so the user can maintain reusable information about themselves once and use it across CVs, letters, candidatures, and related work without having to administer a schema or duplicate profiles.

The ordinary mental model is:

- **My professional information** — the authoritative reusable information I maintain.
- **Saved variation** — an optional reusable difference for a particular emphasis, language, market, or context.
- **Change for this document** — a document-owned difference that must not silently alter reusable information.

The UX must preserve:

- sparse information is valid;
- read-first review is easier than form administration;
- custom information is possible without generic database UX;
- a useful general CV requires no variant;
- saved variations are differences, not cloned identities;
- document-specific edits remain document-owned;
- privacy and AI disclosure are understandable and independent concerns;
- manual/no-AI operation is complete.

## 2. Professional information is content, not a schema

Ordinary users work with recognizable professional content such as:

- identity and contact information;
- experience;
- skills;
- education;
- projects;
- languages;
- links;
- summaries;
- certifications or other justified credentials;
- objectives, preferences, constraints, target roles/markets/locations, and other relevant career context;
- justified custom information.

This list is illustrative, not a required profile checklist or permanent catalogue.

The ordinary experience must not require users to understand field IDs, canonical schemas, EAV structures, patches, rules, migrations, or storage records.

## 3. Core interaction intentions

Stage 3 defines these intentions:

1. **Review** — “What reusable professional information do I currently have?”
2. **Add/edit** — “What do I want to add or change?”
3. **Reuse** — “How is this information used in a document?”
4. **Saved variation** — “Do I need a reusable alternate emphasis or content choice?”
5. **Advanced detail** — “What deeper privacy, provenance, difference, or custom-information detail do I need?”

These are interaction intentions, not mandatory global destinations or tabs.

## 4. Empty and sparse start

An empty professional-information area must not look broken or incomplete.

The primary empty-state action is to add one useful piece of information.

A valid first action may be:

- add an experience;
- add contact information;
- add a skill;
- add education;
- add a summary;
- add another useful item.

The system must not require completion percentages, mandatory categories, setup steps, a variant, a CV, or AI configuration before the information becomes useful.

Sparse information remains a normal state later as well. Missing categories are not errors.

## 5. Read-first overview

The overview should answer: **“What useful professional information does AAAAT know about me?”**

### Required behavior

- Populated content is readable by default.
- Major content groups are recognizable but not rendered as a wall of permanent inputs.
- Users can add new information through a small deliberate action.
- Existing items expose local edit/remove/reorder controls where the domain semantics support them.
- Empty groups need not occupy large permanent space.
- The overview may collapse or omit unused groups until the user asks to add/browse more information.
- Search or quick finding within a large professional-information set may be provided if needed, without converting the area into a data-management console.

### Information grouping

Grouping should reflect how users recognize their professional information, not storage tables.

Useful groupings may include work/experience, skills, education, projects, identity/contact, languages, links, summaries, credentials, and objectives/preferences/constraints. Exact labels and grouping remain later design outcomes.

## 6. Adding information without a giant form

Adding information begins with intent rather than a full schema.

A valid flow is:

```text
Add professional information
    ↓
choose or search a meaningful kind
    ↓
enter the useful content
    ↓
save
```

The user should see common meaningful choices first and a path for additional/custom information.

Do not require users to browse every possible field or fill unrelated empty values.

## 7. Built-in and custom information

Built-in information kinds may provide domain-appropriate structure and validation.

Custom information exists for legitimate information the product did not predefine.

### Custom-information boundary

A custom item should ask only for human-meaningful properties needed to use it, such as:

- label/name;
- value/content;
- optional semantic kind when genuinely useful;
- ordering/group placement where relevant;
- privacy/AI-disclosure detail through progressive disclosure.

Do not expose database types, column names, JSON, identifiers, migration details, repository classes, or generic schema builders.

Custom information must remain reusable and inspectable without making the product a general-purpose database editor.

## 8. Objectives, preferences, constraints, and career context

Objectives/preferences/constraints are user-owned professional context, but they are not evidence such as experience or education.

The UX may visually distinguish factual professional evidence from user-stated targets/preferences while keeping both within the same overall professional-information experience.

Examples include:

- desired role or discipline;
- preferred locations/markets;
- work arrangement preferences;
- salary/compensation expectations when the user chooses to retain them;
- availability or constraints;
- career objectives;
- other user-stated targeting context.

These must not become a vague top-level “Career” destination merely because they differ semantically from experience data.

## 9. Editing ownership and scope

Every edit must have a clear ownership scope.

The three scopes are:

1. **Base professional information** — changes the reusable authoritative information.
2. **Saved variation** — changes only the reusable named variation/differences.
3. **Current document** — changes only that document through its document-specific differences.

The user must be able to understand which scope they are changing before a mutation occurs.

A document-local edit must not silently mutate base information or a saved variation. Editing base information must not be disguised as a one-document adjustment.

## 10. VCVGenerator handoff and return

From document work, the user may deliberately open the reusable source information that contributes to the document.

Required transition:

```text
Working document
  → inspect contributing professional information
  → open reusable source item
  → edit/save or cancel
  → return to the same document context
```

### Required behavior

- The document context remains recoverable.
- Dirty document work is not silently discarded.
- The user can tell that they are editing reusable source information rather than only the current document.
- After a base edit, the document may reflect the updated effective content according to existing semantics, but the UX must not imply that unrelated document-specific differences were removed.
- The return path restores the document the user came from.

Stage 3 does not redesign the VCVGenerator workspace itself.

## 11. General CV without a saved variation

The default professional information can feed a useful general CV directly.

No saved variation is required.

The product must not present “create a variant” as a prerequisite, onboarding step, or completeness requirement for document work.

## 12. Saved variations

A saved variation is optional reusable difference from the base professional information.

It exists when the user deliberately wants reusable alternate emphasis or content for a recurring context, for example a language, role family, market, or professional emphasis.

### Ordinary-language model

The UX should communicate:

- the base remains the underlying professional information;
- the saved variation stores only what differs;
- unchanged information continues to come from the base;
- deleting a variation does not delete the base information;
- editing the base may affect the effective result of variations where they do not override that content.

Do not describe ordinary variation work as patch application, rule evaluation, merge resolution, or cloned profiles.

## 13. Creating a saved variation

A variation is created deliberately from the existing professional information.

A valid flow is:

```text
Professional information
    ↓
Create saved variation
    ↓
name the intended reusable context
    ↓
change only what differs
    ↓
save
```

The creation flow must not clone every field into an independent profile representation in the user’s mental model.

The user should be able to leave most information unchanged and adjust only relevant differences.

## 14. Variation differences

Established difference semantics may include visibility/inclusion, ordering, language/content changes, emphasis, and other supported domain-specific differences.

The normal layer should explain these in human terms such as:

- hide/show in this variation;
- move earlier/later;
- use alternate wording/content;
- use another language/content choice;
- emphasize this item.

Advanced detail may expose a compact difference summary showing what is inherited and what differs.

Do not require users to inspect raw patch objects or rules.

## 15. Comparing base and variation

When useful, the user can inspect a variation relative to the base.

The comparison should emphasize only meaningful differences rather than rendering two entire cloned profiles side by side by default.

A useful summary may show:

- items hidden/shown differently;
- changed wording/content;
- ordering changes;
- added variation-specific content where supported;
- other explicit differences.

Unchanged information is understood as inherited.

## 16. Document-specific differences

Document-specific changes belong to the document, as established in Stage 2.

When the user works with content derived from professional information, the UX must make available a deliberate distinction among:

- edit the reusable base;
- edit the selected saved variation;
- change only this document.

Exact controls are not fixed, but the ownership boundary must be explicit.

A document-specific change must not silently become a new saved variation or mutate reusable information.

## 17. Privacy and AI disclosure

For professional information, local ownership, deletion, Focus visibility where relevant elsewhere, and AI disclosure are separate concerns.

In this Stage, the key ordinary distinction is:

- the information is stored in the local workspace;
- it may or may not be included in AI context for a specific operation according to disclosure controls;
- deleting/removing the item is a separate destructive action;
- replacement/anonymization for AI is distinct from deleting or hiding locally where supported by current product semantics.

The UX must not present “stored locally” as a toggle that can be casually disabled for an existing local item.

Sensitive identity/contact or career-context information should expose AI disclosure deliberately without making privacy administration permanent first-sight chrome.

## 18. Contextual AI

AI help belongs near the professional item or edit being performed.

Examples:

- help improve wording for this experience item;
- help summarize these project details;
- help draft an alternate summary;
- help translate/rephrase content;
- help identify a useful variation from explicit user-selected context, where supported.

The user must understand what context is being sent when it matters and what proposed change will occur.

Manual editing remains complete if AI is unavailable.

Provider configuration remains in Settings.

## 19. Advanced auditability

The advanced/detail layer may expose, where meaningful:

- item type/semantic meaning;
- user-defined item definition;
- provenance/activity that helps explain meaningful changes;
- AI disclosure state;
- variation inheritance/differences;
- document-specific difference boundaries;
- relevant ordering/visibility metadata.

It should not expose internal UUIDs, migrations, SQL/storage structures, IPC payloads, generic repository concepts, or raw schema data as ordinary controls.

## 20. Dirty-state and navigation safety

Unsaved work must not be lost when:

- moving between professional-information items;
- switching base/variation context;
- returning to a document;
- choosing another variation;
- leaving the professional-information area;
- switching workspace or performing recovery actions elsewhere.

A dirty boundary requires an explicit safe choice when the draft would otherwise be lost.

No confirmation noise is shown when nothing is dirty.

Saving one item must not silently commit or clear unrelated drafts.

## 21. Default desktop composition

Stage 3 does not freeze pane geometry.

A default desktop composition may show a readable professional-information overview with a selected item/detail or local editing surface when space permits.

Required properties:

- the overview remains scannable;
- editing has adequate width;
- variations remain secondary until deliberately invoked;
- supporting privacy/advanced controls do not crowd the normal content;
- document-return context is visible when the user arrived from VCVGenerator.

Low-fidelity example:

```text
┌──────────────────────────────────────────────────────────────┐
│ Professional information                   [Add information] │
├─────────────────────┬────────────────────────────────────────┤
│ Experience          │ Selected item / readable detail        │
│ Skills              │                                        │
│ Education           │ [Edit]                                 │
│ Projects            │                                        │
│ Other information   │ Reuse / privacy / advanced on demand   │
│                     │                                        │
│ Saved variations…   │                                        │
└─────────────────────┴────────────────────────────────────────┘
```

This illustrates hierarchy, not final widgets or labels.

## 22. Minimum `720×600` behavior

At `720×600`, one principal task takes priority.

A valid interaction model is:

```text
Overview
  ↓ select/add
Item detail or editor
  ↑ back

Overview
  ↓ saved variations
Variation list/detail
  ↑ back
```

Required properties:

- overview and detail may transition instead of compressing into narrow columns;
- content wraps and scrolls vertically;
- important actions remain labeled and reachable;
- variation controls stack or open deliberately;
- advanced/privacy detail does not permanently consume vertical space;
- document-return context remains reachable when applicable;
- no horizontal clipping is required for ordinary use.

## 23. Representative states

### No professional information

Explain that the user can start with one useful item. Offer Add information. No checklist/completeness failure.

### Sparse information

Show only what exists plus small paths to add more. Do not show dozens of empty groups.

### No saved variations

Explain only when the user deliberately opens variations that the base information is already usable and variations are optional reusable differences.

### Empty variation

A newly created variation with no differences simply uses the base information. It is valid; the UX may explain that nothing differs yet.

### AI unavailable

Manual editing remains unchanged. Contextual AI action explains unavailability where invoked; no global failure state.

### Loading

Preserve orientation and the selected scope (base/variation/document return context). Do not blank unrelated content if one detail is loading.

### Error

Explain which save/load/action failed, whether authoritative information changed, and what the user can do next. Preserve drafts whenever possible.

## 24. Canonical scenario wireframes

### First information

```text
Professional information

No information yet.
Add one useful thing to start.

[Add information]
```

### Read-first existing information

```text
Professional information

Experience
  Senior Engineer — Company A                     [Edit]
  Engineer — Company B                            [Edit]

Skills
  TypeScript · Python · SQL                        [Edit]

Education
  MSc …                                            [Edit]

[Add information]          [Saved variations]
```

### Variation

```text
Saved variation: Data roles
Based on: Professional information

Differences
  Summary        alternate wording
  Python         emphasized / moved earlier
  Frontend item  hidden

[Edit differences]   [Compare with base]
```

### From document

```text
← Return to CV: General CV
Professional information

Experience / Company A
This is reusable information used by the document.

[Edit reusable information]
```

## 25. Anti-patterns

Stage-3 implementation must not drift into:

1. a giant permanent profile form;
2. completion scoring or required-category ceremony;
3. cloned full profiles presented as variants;
4. variant-first document creation;
5. generic database/schema administration for custom fields;
6. hidden ownership changes between base, variation, and document;
7. privacy controls that conflate AI disclosure with deletion/local storage;
8. an AI profile workspace;
9. vague “Career” navigation created from implementation entities;
10. advanced provenance/IDs occupying ordinary content;
11. minimum-size clipping or crushed multi-pane layouts;
12. silent draft loss.

## 26. Acceptance mapping

The interaction is acceptable only if:

- one useful professional item can be added without profile setup;
- sparse information remains valid;
- populated information is readable without permanent form mode;
- custom information is understandable without schema terminology;
- a general CV can reuse the base directly;
- variations are optional differences, not cloned identities;
- base/variation/document edit scope is explicit;
- VCVGenerator can hand off to reusable information and return safely;
- privacy and AI disclosure remain understandable and separate from deletion/local ownership;
- AI is contextual and optional;
- advanced differences/provenance remain inspectable progressively;
- `720×600` remains usable without clipping;
- Stage 4 Settings and Stage 5 global navigation remain undecided here.

## 27. Deliberately open questions for later stages

Stage 3 intentionally leaves open:

- final global destination name for professional information;
- final global navigation placement;
- exact sidebar/tab/local-navigation mechanics;
- visual implementation and component decomposition;
- exact breakpoints/pane geometry;
- Settings-level AI/provider/privacy administration;
- final shell relationship among candidature, VCVGenerator, professional information, and Settings.

Those are Stage 4/5 or implementation decisions, not gaps in this contract.
