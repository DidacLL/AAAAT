# AAAAT VCVGenerator interaction contract

Status: Stage 2 design contract for Mission #204 / Issue #209.

This document is subordinate to `docs/UX_DEFINITION.md`, which remains the canonical durable UX contract. `docs/UX_CANDIDATURE_INTERACTION.md` defines the accepted candidature handoff/context contract. `docs/UX_VISUAL_DIRECTION.md` supplies visual character only. `docs/UX_HISTORY_RECONCILIATION.md` is historical evidence only.

This contract defines VCVGenerator interaction before production renderer work. It deliberately does not define the final global shell, exact navigation widget, React composition, CSS, visual tokens, pane ratios, breakpoints, reusable-profile workspace, Settings architecture, or LaTeX package/template architecture.

## 1. Interaction objective

VCVGenerator exists to let the user create, edit, render, inspect, retain, and export CV/cover-letter work without turning document production into an implementation console.

It has two equally legitimate entry contexts:

1. **Standalone** — the user is working on a CV or cover letter without any candidature.
2. **Candidature-linked** — the user enters from Candidature X application material and works on a document for that candidature while retaining that context.

These are contexts of the same document system, not separate document products.

The design must preserve five properties simultaneously:

- standalone document work is independently useful;
- candidature-linked material remains visibly related to its candidature;
- ordinary editing uses professional/document language rather than profile/patch/LaTeX internals;
- advanced ownership, source, differences, permissions, and portability remain inspectable;
- working documents remain distinct from retained exact artifacts used for an application.

## 2. Core mental model

For ordinary users, VCVGenerator exposes three concepts:

1. **Working document** — the editable CV or cover letter the user is maintaining.
2. **Reusable professional information** — user-owned information that can be included/reused in documents.
3. **Retained application artifact** — an exact preserved output/source snapshot representing material actually used for a candidature.

The normal UX should not require understanding:

- canonical profile;
- variants as patches;
- document override rules;
- feeder ownership;
- generated `data.tex`;
- LaTeX package internals;
- artifact IDs or provenance schemas.

Those mechanics remain progressively inspectable where they matter.

## 3. VCVGenerator interaction states

Stage 2 defines these document-work intentions:

1. **Document selection / creation** — “What CV or letter am I working on?”
2. **Document editing** — “What content will this document contain, and can I change it?”
3. **Result / rendering** — “Can I produce and inspect the output?”
4. **Reuse / differences** — “What reusable information is this document using, and how does this document differ?”
5. **Source / ownership / audit** — “What source/output do I own, what is generated, and what deeper controls are active?”

These are interaction intentions, not mandated global destinations or tabs. A later design may express them through local tabs, an inspector, a document workspace, menus, or another conventional desktop pattern.

## 4. Standalone entry

Standalone document work must be reachable without entering candidature management first.

The entry state answers:

**“Do I want to open an existing document or create a CV/cover letter?”**

### Required behavior

- Existing working documents are recognizable and selectable.
- Create CV and Create cover letter are directly reachable.
- No candidature is required.
- No AI connection is required.
- No profile variant is required.
- Missing TeX does not prevent creating/editing a document.
- Empty reusable professional information does not make document creation invalid; the user can still create/edit content and later add/reuse professional information.

A document summary is for recognition, not a technical record. It may show document type, user label/title, language, recent modification, and candidature association when relevant. It should not lead with internal IDs, feeder state, variant patch data, or source paths.

## 5. Candidature-linked entry and context

The accepted Stage-1 transition is:

```text
Candidature X
  → application material
  → select/create CV or cover letter
  → VCVGenerator document work
```

Opening VCVGenerator this way establishes a visible **Candidature X context**.

### Required context behavior

- The user can tell that the current document is being worked on in relation to Candidature X.
- The candidature context remains available while document work is dominant.
- There is an obvious return path to Candidature X application material.
- The user does not need to reselect or reconstruct the candidature association inside another generic document warehouse.
- If an existing working document can be associated with Candidature X under current product semantics, association is explicit and understandable.
- Association must not silently imply that a retained exact application artifact already exists.

The exact context control is not fixed. It may be a compact context bar, breadcrumb, return control, or equivalent later design outcome.

## 6. Working document versus retained application artifact

This distinction is central.

### Working document

