# AAAAT desktop interaction

This guide derives from current Product Owner intent and `PRODUCT_DEFINITION.md`. Prior screens, tests and historical interaction notes do not create product meaning.

For visible implementation, read this together with `docs/UX_VISUAL_DIRECTION.md`. The visual direction is mandatory guidance for visible UI work; it does not override product behavior, but a behaviorally correct generic SaaS treatment is not a finished AAAAT UX/UI.

## First run and loaded shell

Welcome has one primary job: establish a usable local workspace. It keeps AAAAT identity visible, shows the last workspace when useful, and offers **Create local workspace** / **Open existing workspace** as the primary decisions. Restore/recovery remains discoverable but secondary. AI and local PDF/TeX readiness may be stated compactly and truthfully, but neither is a prerequisite for workspace entry. The full first-run decision must remain reachable without branding pushing the primary actions out of the useful viewport.

Once a workspace is loaded, the persistent shell owns primary navigation and compact environment status. The rail may expose **Data: Demo/Local**, **AI: Off/Ready/Needs attention**, **PDF: Ready/Unavailable**, bounded task state and the shared Tag visor where useful. These are orientation aids, not a second workflow.

Loaded **Home is a branded landing console**. It combines the AAAAT robot/product image and identity with concise operational shorthand and obvious continuations into ordinary work. It is neither a bare launcher nor a generic metrics dashboard. Once a workspace is already loaded, Home does not offer `New workspace`, `Open existing workspace`, `Open demo` or equivalent workspace-entry buttons as landing content. Workspace switching/creation belongs in a compact shell/options interaction or a deliberate interaction on the displayed workspace/path; complete workspace administration remains available in Settings. Home may surface meaningful recent/ongoing local work and status without merely duplicating every rail badge.

## Applications

**Applications** is one configurable surface over the candidature corpus and selected candidature. There is no separate peer **Focus** / **All data** product mode. Rapid recognition and complete maintenance are different depths of the same information model.

Opening Applications begins with the corpus/search surface rather than an automatically selected record or configuration panel. Search, creation affordances and recognizable candidature information own the useful viewport. Sparse/raw-only applications remain valid and recognizable. Field-definition/configuration machinery is progressively disclosed and must not push corpus work below administration.

Selecting an application expands/transitions into the same information surface with a richer view of that candidature. Favourite/primary information is prominent; remaining configured information, Sources, history and secondary controls are available through progressive disclosure. Tags and their stored shared meaning are contextual application information, not a permanent complete-glossary list. Editing, presentation options and AI assistance are actions on one information object rather than separate competing field mechanisms.

### New application — two direct approaches

`New application` presents two understandable peer intentions. Neither is canonical:

1. **Enter details** — direct structured entry for information the user already knows.
2. **Paste or write material** — low-friction retention of an offer, recruiter message, form copy, note or other raw material.

Direct entry is one coherent application-level task surface with useful recognition information first and one clear completion action. Sparse information is valid. Do not render a tall procession of unrelated mini-records each demanding separate administration.

The raw-material path is deliberately simpler:

```text
paste / write material
→ retain it as a Source
```

Retention alone is successful. Do not require a separate title, URL, company, role, status, priority or other structured value before saving the raw Source.

After retention, the same post-retention view shows both explicit continuations together:

- **Send to AI** — ask a suitable configured AI route to propose values for the currently configured application information;
- **Fill manually** — keep the retained Source readily visible beside/with the editable candidature information so the user can transfer values without context switching.

The manual route is first-class no-AI operation, not a fallback. AI failure never invalidates the retained Source. AI proposals never replace durable information until explicitly accepted.

## Application information and AI use

Flexible application information is user-maintainable product data. Ordinary UI speaks in terms of information/details rather than schemas, field IDs, cardinality or storage mechanics. Advanced value-format/definition controls remain deliberately deeper.

Favourite/primary presentation, order and card size are properties of the same information object and remain contextual rather than permanent heading chrome.

Every editable application information item has one compact contextual affordance whose ordinary meaning is **AI may use this information**. Enabled+empty means Source extraction may request that information; enabled+populated means bounded AI assistance may receive the retained value; disabled means neither request nor disclosure. `Ask AI` is a separate operation, not a second permission mechanism. Ordinary UI does not expose `aiDiscovery`, `aiContextMode`, schema, projection, token or disclosure-engine vocabulary.

## Tags

Application Tags appear as attached chips/tokens with compact attach/search/create interaction. A missing Tag may be created with a real definition. Selecting an attached Tag reveals its shared canonical name, aliases, definition and notes and allows editing that shared meaning. The application screen never renders the whole glossary as a permanent checkbox/button list.

Tags are also shared workspace vocabulary/retrieval aids. A compact rail visor may search the glossary and show stored shared meaning without becoming another full Tag administration destination. At constrained sizes the visor must not crowd the principal task merely because the rail has room at larger widths.

## My information

**My information** is read-first reusable professional content. The ordinary screen shows actual experience, skills, education, projects, identity/contact, languages, links, summaries, credentials and justified custom information that exists; sparse content is normal.

