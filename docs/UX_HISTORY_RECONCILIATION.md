# AAAAT UX history reconciliation

Status: historical/research evidence for Mission #204. Not current UX authority.

Current authority remains:

```text
current direct Product Owner instruction
→ docs/OWNER_INTENT.md
→ docs/SPEC.md
→ docs/UX_DEFINITION.md for durable UX requirements
→ current Mission / Issue
→ tests / implementation
```

Historical material below preserves validated user problems and desired feel. It must not revive v1 mechanics, fixed navigation, field catalogues, task queues, lifecycle assumptions, or implementation boundaries.

## Historical sources reviewed

### Early owner/product intent

At historical commit `bcfe287fd3d50af6f96e0efa1ba18dde54f2b2e6`:

- `docs/PO/BasicAppRequirements.md`
- `docs/AAAAT Product Summary.md`
- `docs/product-owner-original-intent.md`
- related local-desktop dashboard planning

These establish the candidature as the main job/application context and the original product need for rapid recruiter-call recognition, retained raw material, direct annotations, reusable keywords/concepts, complete editability, and local ownership.

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

### v2 redesign research

`docs/v2DefinitionPrompt/RedesignOwnerNotes.md` and `docs/v2DefinitionPrompt/Method.md` preserved current-direction requirements that remain relevant where consistent with today’s authority: human-operable unified UX, sparse/raw starting points, independently core VCVGenerator, contextual AI, provider-neutrality, portable local documents, and progressive technical depth.

Later M6/Focus work also reinforced read-first Focus, sparse-valid states, explicit Sources, dirty-state protection, responsive small-window behavior, and ordinary language. Superseded M6 mechanics are not authority.

## Durable lessons and current translation

| Historical lesson | Current translation |
| --- | --- |
| Candidature is the central job/application object | Preserve candidature context for Focus, information, Sources, reminders/Concepts and application material. |
| Fast recruiter-call “panic mode” | Preserve as configurable **Focus**, optimized for recognition and recall rather than editing. |
| Read-oriented Smart View | Focus prioritizes readable retained information; controls/configuration are secondary. |
| Stable locations during calls | Keep predictable reading order/context; responsive reflow may change geometry without arbitrary movement. |
| Original offer/message remains readable | Sources are explicit first-class retained objects, searchable and inspectable independently of extraction. |
| Long raw material should not dominate call view | Full Source remains reachable while Focus stays concise and recognition-oriented. |
| Shared keyword definitions | Preserve as reusable contextual Concepts; exact right-rail/click mechanics are open. |
| Complete Detailed View | Preserve complete inspection/editing through progressive disclosure; no mandatory Detailed View mode. |
| User/professional workspace | Preserve reusable professional information editing; no mandatory User View mode. |
| Dense information can be useful | Prefer calm progressive density, not fashionably sparse hiding or cluttered walls. |
| Every meaningful value is editable | Preserve full user ownership and editability regardless of manual/AI origin. |
| Advanced users need deeper truth | Progressive disclosure must reach Sources, privacy/presentation controls, document ownership, provenance and portability. |
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
```

They may inspire later design only when they still solve a user problem and remain the simplest solution.

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

The current durable model is recorded only in `docs/UX_DEFINITION.md`.

## Current resolved UX direction

Direct Product Owner authority now resolves several questions that this history note previously left open:

1. Candidature-centred job/application work is the primary product journey.
2. Standalone VCVGenerator is the major parallel journey.
3. Sources belong to candidature context and remain first-class evidence.
4. Application CVs/letters must be visible from their candidature; generic document warehousing is not the governing model.
5. Reusable professional information belongs to the user and supports many candidatures/documents.
6. AI is contextual assistance; connection/provider administration belongs in secondary Settings.
7. ToDos are lightweight optional checkable reminders, usually candidature-related, not a product pillar.
8. Concepts are contextual reusable knowledge, not a separate knowledge product.
9. Setup/recovery is secondary administration.
10. Global navigation is deliberately deferred until candidature, VCVGenerator, professional-information, and Settings interaction contracts have been designed.

## Questions deliberately deferred to later design

History cannot decide exact interaction mechanics. The staged UX work must still challenge:

- the exact candidature collection/search → selected candidature transition;
- how Focus, full information, Sources, and application material coexist while preserving candidature context;
- how long/short Sources and sparse candidatures behave at default and `720×600`;
- how contextual Concepts/reminders appear without becoming navigation pillars;
- how dirty editing is protected during context changes;
- how standalone and candidature-linked VCVGenerator transitions work;
- how reusable professional information and variants/differences are progressively disclosed;
- how Settings avoids becoming another additive page;
- only after those contracts, what global shell/navigation best reflects the validated journeys.

These are Stage 1–5 design questions. They are not reasons to run another broad audit of the old packaged UI or to preserve the rejected IA.
