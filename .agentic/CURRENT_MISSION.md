# Current mission — PLAN[5] application inspection and document coherence

Current explicit Product Owner instruction remains highest authority.

Base main: `8355889be18078451959dc8a1a19d45f74aaede7`.
Integrated PLAN[5] acceptance umbrella: #314 (reopened after Product Owner real-use review).
Active integrated implementation issue: #395.

The September 28 audits are not execution authority. PR #378 recovered the AAAAT northstar; PR #379 restored PLAN[0]–PLAN[4] as complete/retained and PLAN[5] as active.

## PLAN state

- **PLAN[0] — COMPLETE / RETAINED.**
- **PLAN[1] — COMPLETE / RETAINED.**
- **PLAN[2] — COMPLETE.**
- **PLAN[3] — COMPLETE / RETAINED.**
- **PLAN[4] — COMPLETE.** Issue #373 remains non-blocking future document-source work.
- **PLAN[5] — ACTIVE.** Issue #395 is the current integrated residual. Do not close #314 until #395 and final packaged acceptance are complete.

## Accepted PLAN[5] work retained

- #380 / PR #382: direct structured New application and raw Source retention with explicit manual/AI continuations.
- #383 / PR #385: loaded Home as useful local landing console; workspace administration remains in first run/Settings.
- #386 / PR #390: sparse/raw corpus recognition from retained Source, shared recognition projection, selected Source visibility, bounded external-AI task access.
- #393 / PR #394: constrained shell keeps support surfaces subordinate to the active task.

Do not reopen these accepted boundaries unless #395 implementation directly exposes a regression.

## Current Product Owner correction — #395

Real desktop use exposed one coherent UX-model problem, not a set of cosmetic micro-defects.

### Applications corpus: recognize → filter → inspect → edit

The current corpus jumps directly from a compact card to the full editor and visually decomposes applications into rigid field boxes.

Retrieval also needs a compact recency control: add a `From` selector beside Search/archive with Last 24h / 48h / 72h / week / month / All. All is default. Filter on candidature `createdAt` using rolling 24/48/72-hour, 7-day and 30-day windows; intersect with Search and archive filtering. Do not use `updatedAt`, a configurable application-date field, a date picker, schema changes or persistence.

Required model:
1. compact card for recognition;
2. first activation preselects/expands exactly one card in place for inspection;
3. second activation or explicit Open/Edit enters the exact selected application editor.

The preselected card should reveal more retained primary/favourite information and attached Tags while staying bounded. Raw-only applications retain the accepted Source fallback. Search/archive behavior remains unchanged.

Corpus cards should read as application cards, not mini-form grids. Values remain primary. Attached Tags are visible without search. Compact/normal/wide presentation preferences must produce perceptible information hierarchy without chaotic masonry or unbounded card height.

### Contextual Tags

The rail Tag surface must stop being a duplicate global Tag search workflow.

When Applications is active, the rail is a contextual monitor for the current preselected/selected application:
- show attached Tags and concise definitions;
- update when corpus preselection changes;
- preserve context after opening the editor;
- show a quiet neutral state when no application is selected.

Application-local Tag interaction remains the mutation surface for add/search/create/remove/edit. Keep the state handoff small and explicit; no global store/event bus.

### Selected application

Primary/favourite information remains first, but all enabled application fields are visible in the same continuous information surface. Do not hide normal fields behind generic `More`.

Long/free-text values are bounded in read state and fully available when editing. Field units should have calmer, more consistent rhythm. Field options remain secondary. Replace visible prose reorder actions such as “Move earlier/later” with compact directional controls while retaining descriptive accessibility labels.

Sources, Documents, AI task access, Activity and field-definition machinery remain progressive/contextual.

### CVs / Working CV

Working CV must read immediately as a CV/document composition, using the successful read-first interaction language of My information as reference.

- continuous paper/document composition first;
- section headings and CV items read like content, not nested administration cards;
- editing remains local/contextual;
- reorder/remove/source controls are compact and secondary;
- metadata, Blueprint and render controls do not dominate the document body;
- CV collection/start view makes existing Working CVs recognizable as documents to continue.

Preserve every settled PLAN[4] ownership/render distinction. This is not a WYSIWYG PDF editor and not a document-domain rewrite.

### Horizontal space and menu density

The desktop must stop behaving like a narrow form stretched across a wide landscape viewport.

- use deliberate multi-column composition for related information on wide views where it improves scanning and reduces eye travel;
- keep readable line lengths rather than pouring fields/descriptions into one oversized horizontal strip;
- application information, descriptions/supporting metadata and document composition should align to calm predictable grids rather than many isolated boxes;
- expanded corpus inspection may span multiple grid columns;
- avoid full-width controls/text where they add no value;
- keep constrained widths stackable and task-first.

Primary navigation must feel like a menu:
- smaller/lighter typography and tighter rows;
- active state through restrained accent/contrast, not oversized bold treatment;
- utility/reorder/edit/options controls visually subordinate to values and document content;
- reduce unnecessary padding, border weight and oversized bold labels throughout affected surfaces.

## Architecture and non-goals

Keep this as one coherent bounded renderer interaction correction.

Do not add:
- schema/migration or new persistence;
- fixed Role/Organisation identity semantics;
- router/wizard/workflow engine;
- global state/event bus;
- generic card/design-system framework;
- runtime dependency;
- provider/AI contract redesign;
- PLAN[4] document-domain rewrite;
- Tag ontology/knowledge-management expansion;
- unrelated Home/Settings redesign.

## Acceptance

Focused evidence must prove:
- From defaults to All and creation-time windows intersect correctly with Search and Current/Archived/All;
- first corpus activation preselects/expands only;
- second activation or explicit Open enters the exact application;
- one preselected card at a time;
- card and expanded inspection expose useful primary cues + attached Tags while bounding long/raw content;
- rail Tag monitor follows preselected/selected application and contains no duplicate global search flow;
- application-local Tag mutation remains functional;
- selected application shows primary and remaining enabled fields without `More`;
- compact accessible reorder controls preserve favourite ordering;
- Working CV reads as document-first and edits contextually;
- dirty state, search/archive, Sources, Documents and AI handoffs remain intact.

Run full `npm run verify`.

Final Windows packaged evidence should exercise the corrected journey as one integrated flow: large corpus → preselect → inspect Tags/primary information → open exact application → see/edit all fields → return → open a Working CV and confirm recognizable read-first document composition at constrained and expanded representative sizes.

The Product Owner is not routine QA or a prompt courier. The orchestrator owns independent diff review, exact-head verification, packaged evidence, PR/merge and final PLAN classification.