A working document is mutable. It may continue changing after it has been used for one or more applications.

### Retained application artifact

A retained application artifact preserves the exact material actually used for a candidature. Later edits to the working document must not change it.

### Interaction requirements

- Candidature-linked document work makes both concepts distinguishable.
- Rendering a working document does not automatically claim that the result was used/submitted.
- Retaining an application artifact is an explicit user action tied to a candidature context.
- The retained artifact should identify enough human-readable context to understand what was preserved and when.
- Retained artifacts remain inspectable from Candidature X.
- The UI must not suggest that a mutable document link alone preserves historical application material.

This contract does not introduce submission workflow, approval states, lifecycle status, or mandatory artifact retention after every render.

## 7. Normal document editing

The main editing state answers:

**“What will appear in this CV/letter, and how do I change it?”**

### Ordinary editing language

Normal editing should present actual document content and professional information:

- identity/contact content;
- summary/profile text;
- experience;
- skills;
- education;
- projects;
- languages;
- links;
- cover-letter body/content;
- other justified document content.

Exact sections depend on the document/blueprint and are not frozen here.

### Read/edit behavior

- Content is readable, not permanently rendered as one giant configuration form.
- Editing is deliberate and close to the content being changed where practical.
- The user can understand what is included and omitted.
- The document can be edited manually without AI.
- Multilingual content remains supported as document content; language choice must not require changing product mode or technical setup concepts.

### No variant prerequisite

A useful general CV must be creatable from ordinary professional information without first creating or selecting a variant.

If variants exist, they are optional reusable alternatives, not a prerequisite for normal document creation.

## 8. Reusing professional information inside document work

Stage 3 will design the full reusable-professional-information workspace. Stage 2 only defines how reuse appears inside document work.

### Required interaction

The user should be able to understand:

- which reusable professional information is contributing to the document;
- which content is included or omitted;
- whether this document has deliberate document-specific changes;
- where to go if they want to change the reusable source information itself.

Ordinary document work should use language such as:

- “Use professional information”;
- “Included in this document”;
- “Change for this document”;
- “Use a saved variation” when variants are deliberately relevant.

Do not lead with “canonical”, “patch”, “rule”, “resolved model”, or similar implementation concepts.

## 9. Document-specific differences and variants

Differences are progressively disclosed.

### Default path

The default document can use ordinary reusable professional information directly.

### Optional reusable variation

If the user has a named variant, they may deliberately use it as a basis where appropriate. The UI must not imply that a variant is required.

### Document-specific difference

A user may deliberately change content for this one document without mutating the reusable professional information or selected variant.

The interaction should make that boundary understandable in plain language.

Advanced inspection may expose the effective relationship:

```text
professional information
+ optional saved variation
+ document-specific differences
= effective document content
```

This is an explanatory model, not a requirement to show an equation in ordinary UI.

## 10. Editing reusable versus document-specific content

When the user edits content that originates from reusable professional information, the UX must avoid accidental ownership changes.

A later implementation may offer choices such as:

- update only this document;
- edit the reusable professional information;
- use another saved variation.

The exact control is not fixed here.

The important contract is that a document-specific edit must not silently mutate reusable professional information, and editing reusable information must not be disguised as a local document edit.

## 11. Render interaction

Rendering is an explicit document action.

The user should understand:

- what document is being rendered;
- which candidature context applies, if any;
- whether visible unsaved edits are included;
- whether rendering succeeded;
- where the resulting PDF/output can be opened.

### Dirty state and render

Render must never silently use an older persisted state while the visible editor contains newer unsaved work.

The implementation may satisfy this by saving first, rendering the current draft through a supported operation, or another coherent mechanism. The UX requirement is that the rendered state is explicit and matches user expectation.

### Success

After successful render, show a concise result state with actions such as:

- open/view PDF;
- return to editing;
- export portable project where relevant;
- retain as candidature artifact when in candidature context and the user deliberately chooses to preserve the used material.

Do not force a permanent preview pane if it harms editing or smaller-window usability.

### Failure

A render failure must state:

- that rendering failed;
- that the working document edits remain intact;
- whether any prior successful output remains unchanged/available when that guarantee applies;
- the next useful action.

Technical logs/details may be progressively available for advanced diagnosis without becoming ordinary document content.

