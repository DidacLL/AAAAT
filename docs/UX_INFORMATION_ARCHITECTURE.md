# AAAAT product information architecture

Status: Issue #205 design contract. This document proposes the coherent human interaction architecture for Mission #204. It is subordinate to `docs/OWNER_INTENT.md`, `docs/SPEC.md`, and direct Product Owner instruction.

This is a behavior and hierarchy contract, not a pixel specification. Exact spacing, component shapes, icon choices, typography details, breakpoints, and implementation decomposition remain design/implementation decisions so long as they preserve the intent below.

## Problem statement

The current alpha contains the required capabilities, but visible composition largely reflects the order in which capabilities were added. At the shell level, Candidatures, ToDos, Profile, Documents, AI assist, and Settings are presented as equal top-level destinations. Within those destinations, later features are often appended beneath earlier ones: optional AI comparison/extraction below candidature work, career context above the profile workspace, and setup status, free-chat guidance, recovery, and AI connection administration stacked together inside Settings.

This makes the product technically complete but cognitively additive. The redesign must organize existing capability around user intentions rather than implementation boundaries.

## Governing UX model

AAAAT serves one user through progressive depth:

```text
recognize / do ordinary work
→ inspect or edit the selected thing
→ reveal advanced controls when deliberately requested
→ expose technical ownership / privacy / portability details where relevant
```

There is no separate basic product and advanced product. Non-technical users should encounter ordinary career language and a small number of obvious actions. Advanced users should be able to reach the complete authoritative information and meaningful controls without leaving the graphical product.

## Top-level information architecture

The ordinary workspace has four primary destinations:

```text
Opportunities
Documents
Career
ToDos
```

A separate global Settings destination exists, but it is secondary application/workspace administration rather than equal-frequency career work.

`AI assist` is not a top-level destination. AI is contextual assistance attached to the information/document task it assists. AI connection and capability administration belongs in Settings.

A dashboard/Home destination is not introduced in this Mission. Historical v1 Welcome/Home ideas remain useful research, but current product authority does not require a dashboard and there is no evidence yet that another primary destination improves the product more than it adds navigation.

### Opportunities

Purpose: capture, find, understand, inspect and maintain candidatures/opportunities, especially under time pressure.

Default selected-opportunity view: **Focus**.

The opportunity workspace should expose these intentions without requiring a giant all-fields form:

```text
Focus
Information
Sources
Related material
```

These labels are not domain subsystems and need not become a generic section framework.

- **Focus** is the fast configurable read projection. It contains only retained information/material currently configured for Focus and preserves stable reading order.
- **Information** gives complete progressively disclosed access to normal candidature field/value data, including user-defined fields. Populated information is readable first; editing is close to the value but not permanently expanded. Missing enabled information is reachable through a compact Add-information path.
- **Sources** owns retained raw title/URL/text inputs. A Source remains independently inspectable/editable and long text is readable on demand.
- **Related material** groups candidature associations that are separate domain objects: Concepts, ToDos, Documents and retained application artifacts. The renderer may use subgroups/tabs/cards as appropriate, but these objects must not be flattened into generic fields.

Activity/provenance is secondary advanced information. It should be reachable where useful without competing with Focus or ordinary editing.

#### Opportunity list/search

The list is a recognition and retrieval surface, not a miniature dossier.

- Search is primary and searches retained information/source text as supported by the product.
- Sparse records are valid and identifiable using useful available content rather than forced company/role completion.
- Archive/filter controls are secondary.
- Advanced field filters are available but should not dominate ordinary search.
- `New opportunity` is an obvious action. Creation must permit a blank sparse record and raw-first/source-first capture without implying a mandatory sequence.

#### Opportunity field administration

Creating/editing field definitions, Focus visibility/order/prominence, and AI disclosure controls are powerful advanced capabilities. They should not sit inline with ordinary value editing by default.

Use an explicit `Customize information` / equivalent advanced surface reachable from Information/Focus. It may contain:

