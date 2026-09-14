# AAAAT UX history reconciliation

Status: historical/research evidence. Not current UX authority.

Current authority remains:

```text
current explicit Product Owner instruction
→ PRODUCT_DEFINITION.md
→ derived SPEC / current Mission / Issue
→ tests
→ implementation
```

Historical material below preserves validated user problems and desired feel. It must not create requirements or revive v1 mechanics, fixed navigation, field catalogues, task queues, lifecycle assumptions, removed domain terminology, or implementation boundaries.

## Historical sources reviewed

### Early owner/product intent

At historical commit `bcfe287fd3d50af6f96e0efa1ba18dde54f2b2e6`:

- `docs/PO/BasicAppRequirements.md`
- `docs/AAAAT Product Summary.md`
- `docs/product-owner-original-intent.md`
- related local-desktop dashboard planning

These establish the candidature as an important job/application context and the original product need for rapid recruiter-call recognition, retained raw material, direct annotations, reusable keywords/glossary information, complete editability, and local ownership.

Historical mechanics such as dashboard states, agent queues, fixed candidature fields, lifecycle labels, and the original document/privacy mechanisms are evidence only.

### Mature v1 desktop work

PR #37 lineage and later v1 release-readiness work, including historical `docs/planning/v1-release-readiness-seed-prompt.md`, sharpened the distinction between:

- a fast, read-oriented recruiter-call surface;
- complete candidature editing;
- reusable professional/career editing;
- readable original source text;
- stable information locations under call pressure.

It also recorded concrete failures: chaotic resizing, overlap, truncation, excessive controls competing with call information, and drift toward implementation/workflow mechanics.

The accepted lesson is the user need, not wxPython, Smart/Detailed/User modes, fixed panes, exact card names, or old status/task behavior.

### v2 design research

`docs/owner-source/RedesignOwnerNotes.md` and `docs/owner-source/Method.md` preserve historical owner-source material that may help interpretation where consistent with today’s authority: human-operable unified UX, sparse/raw starting points, independently core VCVGenerator, contextual AI, provider-neutrality, portable local documents, and progressive technical depth.

Later M6/Focus work also reinforced read-first retrieval, sparse-valid states, explicit Sources, dirty-state protection, responsive small-window behavior, and ordinary language. Superseded M6 mechanics are not authority.

## Durable historical lessons and their current-safe interpretation

| Historical lesson | Current-safe interpretation |
| --- | --- |
| Candidature is a central job/application object | Preserve candidature context for corpus Focus, selected Focus, complete information, Sources, Tags and candidature-linked application material without forcing one canonical entry sequence. |
| Fast recruiter-call “panic mode” | Preserve as configurable **Focus**, optimized for rapid identification and recall rather than workflow management. |
| Read-oriented Smart View | Focus prioritizes readable retained information; controls/configuration are secondary. |
| Stable locations during calls | Keep predictable reading order/context; responsive reflow may change geometry without arbitrary movement. |
| Original offer/message remains readable | Sources are explicit first-class retained objects, searchable and inspectable independently of extraction. |
| Long raw material should not dominate call view | Full Source remains reachable while Focus stays concise and recognition-oriented. |
| Shared keyword definitions | Preserve the useful behavior through **Tags** with aliases, definition/notes and candidature associations. `Concept` is not a parallel current product/domain term. |
| Complete Detailed View | Preserve complete inspection/editing through progressive disclosure; no mandatory Detailed View mode. |
| User/professional workspace | Preserve reusable professional information editing; no mandatory User View mode. |
| Dense information can be useful | Prefer calm progressive density, not fashionably sparse hiding or cluttered walls. |
| Every meaningful value is editable | Preserve full user ownership and editability regardless of manual/AI origin. Field definitions themselves are user-maintainable product data, not a fixed developer ontology. |
| Advanced users need deeper truth | Progressive disclosure must reach Sources, privacy/presentation controls, document ownership, provenance and portability without turning normal editing into schema administration. |
| VCVGenerator can stand alone | Treat standalone CV/cover-letter work as a genuine parallel journey, not a generic document bucket. |

## Historical mechanics explicitly superseded

Do not carry these forward merely because they were once implemented or approved:

```text
Smart / Detailed / User / Welcome as exact top-level modes
left-center-right fixed dashboard geometry
20/60/20 pane ratios
fixed center-card names
fixed notes band or keyword rail
AUI docking/resizing
first-click/second-click overview transitions
canonical v1 field registry
status/priority/next-action-driven workflow
active/closed lifecycle as architecture
agent task queues as user workflow
provider bridge/work-item language
browser-vs-wx implementation debates
old privacy placeholder/storage mechanics
Concept as the current shared keyword/glossary domain name
```

They may inspire later design only when a current requirement independently justifies the user problem and the resulting solution is still the simplest appropriate one.

## Product-owner correction over the rejected #205 IA

The first #205 information-architecture proposal was rejected because it inferred navigation from implemented entities/features and current renderer composition.

The following assumptions are superseded and must not re-enter future UX authority:

- ToDos as an independent primary work area;
- “Opportunities” as a replacement mental model for candidatures;
- generic Documents as an independent bucket detached from candidature context;
- vague Career navigation as a substitute for actual reusable professional information;
- AI assistance as a destination;
- equal-weight primary destinations because capabilities exist;
- deriving shell/navigation from database/domain entities or the current component tree.

The UX definition subsequently used for renderer work is recorded in [`UX_DEFINITION.md`](UX_DEFINITION.md). It remains derived UX evidence, not a second product definition.

## Recovered product direction relevant to this history

Current authority resolves the historical material this way:

1. Candidature work is a major product area, but AAAAT has multiple legitimate entrances and no mandatory candidature-first chronology.
2. Corpus Focus is for rapid identification across candidatures; selected Focus is for rapid recall of one candidature. Focus is not a selected-record tab or workflow checklist.
3. Complete candidature management is a deliberate peer intention and exposes retained information, Sources, Tags, linked application material, privacy/presentation controls and secondary data through progressive disclosure.
4. The candidature field model is user-maintainable product data so materially different professions can maintain materially different field sets; configured AI extraction uses that current field set.
5. New candidature supports two direct peer approaches: fill fields directly, or retain raw material first. The raw path then offers explicit AI extraction and manual Source-beside-fields continuation; neither route is canonical.
6. Tags replace the former `Concepts` implementation/domain name for the shared reusable keyword/glossary behavior.
7. Lightweight checkable notes may exist as secondary candidature data when independently useful, but they do not structure Focus, create a lifecycle, or become task/reminder management.
8. Status, priority, next action and formal lifecycle are not defining product structure and must not be reintroduced merely because conventional applicant trackers use them.
9. Sources remain first-class retained evidence; application CVs/letters remain visible from their candidature; reusable professional information belongs to the user and supports many candidatures/documents.
10. AI remains optional contextual assistance. External AI can participate in broader workflows, including job search/research outside AAAAT, through bounded AAAAT capabilities without making AAAAT itself a job-discovery engine.
11. Standalone VCVGenerator remains an independently core journey.
12. Setup/recovery remains secondary administration.

Any unresolved current interaction detail must be derived from current owner authority and current product documents, not from the historical mechanics preserved here.