## 12. TeX unavailable state

TeX is a capability required for local compilation, not for document existence.

If TeX is unavailable:

- document selection/creation/editing remains usable;
- the document workspace does not present itself as globally broken;
- Render communicates the missing capability contextually;
- a concise route to relevant setup/help may be offered;
- Settings owns detailed TeX/environment administration;
- source ownership and portable project access remain available wherever technically supported independently of local compilation.

Do not place permanent TeX diagnostic panels inside normal document editing.

## 13. Result, source, and portable export

VCVGenerator should make user ownership clear through progressive depth.

### Ordinary result layer

The ordinary user can find/open the current rendered PDF/result without knowing filesystem internals.

### Portable export

Portable project export is a deliberate ownership action. It should explain that the exported project belongs to the user and is intended to compile outside AAAAT with compatible tools.

The interaction should provide a clear success result and destination information without requiring users to understand repository paths.

### Advanced source layer

Advanced users can inspect the effective source project and ownership boundaries, including:

- `main.tex` — editable/user-owned blueprint source;
- `aaaat.sty` — editable/user-owned package source in the project;
- `data.tex` — feeder-owned generated data;
- rendered PDF/output;
- relevant generated/exported project location;
- effective professional/variant/document differences where useful.

The ordinary interface may use friendlier labels first, with filenames/details shown in advanced source inspection.

## 14. Generated data and source ownership

The source/audit layer must preserve the accepted ownership boundary:

- AAAAT may deliberately regenerate feeder-owned `data.tex`;
- AAAAT must not silently overwrite user-authored `main.tex` or edited `aaaat.sty` source through ordinary regeneration;
- explicit regeneration should make its affected generated scope understandable;
- user-edited source remains inspectable and editable;
- exporting a project preserves the effective user-owned project and PDF/output available at that point.

This Stage does not redesign the feeder, package API, regeneration algorithm, or TeX architecture.

## 15. Managed and advanced source editing

Ordinary users should not need to choose between “managed mode” and “manual TeX mode” before writing a CV.

Source editing is progressive depth.

When the user deliberately opens source-level editing, the UX should make clear:

- which files are user-owned/editable;
- which generated file is feeder-owned;
- whether current source edits differ from the managed/generated state where that information is meaningful;
- which action regenerates generated data;
- which action renders the current effective project.

Do not expose source-management mechanics as the primary document-writing hierarchy.

## 16. Combined CV + cover-letter output

Combined output is a bounded production action, not a separate product or workflow.

Where supported, the user may deliberately select compatible CV and cover-letter material and produce one combined output.

The interaction must preserve which working documents contributed and, in candidature context, allow the resulting exact used output to be retained explicitly if desired.

Do not require combined output for ordinary applications.

## 17. Contextual AI assistance

AI belongs near the document/content it assists.

Examples include:

- help draft or revise a cover-letter passage;
- help tailor a CV section to Candidature X;
- help choose/emphasize permitted professional information;
- help transform wording/language when a suitable capability exists.

### Required behavior

- The user does not navigate to an AI workspace and rebuild document/candidature context.
- Manual editing remains complete without AI.
- Assistance appears only when a suitable configured capability exists.
- The user can understand what document/context the action is using.
- When disclosure matters, the UI can explain what permitted content is being shared.
- AI output becomes ordinary editable document/information content under the operation’s normal rules.

Provider/connection administration belongs in Settings.

## 18. External assistant access controls

Advanced document audit/privacy can expose the existing bounded external-assistant permissions that materially affect the current document, such as deliberately permitted descriptor/tags/notes, further document content, or local render authority where supported.

These controls must not appear as a generic external CRUD/browse surface.

The UX should distinguish different permissions rather than imply that one “share document” switch grants every capability.

Detailed host trust and connection administration belongs in Settings; document work only shows the permissions/context relevant to this document.

## 19. Dirty-state and navigation safety

Unsaved document work must never be silently discarded.

Dirty boundaries include, where applicable:

- switching to another working document;
- returning to Candidature X;
- leaving VCVGenerator for another major context;
- changing document basis/variation when that would replace current unsaved edits;
- leaving source editing with unsaved source changes;
- restoring/regenerating generated source where the action would replace editable state.