- field definitions and choices;
- enable/disable behavior;
- Focus visibility/order/prominence;
- AI-context visibility;
- other supported presentation/privacy behavior.

This keeps advanced auditability without turning normal opportunity maintenance into schema administration.

#### Contextual AI in Opportunities

AI actions stay near the work they perform:

- Source/field extraction or rediscovery belongs to Sources/Information;
- selected-opportunity fit/opinion belongs near the relevant opportunity context when requested;
- selected-candidature comparison begins from explicit multi-selection/search context;
- no provider/connection terminology appears in ordinary opportunity work.

If no suitable AI route exists, the ordinary manual path remains complete. The UI may offer setup as a secondary explanation rather than presenting disabled AI machinery everywhere.

### Documents

Purpose: independently create, edit, tailor, render and own CV/cover-letter work.

Documents is primary even when there are no candidatures.

The normal structure is:

```text
document list / create
→ selected document content
→ save / render
→ contextual tailoring or association
→ advanced source / portability / access controls
```

The selected document should prioritize the content the user is writing and the result they are producing.

Primary actions:

- Create CV / cover letter;
- edit structured content;
- Save;
- Render / open result where supported.

Secondary/contextual groups:

- profile basis and document-specific included/overridden items;
- opportunity association and retained application artifact capture;
- combined CV + cover-letter output;
- contextual AI tailoring/drafting;
- assistant descriptor/content/render permissions;
- managed/manual source state;
- portable project export/regeneration and advanced TeX ownership details.

The current separate `AI assist` document workflow should be folded into the relevant selected document/action. Users should not have to navigate away from a CV to another top-level destination, reselect the same document and candidature, ask for assistance, then return.

Advanced source ownership must remain explicit and auditable. `main.tex`, `aaaat.sty`, feeder-owned `data.tex`, PDF/output paths and export operations belong under a clear `Source & portability` / equivalent advanced area, not in the primary writing hierarchy.

### Career

Purpose: maintain reusable professional information and current career context.

The normal Career destination is read-first and grouped around meaning rather than storage structures:

```text
Professional information
Career context
Variants / reuse options
```

- Canonical professional information is the authoritative reusable evidence.
- Career direction/objectives/constraints/preferences are adjacent but semantically distinct.
- Variants are optional differences. They should be discoverable for users who need them without becoming a prerequisite for ordinary profile maintenance or document creation.

Ordinary profile items should render as readable entries with nearby Edit/Remove affordances. `Add information` opens a focused editor rather than keeping an empty creation form permanently dominant.

Variant rules, ordering, content patches and other difference mechanics are advanced reuse controls. Their behavior remains fully inspectable/editable, but the user should not need to understand implementation terminology to use a CV.

AI assistance related to career information belongs contextually here when supported. AI visibility/disclosure controls remain explicit and independent from Focus/document presentation.

### ToDos

Purpose: lightweight reminders, with optional opportunity association.

ToDos are list-first:

- open items are easy to scan and toggle;
- completed items remain accessible without dominating;
- `Add ToDo` opens a compact editor;
- editing one item is contextual;
- optional opportunity association uses recognizable opportunity labels.

Do not suggest scheduling, recurrence, workflows, AI queues or automatic next actions.

Opportunity-associated ToDos can also appear in an opportunity's Related material and Focus when configured. That does not create duplicate data or a second ToDo model.

## Global shell

Once a workspace is open, the shell should become quiet and work-oriented.

### Header

The persistent header contains only globally meaningful identity/navigation:

- compact AAAAT identity;
- current workspace identity in human-readable form;
- primary destination navigation;
- a secondary Settings/workspace menu or control.

The raw workspace path is important for ownership/auditability but should not dominate every working screen. Expose it in the workspace menu/Settings and optionally as secondary detail.

Do not keep a persistent `Workspace ready` hero/status heading once the workspace is already open.

Do not keep framework/foundation readiness text in ordinary chrome. Surface actual user-impacting setup problems contextually or in Settings.

### Footer

