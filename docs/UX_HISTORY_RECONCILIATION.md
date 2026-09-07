# AAAAT UX history reconciliation

Status: research lineage for Mission #204 / Issue #205.

This note records which historical UX ideas are still useful, which have been superseded, and how to translate older owner language into current product expectations. It exists so future agents do not either discard validated v1 lessons or accidentally revive v1 implementation contracts.

Authority remains:

```text
current direct Product Owner instruction
→ docs/OWNER_INTENT.md
→ docs/SPEC.md
→ current Mission / Issue
→ tests / implementation
```

Historical material below is evidence only.

## Historical sources reviewed

### Early owner/product intent

At historical commit `bcfe287fd3d50af6f96e0efa1ba18dde54f2b2e6`:

- `docs/PO/BasicAppRequirements.md`
- `docs/AAAAT Product Summary.md`
- `docs/planning/local-desktop-dashboard.md`
- `docs/planning/local-desktop-dashboard-slice-01-status.md`

These establish the original product feel: a local single-window workspace, recruiter-call panic support, dynamic/modular presentation, direct annotation, shared keywords/concepts, raw material retention, and complete user editability.

### Mature v1 desktop work

At historical PR #37 / head `3683f1daad099768709d7fd07c99d93e58cc80ef`:

- `docs/planning/local-desktop-dashboard-slice-03-detailed-view-editing-columns-plan.md`
- `docs/planning/v1-release-requirements-trace.md`
- `docs/planning/v1-drift-audit-2026-07-13.md`

These sharpened the distinction between panic-mode retrieval and complete editing, required readable original source text, emphasized stable call-time information locations, and rejected browser/runtime and workflow-model drift.

### Later v2/M6 UX research

Issue #127 and historical commit `49d39eee3631c363ce53b423101d059d2b0ed066` recorded a later attempt to avoid v1's giant-form failure using Focus plus progressive editing intentions. That exact M6 contract was later marked superseded and is not authority, but many of its reduction lessons are consistent with current `OWNER_INTENT` / `SPEC`: read-first Focus, sparse-valid states, no empty-card wall, explicit Sources, dirty-state protection, responsive small-window behavior, and ordinary language.

## Reconciliation table

| Historical lesson | Current status | Current translation |
| --- | --- | --- |
| Local desktop workspace, not a developer tool | Preserved | Coherent graphical desktop; ordinary users do not need shell/JSON/protocol knowledge. |
| Single-window/dashboard feel | Preserve the feel, not the literal architecture | Work should feel spatially coherent and easy to orient in; exact dashboard/module mechanics are not required. |
| Smart View as recruiter-call panic mode | Preserved as **Focus**, generalized | Fast identification/retrieval is core; content is configurable rather than a fixed recruiter script. |
| Smart View should be read-oriented, low-noise | Preserved | Focus is read-first and must avoid form/action walls. |
| Stable location matters during live calls | Preserved as predictability | Do not move information arbitrarily; responsive reflow must retain logical order/context. Exact v1 panel positions are not binding. |
| Literal job offer/source remains readable | Strengthened | Sources are explicit first-class retained objects; raw text/title/URL must remain retrievable independently of extraction. |
| Long source should not dominate panic view | Preserved | Raw material is available on demand while recognition/high-value context remains first. |
| Keyword links/definitions in context | Preserved as Concepts | Shared Concepts participate in search and Focus; exact clickable-right-pane interaction is optional. |
| Fixed bottom notes band | Mechanism superseded | Notes should remain easy to reach during retrieval/editing; exact placement is not a requirement. |
| 20/60/20 Smart pane layout | Superseded | Focus should allocate space by useful prominence and respond to window size; no fixed ratio contract. |
| First-click expand, second-click enter focus | Superseded | Staged recognition can be useful, but no exact click sequence is required. |
| Detailed View = complete editor | Product need preserved, mode rejected | Complete candidature inspection/editing must exist through progressive disclosure; no mandatory `Detailed View` top-level mode. |
| Every meaningful field visible/editable | Strengthened | Every normal user-facing field/value supports inspection/editing and domain-permitted set/clear/remove behavior. |
| Field-local editing near content | Preserved as a preference | Edit close to context when useful; avoid page-wide form walls. Exact edit-button pattern is not binding. |
| User View = rich professional/career workspace | Product need preserved, mode rejected | Reusable profile/career information needs a coherent graphical home; exact `User View` architecture is not required. |
| Welcome View with todos/recent items/setup | Partially preserved | First-run orientation and possible overview are useful, but a persistent dashboard/home is not inherently core. Audit must justify what deserves a landing surface. |
| ToDos on dashboard | Domain preserved, placement open | ToDos remain lightweight and easily reachable; no dashboard placement requirement. |
| Candidature statuses and next actions drive overview | Explicitly weakened | These are optional information. They may be shown when useful/configured but do not define validity or product flow. |
| `active/closed` only | Superseded | Status/lifecycle may exist but is optional and must not drive architecture. |
| Generated task queue visible to user | Superseded | Current assistance uses direct/local and named bounded operations; no universal AI task queue or approval workflow. |
| New candidature raw input launches inference tasks | Raw-first preserved; workflow superseded | Any sparse/manual/raw starting point is valid; AI is optional and mixed freely with manual work. |
| Rich complete candidature field catalogue | Vocabulary preserved, catalogue rejected | Useful semantic information can be built-in or user-defined; no mandatory fixed checklist. |
| Modular/editable views | Intent preserved, free-form dashboard rejected | Users control Focus visibility/order/prominence; responsive composition is preferred over arbitrary pixel dashboard editing. |
| Desktop pane resizing/layout persistence | Useful but not core contract | Preserve user control where it solves a real need; do not rebuild v1 layout state merely for compatibility. |
| wx desktop is canonical | Superseded implementation | Electron/React is current baseline. No v1 widget/module architecture compatibility. |
| Browser dashboard rejected | Historical implementation decision | Current desktop remains Electron; this historical browser-vs-wx debate does not define current IA. |
| Advanced user can see everything | Preserved and clarified | Advanced users should reach complete user-owned information, Sources, document source/output, presentation/privacy controls and meaningful provenance without exposing irrelevant internal metadata. |

