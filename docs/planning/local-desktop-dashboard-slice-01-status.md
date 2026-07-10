# Local Desktop Dashboard Slice 01 Status

Branch: `didacll/local-desktop-dashboard`
PR: `#37`

## Classification

```text
READY_FOR_SPRINT_CLOSE_MANUAL_VERIFICATION
```

The current Smart View direction is a local desktop call cockpit, not a CRUD dashboard. Recent verification added two final sprint-close UX constraints:

```text
notes must be fixed at the bottom of the central panel
keywords in central text must link to a right-pane definition module
```

This matches the source PDF interaction model: navigate by candidature/call signal first, then use linked technical terms as fast jumps into a definition surface.

## Corrected Smart View UX contract

### Recognition before administration

The no-selection state is an overview board. Candidatures are readable cards with:

```text
company
role
status / priority / keywords
short identifying signal
source excerpt
```

The overview distributes cards horizontally and wraps across the available desktop width.

### Staged overview interaction

```text
first click: expand the card in place
second click on the expanded card: open Smart View focus mode
```

The first click gives more recognition information without collapsing the list. The second click commits to the candidature.

### Focus mode hierarchy

Focus mode prioritizes the center:

```text
left: narrow candidature navigation strip
center: dominant call cockpit, source reader, and fixed notes band
right: narrow keyword definition / secondary context
```

The right panel default is intentionally small. Previously saved large right-panel widths are clamped during this development slice.

### Literal offer/source text

A candidature may include a long literal offer text. That text is factual source material and often the strongest visual memory from the application process.

Smart View exposes it as a center reader:

```text
Source · compact excerpt
expanded: full-width source reader with linked glossary terms
```

This avoids pushing long source text into small right-column modules or two-column cards where it becomes unreadable.

### Notes band

Notes are not a right-pane module. Notes are fixed at the bottom of the central panel:

```text
center top: call cockpit and source reader
center bottom: notes band, about 20 percent of center height
```

The notes band is always reachable while reading the source text and does not steal the right-pane keyword definition surface.

### Keyword definition interaction

Technical keywords are not passive chips. Terms inside central text are links:

```text
click keyword in center text -> right pane shows definition
```

The right pane is dedicated to the active keyword definition, with small keyword shortcut buttons and secondary artifacts below.

### Center content structure

The center uses:

```text
hero: company / role / chips
call cockpit: Recognize / Pitch / Ask / Watch, with linked terms
source reader: literal offer text, with linked terms
secondary center modules: Now / Later / Offer, with linked terms
bottom band: Notes
```

This keeps the central content readable and preserves the PDF-originated idea of linked technical terms everywhere.

## Implemented

### Toolkit-neutral foundation

- `aaaat/dashboard_projection.py`
  - Builds human-local projection sections for `welcome`, `smart`, `detailed`, `user`, `glossary`, `permissions`, and `view_state`.
  - Exposes Smart View selected-candidature detail, primary note, keyword context, artifacts, source text, and call context.
  - Exposes raw source excerpts and source length when raw intake is included in the local desktop payload.
  - Does not import wxPython.
  - Is not exposed as an agent API.

- `aaaat/dashboard_layout.py`
  - Persists local layout state only.
  - Defaults Smart View to a narrow focus nav and a narrow right context.

### wx desktop Smart View adapter

- `aaaat/ui_desktop/app.py`
  - Builds the desktop projection with `include_raw=True`, so local Smart View can show literal source text.
  - Keeps wxPython import isolated to launch time.

- `aaaat/ui_desktop/main_window.py`
  - Keeps overview cards horizontal and wrapping.
  - Keeps staged card click behavior.
  - Shrinks/clamps the right context width.
  - Adds a dominant center call cockpit.
  - Adds a full-width source reader for long literal offer/source text.
  - Renders center text through `wx.html.HtmlWindow` so glossary terms can be clickable.
  - Moves notes into a fixed bottom band in the central panel.
  - Dedicates the right pane to keyword definitions and secondary artifacts.
  - Updates the right definition module when a linked center term is clicked.
  - Reduces redraw churn by refreshing only the active surface and using `Freeze()`/`Thaw()`.

### Demo feeder

- `aaaat.demo_seed`
  - Seeds deterministic Smart View demo candidatures.
  - Adds long literal offer text into `raw_intake` for each demo candidature.
  - Keeps records idempotent; repeated runs update existing demo candidatures and replace prior demo raw intake.

- `scripts/seed_desktop_demo.py`
  - Thin wrapper around `aaaat.demo_seed`.

### Launch surfaces

- `aaaat-desktop`.
- `aaaat-seed-desktop-demo`.
- `launchers/Open AAAAT Desktop.cmd`.
- `launchers/open-aaaat-desktop.sh`.

### Tests

- `tests/test_local_desktop_dashboard_slice.py`
  - Projection contract.
  - Raw source text projection.
  - Smart View primary-note model.
  - Detailed View rows/columns model.
  - Read-only permission projection.
  - Toolkit-neutral projection import behavior.
  - Layout state persistence.
  - Smart View right-context size guard.
  - Desktop adapter import without wx.
  - Optional desktop package metadata.
  - Source-level guard for staged-card behavior, source reader, notes band, clickable keyword links, right-context definition refresh, and removal of the old right-notes module.
  - Demo feeder creation, long raw source text, and idempotency.
  - Agent runtime boundary.

## Not implemented yet

- Full Detailed View wx table/grid.
- Full User View wx workspace.
- Full Welcome View onboarding surface.
- Real new-candidature/profile/settings desktop dialogs.
- Desktop packaging beyond launcher scripts.
- Browser dashboard removal or deprecation.

## Manual verification required

Run:

```bash
python -m pip install -e .[desktop]
aaaat-seed-desktop-demo --reset --count 64
aaaat-desktop
```

Verify:

```text
overview cards distribute horizontally and wrap
first click expands a card in place
second click opens focus mode
focus center is visibly the dominant workspace
right context is narrow and secondary
call cockpit is readable at a glance
source excerpt is visible as factual memory cue
expanding Source opens a full-width source reader
long literal offer text remains readable when expanded
notes are fixed at the bottom of the center panel
notes occupy roughly the bottom band, not the right pane
technical terms in center text are clickable
clicking a center term updates the right keyword definition
right pane is useful as a definition surface
search includes source/recognition text
panes are resizable
Reset restores narrow-right and bottom-notes proportions
layout state persists after restart
agent runtime remains unchanged
```

## Review decision

Do not classify as `PRODUCT_READY_TO_REVIEW` until this manual verification passes.

Use:

```text
READY_FOR_SPRINT_CLOSE_MANUAL_VERIFICATION
```

If this verification fails, classify as:

```text
BLOCKED_BY_UX_REGRESSION
```

If this verification passes, close this Smart View sprint and start the next implementation slice with Detailed View table/grid.