No fixed footer is required. Local-first/no-AI ownership should be communicated during first run and in relevant Settings/help surfaces, not by reserving permanent content height for slogans. If a footer remains, it must never cover or constrain primary content.

### Workspace switching

`Change workspace` is global, not a primary career action. It belongs in the workspace control/menu. Existing dirty-draft confirmation remains mandatory.

## Settings information architecture

Settings is secondary and internally grouped. It should not render every administrative capability as one long page.

Recommended groups:

```text
Workspace
Setup & rendering
AI connections
External assistants / integrations
Advanced / portability
```

Only implement groups for capabilities that actually exist; do not add placeholders.

### Workspace

- workspace name/path/ownership information;
- change workspace;
- backup;
- restore;
- configuration import/export where appropriate.

Recovery is prominent inside Workspace settings but secondary on first-run relative to Create/Open.

### Setup & rendering

- simple readiness summary;
- TeX/document-rendering status;
- refresh/recheck;
- actionable guidance when something is missing.

Raw command names/versions can be shown under `Details` for advanced auditability rather than dominating the status summary.

`installer.ai` / `configurator.ai` guidance is an optional help mechanism. Show concise actions to copy/view the guidance; do not permanently render two fourteen-row prompt textareas in the main Settings flow.

### AI connections

- configured connection list;
- add/edit/remove connection;
- general/default routing;
- operation capability/validation status;
- portable AI configuration import/export.

Connection endpoint/model and operation-routing details are legitimately technical because this is an explicit setup surface. They should still be grouped progressively so a non-technical user who does not use AI can ignore the section entirely.

### External assistants / integrations

Host setup such as the supported VS Code/MCP path belongs here or within AI setup, using user-facing explanation of actual host access and the exact bounded capabilities. Do not mix it into ordinary candidature/document navigation.

## First-run architecture

First-run is a decision surface, not a permanent dashboard.

Hierarchy:

1. concise product identity/purpose;
2. primary `Create workspace`;
3. secondary `Open existing workspace`;
4. small `Recover from backup` path;
5. brief reassurance: local workspace, works without AI/cloud account;
6. help/setup only when requested or when a genuine prerequisite blocks a chosen feature.

A large brand image may support identity, but it cannot push the primary action or recovery controls out of reach at supported window sizes.

Do not show setup environment details, AI setup, TeX guidance, or technical readiness before the user selects a workspace unless the current action actually requires them.