## Durable UX lessons extracted from v1

### Fast recognition under low attention

The strongest historical use case is the unexpected recruiter/interview call. The user may be stressed, multitasking, or unable to remember which opportunity is calling. AAAAT should support recognition before demanding record administration.

Historical Smart View attempted this with overview cards, compact navigation, a dominant center, secondary concept context and persistent notes. Current Focus should preserve the cognitive goal while allowing a better layout and user-configurable content.

### Dense information can still be calm

The owner repeatedly wanted useful information visible quickly, not a minimalist UI that hides everything behind deep navigation. The failure mode was clutter, not density itself.

The current translation is **progressive density**:

- first sight: enough information to recognize and act;
- next layer: richer selected context;
- explicit edit/details layer: complete information and controls;
- advanced layer: privacy/presentation/provenance/setup/source mechanics.

Avoid both extremes: giant forms and over-simplified cards that conceal the user-owned record.

### Raw material is part of trust

Historical plans repeatedly kept the original posting/source reachable because summaries and inferred fields are not substitutes for evidence. Current Sources formalize this product lesson and make it stronger: multiple Sources can coexist, and extraction never destroys or replaces them.

### Editable means genuinely editable

Historical Detailed/User discussions objected to read-only/pruned presentations. Current owner intent is clearer: all normal user-facing information is ordinary editable user-owned data, regardless of whether it came from manual entry, extraction, direct AI or external contribution.

The UI can hide editing controls until requested, but it must not hide the underlying capability.

### Advanced use must not punish ordinary use

The owner wants a product that works for non-technical users while remaining transparent and auditable for advanced users. This is best represented as progressive disclosure, not separate novice/expert modes.

Normal workflows use plain domain language and sensible defaults. Advanced/details surfaces expose complete values, raw Sources, user-defined information, AI visibility, Focus configuration, document/source ownership, backup/recovery and connection/capability details.

### User intent matters more than implementation boundaries

Historical v1 often organized UI around implementation modules and field registries. Later v2 work exposed the opposite risk: additive development creates top-level sections simply because each capability was implemented separately.

The #204 redesign must group by what the user is trying to do, not by which Issue, table, service or component introduced the capability.

## Historical mechanics that should not bias the redesign

Do not assume any of the following are desirable simply because they were once approved or implemented:

```text
Smart / Detailed / User / Welcome as the exact top-level navigation
left-center-right fixed dashboard geometry
20/60/20 pane ratios
card ids such as Call / Source / Now / Later / Offer
fixed notes band
right keyword rail
AUI docking/resizing
first-click/second-click overview transitions
canonical v1 field registry
active/closed lifecycle
agent task queue
provider bridge/work-item language
browser-vs-wx compatibility concerns
```

They may inspire a new solution only if the packaged audit demonstrates the same user problem still exists and the mechanism remains the simplest solution.

## Current non-negotiable corrections over v1

Current `OWNER_INTENT` / `SPEC` override v1 in several important ways:

1. **Sparse use is broader.** Company, role, status, priority and next action are not required and should not become universal visual hierarchy.
2. **Focus is configurable.** Every normal value can participate with user-controlled visibility/order/prominence; fixed Smart content is obsolete.
3. **Sources are explicit independent objects.** They are not a single raw-offer field.
4. **Information is flexible.** The product vocabulary is not a permanent field catalogue; user-defined useful fields are supported.
5. **VCVGenerator is independently core.** Documents cannot be subordinated to candidature workflow.
6. **AI is optional and mixed freely.** There is no required inference/task sequence or universal review queue.
7. **ToDos are deliberately lightweight.** They are not agent tasks or workflow steps.
8. **Presentation/privacy controls are first-class and independent.** Focus visibility and AI disclosure are distinct.
9. **External assistance is named and bounded.** Ordinary UI should not expose integration mechanics during career work.
10. **Exact screen decomposition is not a product invariant.** The redesign may replace current tabs and historical modes if it preserves capabilities and improves the user journey.

## Questions the packaged audit must answer

The historical record gives principles but cannot answer the current IA by itself. #205 must observe the real Electron product and decide:

- Does AAAAT need an ordinary post-workspace Home/Overview destination, or should it open directly into the last/most useful work area?
- Which current top-level tabs represent real user destinations versus additive implementation history?
- Should AI assistance be a destination at all, or contextual actions plus Settings/configuration?
- Where should backup/recovery live after first run so it is discoverable but not visually dominant?
- How should global workspace/setup controls be separated from selected-candidature work?
- What is the clean relationship between Focus and complete candidature editing now that Smart/Detailed compatibility is explicitly rejected?
- How should Concepts, ToDos and Documents appear in Focus without turning Focus into a dashboard of empty modules?
- How should advanced privacy/Focus configuration be reached without burdening ordinary users?
- What information is currently duplicated across Candidatures, AI assist, Profile, Documents and Settings?
- What should remain visible at the declared `720×600` minimum size, and what should scroll/collapse/reflow?

The answers should be based on observed current user journeys and the current authority, not on nostalgia for v1 screenshots.