When crossing a destructive dirty boundary, the user receives an explicit safe choice such as save/apply, discard, or stay.

No confirmation noise is shown when there is no unsaved work.

Where drafts can safely remain preserved while the user inspects result/source/context, the UX should prefer preservation over unnecessary blocking prompts.

## 20. Document collection continuity

Opening one document should not unnecessarily destroy the user’s document-list/search/filter context.

Returning to document selection should preserve reasonable prior context unless the user intentionally starts over.

In candidature-linked entry, returning to Candidature X is distinct from returning to the general document collection. The product should not force the user through the general collection simply to return to their application.

## 21. Default desktop composition

Stage 2 does not freeze pane geometry.

At useful desktop widths, a valid composition may combine document selection/context with a dominant editing surface and optionally expose result/supporting detail when space permits.

The editing surface must remain the primary area. Reuse/differences/source/permissions should not crowd the main writing task simply because they exist.

### Low-fidelity standalone example

```text
┌──────────────────────────────────────────────────────────────┐
│ document context: General CV                                │
├────────────────┬─────────────────────────────────────────────┤
│ Documents      │ current document                           │
│ New CV         │                                             │
│ New letter     │ readable/editable content                  │
│                │                                             │
│ CV A           │ [Render]  secondary reuse/source controls  │
│ Letter B       │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

### Low-fidelity candidature-linked example

```text
┌──────────────────────────────────────────────────────────────┐
│ ← Candidature X   Application material   CV for Candidature X│
├──────────────────────────────────────────────────────────────┤
│ current document content                                    │
│                                                              │
│ [Render]   reuse/differences   source & output   assistance  │
└──────────────────────────────────────────────────────────────┘
```

These illustrate hierarchy only; labels/widgets are not frozen.

## 22. Minimum `720×600` behavior

At the declared minimum, VCVGenerator prioritizes one principal task at a time instead of compressing list, editor, preview, and advanced controls into unusable panes.

A valid transition model is:

```text
Document selection
      ↓ open/create
Document editing
      ↓ render / inspect source / reuse details
Selected sub-context
      ↑ return to document
```

For candidature-linked work:

```text
Candidature X
  ↓ application material
Document editing for X
  ↑ return to X