When a valid workspace opens, transition directly to Opportunities (or the user's persisted last primary destination if later justified). Do not continue to display onboarding content.

## Empty, loading and error states

### Empty states

Empty states answer:

- what exists here;
- what the user can do next;
- whether doing nothing is valid.

Examples:

- no opportunities: `No opportunities yet` + `New opportunity`; explain that a pasted message/URL or blank record is enough;
- no documents: `Create a CV or cover letter`; no candidature/AI prerequisite implied;
- no ToDos: `No ToDos yet` + Add;
- empty Career: explain reusable professional information and offer Add;
- no AI connections: neutral optional state, not an error.

### Loading

Use local, bounded status text near the affected destination. Avoid full-screen technical loading unless workspace initialization itself is pending.

### Errors

Errors should state what user action failed and whether authoritative state changed. Technical detail can be available on demand where useful. Recovery/restore errors must continue to state that the current workspace was not changed when that guarantee holds.

## Progressive disclosure rules

1. Readable retained content before editing controls.
2. One clear primary action per local task; secondary actions visually quieter.
3. Empty optional data does not reserve large space.
4. Advanced configuration appears on deliberate request, not automatically because it exists.
5. Technical terms are appropriate only where the user is explicitly administering the technical boundary.
6. Raw/provenance/source material is never hidden irretrievably; it can be collapsed until requested.
7. AI controls do not appear merely because a capability exists; they appear where assistance is meaningful.
8. Destructive operations remain explicit and confirm when needed.
9. Navigation never silently discards dirty drafts.

## Responsive composition

The product supports its declared minimum `720×600` window without clipped or unreachable primary actions.

Behavior, not exact breakpoints, is authoritative:

- page content scrolls vertically when needed;
- fixed chrome never overlaps content;
- primary navigation remains reachable and understandable;
- two-/three-column workspaces collapse to one readable content flow rather than compressing each pane beyond usefulness;
- list + detail layouts may become a selectable list followed by detail/back navigation at smaller widths;
- forms normally become one column;
- long Source/document text wraps and scrolls in the page rather than forcing horizontal overflow;
- advanced side/context panels may move below primary content;
- logical keyboard/read order matches the visual order after reflow.

At normal desktop widths, Opportunities and Documents may use efficient list/detail composition. The v1 fixed 20/60/20 split is not a requirement.

## Auditability contract

Progressive disclosure must still allow an advanced user to inspect and control:

- every normal user-facing candidature field/value;
- field definition/configuration where supported;
- Focus visibility/order/prominence;
- AI disclosure independently from Focus;
- all retained Sources including full text and URL;
- Concepts and aliases/notes;
- ToDos and associations;
- professional items, career context and difference-based variants;
- document-specific overrides;
- document source ownership and portable source/PDF output;
- retained application artifacts;
- meaningful activity/provenance;
- workspace path, backup/recovery and portable configuration;
- AI connections, capability routing and host-access implications.

This does not require exposing internal UUIDs, hashes or migration metadata as ordinary UI fields.

## Current-alpha reconciliation

The following current capabilities should be **recomposed**, not deleted:

| Current presentation | Target placement |
| --- | --- |
| Candidatures top-level | Opportunities primary destination |
| ToDos top-level | ToDos primary destination |
| Profile top-level + CareerContext stacked | Career primary destination with internal grouping |
| Documents top-level | Documents primary destination |
| AI assist top-level | contextual Opportunity/Document/Career assistance |
| Settings top-level equal tab | secondary global Settings |
| Optional AI comparison beneath Candidatures | explicit selected-opportunity comparison action |
| Optional AI extraction beneath Candidatures | Source/Information contextual action |
| Document AI assistance separate screen | contextual selected-document action |
| Environment + free-chat guidance + recovery + AI settings stacked | grouped Settings navigation/progressive sections |
| Workspace ready + raw path on every ready screen | compact workspace identity/menu; path in details |
| permanent foundation/local-first footer | remove from ordinary work or make non-obstructive/contextual |

The existing Focus model is directionally aligned with the target because it already projects only retained configured information and can include Sources, Concepts, ToDos and Documents. Its configuration UI should become less administrative, but its authority model should be preserved.

## Implementation constraints

The next implementation Issue may reorganize renderer composition and ordinary CSS, but must preserve all established application-service, dirty-state, security/privacy, local-ownership and document-authority boundaries.

Do not introduce merely for this redesign:

- a design-system framework;
- a router dependency;
- a renderer-wide state framework;
- a generic section/module registry;
- a drag/drop dashboard framework;
- a new UI toolkit;
- generic CRUD or workflow abstractions.

Ordinary React composition/state and existing CSS are the default approach unless concrete implementation evidence proves insufficient.

## Visual/runtime validation still required

This contract is grounded in current renderer source, existing behavior tests, prior packaged acceptance screenshots, current `OWNER_INTENT`/`SPEC`, v1 product-research history, and the accepted M6/Focussed-retrieval lessons.

Before closing Issue #205, perform one bounded packaged visual audit at normal/default size and at `720×600` to challenge this architecture, not to rediscover it. The runtime audit should look for contradictions such as:

- a capability that genuinely needs separate top-level navigation;
- an existing contextual flow that would become materially harder under the proposed grouping;
- keyboard/dirty-state behavior that the recomposition would break;
- content density that requires a different responsive strategy;
- any advanced/audit function not represented here.

If no such contradiction appears, the runtime pass should record screenshots/observations and #205 can close. Minor current visual defects are implementation evidence for Mission #204, not reasons to patch the old layout before recomposition.