Grouping is for recognition, not a closed profession taxonomy. Adding/editing begins from a useful human intent rather than schema administration. Saved item-level variations are optional reusable differences and remain secondary until deliberately invoked. Career objectives/preferences/constraints stay within the same My information experience while remaining semantically distinct from evidence such as experience or education.

AI-use permission is contextual to the relevant reusable information and uses the same understandable meaning as application information. It must not become a permanent privacy/security console.

Document → My information → document handoffs preserve the originating document context and dirty work. Editing reusable information is visibly distinct from changing only the current document.

## CVs / Documents

The **CVs/Documents** destination is a collection with visibly distinct groups for reusable **Templates**, editable/saved **Working CVs** where surfaced, **Rendered CVs**, **Letters**, and **Application packets** according to the current document model. A PDF is an output artifact, never a permanent editor tab or template section.

A CV template is an ordered reusable composition. Its editor exposes compact metadata, ordered sections and selected information. The user can add/remove/rename/reorder sections and add/remove/reorder information items. Section role is semantic **Main** / **Secondary**, never rail/column geometry.

Opening a template creates or opens a **Working CV**. A Working CV is read-first: by default it looks like a recognizable CV outline with compact section hierarchy and actual retained content, not a permanently expanded database form. Only a deliberately selected item enters edit mode at a time. Source choices use ordinary wording such as **My information — current**, **Saved variation — …**, or **This CV only**. Ordering/removal and ownership actions remain compact/contextual.

Working-document edits remain local to that CV unless the user explicitly chooses an ownership action such as **Save to template**, **Save as new template**, **Save as profile variant**, or **Update My information**.

**Render PDF** creates a separate **Rendered CV** containing the PDF and content/composition snapshot used. Blueprint choice is a render-time presentation input, not ownership on the editable CV/template. Advanced user-owned LaTeX source configuration remains outside ordinary content editing and must not expose raw internal paths or turn the product into a source-code editor.

A cover letter created from an application is application-owned immediately and is surfaced in that application while remaining discoverable in **Letters**. Combined CV+letter output uses the **Application packet** concept; do not create another packet engine.

## Settings and capability handoffs

Settings uses recognizable tabs with one unmistakably active content panel rather than a launcher grid of explanatory cards. Current intended destinations are **Workspace**, **AI**, **Documents**, and **Backup**.

Workspace switching/creation and full workspace administration live here even though a compact switch interaction may also be reachable from the shell workspace/path control. An invalid or unreachable configured AI URL produces **AI: Needs attention** in the shell and a concrete inline error beside the relevant Settings control. Missing TeX/PDF capability is contextual to rendering and Documents settings, not a global application failure.

User-editable AI guidance belongs clearly in AI Settings. Contextual AI action surfaces execute a task and show relevant context/result state; they do not duplicate a competing prompt-configuration system.

## Visual hierarchy, space and responsive behavior

The useful information takes the viewport. AAAAT combines machine/panel surfaces for navigation/status/tools with paper/document surfaces for readable information. Identity and decoration must reinforce hierarchy rather than consume the work area.

The visual target is the friendly worn retrofuturist AAAAT character defined in `UX_VISUAL_DIRECTION.md`: repaired field terminal / workshop instrument, paper dossier, restrained mid-century industrial cues, weathered warm materials and professional clarity. Historical dark/light logos, banners, backgrounds, loading art and `AAAATART.png` under `docs/owner-source/` are research inputs to inspect directly, not mandatory mockups to copy.

AAAAT does not define an arbitrary fixed product minimum window size. Concrete dimensions used in tests/screenshots are verification samples only. At constrained sizes one principal intention owns the useful viewport; transition, reflow, stacking and vertical reachability are preferred over clipping or cramped persistent panes. At expanded sizes, information should make productive use of available space rather than remain in a narrow centered form surrounded by empty canvas.

Empty and sparse states are intentional compositions: they explain the current state and make the next useful action clear. Large unused areas with a tiny floating control cluster are not a finished empty state.

Light/dark presentation must be a deliberate coherent visual decision when implemented. Paired historical assets make both directions available as design evidence; do not accidentally equate the current fixed `color-scheme: light` implementation with product authority, and do not create a heavy theming framework without need.

## Acceptance

Natural-use review must establish that a person can:

- enter or open a workspace without setup ceremony or first-run overflow;
- understand loaded Home as AAAAT's landing console without redundant workspace-entry buttons;
- find applications quickly and create one through either direct details or raw-material retention;
- retain raw material and immediately choose AI or manual continuation without losing the no-AI path;
- read and deliberately maintain application information without decoding schema mechanics;
- attach/search/create Tags without glossary overload and retrieve shared Tag meaning;
- review/edit reusable professional information without administering a database;
- compose/read/edit a Working CV without decoding internal state or accidentally mutating reusable sources;
- render separate artifacts and find application-owned letters/packets;
- understand capability failures and Settings without development vocabulary;
- use the app at constrained and expanded desktop sizes without clipping, wasted hierarchy or decorative obstruction.

Behavior tests are necessary but not sufficient for visible UX/UI acceptance. The eventual coherent PLAN[5] candidate requires real rendered/packaged desktop evidence across these surfaces and the orchestrator must inspect that evidence directly.