```

### Required properties

- Document list and editor may become separate states.
- The current document identity remains visible.
- Candidature context remains visible/recoverable when linked.
- Editing uses vertical scrolling and sensible text wrapping.
- Preview/result may become a separate state instead of a crushed side pane.
- Reuse/differences/source/permissions open deliberately or stack below primary content.
- Important actions remain labeled and keyboard reachable.
- Fixed chrome must not cover document content or actions.
- Nested miniature scroll panes should be avoided when page/work-surface scrolling is clearer.

### Low-fidelity minimum example

```text
┌───────────────────────────────┐
│ ← Documents   General CV      │
│ [Render] [More…]              │
├───────────────────────────────┤
│                               │
│ readable/editable document    │
│ content                       │
│                               │
│            scroll             │
└───────────────────────────────┘
```

Candidature-linked:

```text
┌───────────────────────────────┐
│ ← Candidature X               │
│ CV for Candidature X          │
│ [Render] [More…]              │
├───────────────────────────────┤
│ document content              │
│                               │
│            scroll             │
└───────────────────────────────┘
```

## 23. Empty, loading, error, and optional-capability states

### No working documents

Explain that the user can create a CV or cover letter. Do not imply a candidature, AI connection, or variant is required.

### No reusable professional information

Document creation remains available. Explain that reusable professional information can make reuse easier, while manual/document-specific editing remains possible. Stage 3 will define the full professional-information editing journey.

### No candidature application material

From Candidature X, offer create or associate a working CV/letter. Do not present this as candidature incompleteness.

### No retained artifacts

Explain that exact used material can be retained when the user wants to preserve what was actually used. Do not imply every render should already have an artifact.

### Loading

Keep document identity/context visible. Loading one result or advanced panel should not blank the whole workspace.

### Save error

State that saving failed and preserve the local draft for correction/retry where possible.

### Render error

State that rendering failed, preserve edits, and keep technical detail secondary.

### Export error

State that export failed and whether the working project/output remains unchanged.

### AI unavailable

Manual editing remains complete. Assistance is absent or contextually explains what setup is missing without presenting the document workspace as broken.

### TeX unavailable

Editing remains complete; only compilation-dependent actions are unavailable.

## 24. Acceptance walkthroughs

### A. General CV with no candidature and no AI

```text
Open VCVGenerator
→ Create CV
→ use/edit ordinary professional information
→ save
→ render when TeX is available
→ open result
```

No candidature, variant, AI, or LaTeX-source editing is required.

### B. Standalone cover letter

```text
Open VCVGenerator
→ Create cover letter
→ write/edit content
→ optionally reuse relevant professional information
→ save/render/export
```

### C. Candidature-specific CV

```text
Candidature X
→ application material
→ create/select CV
→ VCVGenerator retains Candidature X context
→ tailor/edit
→ render
→ optionally retain exact used artifact for X
→ return to Candidature X
```

### D. Reuse existing document

```text
Candidature X
→ application material
→ associate/select existing working document where permitted
→ association is explicit
→ edit/tailor without silently mutating unrelated reusable information
→ render
```

Association alone does not create a retained artifact.

### E. Advanced source inspection

```text
Open working document
→ Source & output / advanced details
→ inspect user-owned main.tex / aaaat.sty
→ inspect feeder-owned data.tex boundary
→ edit user-owned source deliberately
→ regenerate generated data only when explicitly requested
→ render/export
```

### F. Render with unsaved edits

```text
Edit document
→ Render
→ UX makes clear how current draft becomes render input
→ rendered output corresponds to expected visible state
```

No silent stale-state render is acceptable.

### G. Missing TeX

```text
Open/edit document
→ Render unavailable/fails capability check
→ concise explanation + setup route
→ document remains editable and saved
```

### H. Minimum window

```text
Document list
→ open document
→ one dominant editor state
→ result/reuse/source become deliberate secondary states
→ all content/actions reachable by scroll/transition
```

No clipping or crushed multi-pane layout.

## 25. Anti-patterns for Stage 2

Do not introduce:

- a generic document warehouse detached from candidature context;
- mandatory candidature association for document work;
- mandatory variant selection before creating a CV;
- source/LaTeX mechanics as the ordinary document editor;
- automatic artifact retention after every render;
- artifact lifecycle/workflow states not established by product authority;
- AI as a separate document workflow destination;
- provider/connection setup inside normal document editing;
- a permanent three-pane list/editor/PDF layout that fails at supported window sizes;
- silent rendering of stale saved content while newer visible edits exist;
- document-specific edits that silently mutate reusable professional information;
- regeneration that silently overwrites user-authored blueprint/package source;
- final global navigation decisions before Stages 3–4 are designed.

## 26. Stage boundary

Stage 2 establishes the VCVGenerator interaction contract only.

It does **not** decide:

- the final ordinary-user product name of VCVGenerator;
- the final global navigation position;
- the complete reusable-professional-information workspace;
- Settings/setup/recovery information architecture;
- exact React components or CSS;
- exact pane/tab/menu mechanics;
- exact blueprint/section design;
- LaTeX implementation architecture;
- new persistence semantics.

Those remain for later bounded stages or established technical authority.

## 27. Acceptance questions for later UX/implementation work

A future design/implementation satisfies Stage 2 only if the answer is yes to all of these:

1. Can I open AAAAT only to work on a CV or cover letter?
2. Can I create a useful general CV without a candidature, AI, or variant?
3. From Candidature X, can I see/open/create its CVs and letters without reconstructing the relationship elsewhere?
4. When I enter document work from Candidature X, do I retain enough context to know what application I am working for and return naturally?
5. Is normal editing understandable without canonical-profile, patch, feeder, or LaTeX implementation terminology?
6. Can I reuse professional information without silently changing its ownership semantics?
7. Can advanced users inspect user-owned source, feeder-generated data, differences, PDF/output, portability, and relevant assistant permissions deliberately?
8. Is a retained exact application artifact clearly different from a later-mutated working document?
9. Does Render use the state the user reasonably expects and preserve edits on failure?
10. Does missing TeX disable compilation rather than the whole document workspace?
11. Is AI contextual and optional?
12. Does the interaction remain usable at `720×600` without clipping?
13. Does this design avoid prematurely deciding Stage-3 profile UX, Stage-4 Settings, or Stage-5 global navigation?
