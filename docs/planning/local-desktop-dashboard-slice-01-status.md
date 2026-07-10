# Local Desktop Dashboard Slice 01 Status

Branch: `didacll/local-desktop-dashboard`
PR: `#37`

## Classification

```text
READY_FOR_FIFTH_MANUAL_WX_SMART_VIEW_VERIFICATION
```

The current Smart View direction is a local desktop call cockpit, not a CRUD dashboard. Recent verification exposed three further UX constraints:

```text
central panel must dominate the focus view
right panel must stay narrow and secondary
literal offer/source text is first-class factual context, not a normal short module
```

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

Focus mode now prioritizes the center:

```text
left: narrow candidature navigation strip
center: dominant call cockpit and source reader
right: narrow secondary context
```

The right panel default is intentionally small. Previously saved large right-panel widths are clamped during this development slice.

### Literal offer/source text

A candidature may include a long literal offer text. That text is factual source material and often the strongest visual memory from the application process.

Smart View therefore exposes it as a center reader:

```text
Source · compact excerpt
expanded: full-width read-only text area with the literal source text
```

This avoids pushing long source text into small right-column modules or two-column cards where it becomes unreadable.

### Center content structure

The center no longer uses the odd two-column collapsible grid for the main modules. It uses:

```text
hero: company / role / chips
call cockpit: Recognize / Pitch / Ask / Watch
source reader: literal offer text
secondary center modules: Now / Later / Offer
```

This keeps the central content readable and avoids row-level collapse behavior where one element affects a whole visual line.

### Right context is secondary

The right column contains compact secondary modules only:

```text
Notes
Keywords
Artifacts
```

Notes are editable, but they must not dominate the workspace.

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
  - Removes the center two-column collapsible module grid.
  - Adds a dominant center call cockpit.
  - Adds a full-width read-only source reader for long literal offer/source text.
  - Keeps notes, keywords, and artifacts in the right secondary context.
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
  - Source-level guard for staged-card behavior, source reader, and removal of the center grid.
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
center no longer feels like a strange two-column collapse grid
call cockpit is readable at a glance
source excerpt is visible as factual memory cue
expanding Source opens a full-width read-only source reader
long literal offer text remains readable when expanded
notes stay in the right column and do not dominate
search includes source/recognition text
panes are resizable
Reset restores narrow-right proportions
layout state persists after restart
agent runtime remains unchanged
```

## Review decision

Do not classify as `PRODUCT_READY_TO_REVIEW` yet.

Use:

```text
READY_FOR_FIFTH_MANUAL_WX_SMART_VIEW_VERIFICATION
```

If this verification fails, classify as:

```text
BLOCKED_BY_UX_REGRESSION
```

If this verification passes, the next implementation slice should be Detailed View table/grid.
