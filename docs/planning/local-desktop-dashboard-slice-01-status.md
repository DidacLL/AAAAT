# Local Desktop Dashboard Slice 01 Status

Branch: `didacll/local-desktop-dashboard`
PR: `#37`

## Classification

```text
READY_FOR_THIRD_MANUAL_WX_SMART_VIEW_VERIFICATION
```

The first wx Smart View attempt was rejected as `BLOCKED_BY_UX_REGRESSION`: it looked more professional than the browser version, but still behaved like a conventional three-column admin screen. The Smart View requirement is not a CRUD dashboard. It is a panic-mode call cockpit.

This revision refactors the Smart View around the corrected UX contract below and adds a demo feeder for realistic high-volume local testing.

## Corrected Smart View UX contract

### Recognition before administration

The no-selection state must be an overview board. Candidatures are shown as readable cards that make recognition fast:

```text
company
role
status / priority / keywords
short identifying signal
```

This overview uses most of the available space until a candidature is selected. Because desktop apps are mostly horizontal, the overview must distribute cards horizontally and wrap them across the available width instead of stacking every candidature vertically into a thin long column.

### Focus after selection

After selection, the UI changes shape:

```text
left: narrow candidature navigation strip
center: selected candidature call context
right: small secondary context column
```

The left strip remains usable for fast switching. Expanding it returns to the overview board.

### Space economy

Smart View must avoid field-name-heavy administrative presentation. It should expose concise call-useful content first:

```text
Pitch
Ask
Watch
Now
Later
Offer
```

Long content is clipped in summaries and available by expanding the module.

### Interaction economy

A candidature card is the click target. The user should not need to move to a small button at the end of a row/card to open it during a call.

### Resizing and expansion

- Panels are resizable through splitters.
- Modules are collapsible/expandable.
- Collapsed modules show a compact title/summary.
- The right context column is deliberately smaller than the center.
- A reset-layout action restores the default proportions.

### Right context is secondary

The right column is not the main workspace. It contains compact secondary modules:

```text
Notes
Keywords
Artifacts
```

Notes are editable, but not allowed to consume the main workspace by default.

## Implemented in the corrected revision

### Toolkit-neutral foundation

- `aaaat/dashboard_projection.py`
  - Builds human-local projection sections for `welcome`, `smart`, `detailed`, `user`, `glossary`, `permissions`, and `view_state`.
  - Exposes Smart View selected-candidature detail, primary note, right context modules, keyword context, artifacts, call card, company research, form answers, and agent suggestions.
  - Exposes `call_signals` in Smart View candidature summaries so overview cards can show call-recognition cues.
  - Exposes Detailed View rows, available columns, visible columns, column order, selected row, toolbox actions, and task queue summary.
  - Does not import wxPython.
  - Is not exposed as an agent API.

- `aaaat/dashboard_modules.py`
  - Defines stable module declarations for Smart, Detailed, User, and Welcome surfaces.
  - Validates module ids, supported views, default regions, visibility, and minimum useful sizes.

- `aaaat/dashboard_layout.py`
  - Persists selected view, selected candidature reference, selected keyword, pane sizes, visible modules, and Detailed View columns.
  - Stores layout/selection only, not private professional values or note bodies.
  - Defaults Smart View to a narrow focus nav and smaller right context.

### wx desktop Smart View adapter

- `aaaat/ui_desktop/app.py`
  - Provides `aaaat-desktop` entry point and `python -m aaaat.ui_desktop.app` support.
  - Imports wxPython only at launch time.
  - Builds projection before creating the desktop frame.

- `aaaat/ui_desktop/main_window.py`
  - Implements overview mode with large horizontal wrapping candidature cards.
  - Makes the whole card clickable; no small far-right open button is required.
  - Implements focus mode with a narrow left navigation strip, large center context, and smaller right context.
  - Supports candidature selection.
  - Supports search/filter in both overview and focus navigation.
  - Uses compact call-context modules instead of field-name-heavy record display.
  - Uses collapsible/expandable modules for center and right content.
  - Provides one primary note editor in the secondary right context.
  - Saves primary note changes in full local mode.
  - Disables note editing in read-only mode.
  - Supports keyword selection and definition display.
  - Persists selected view, selected candidature, selected keyword, and pane sizes on close.
  - Provides a reset-layout action.
  - Provides File menu support-surface entries for new candidature and profile/settings as reachable placeholders, without occupying Smart View.

### Demo feeder

- `scripts/seed_desktop_demo.py`
  - Seeds deterministic Smart View demo candidatures.
  - Defaults to 48 candidatures.
  - Mostly fills all key fields, with occasional intentionally missing fields to test imperfect real data.
  - Uses stable demo ids and upserts records, so it can be run repeatedly.

### Launch surfaces

- `aaaat-desktop` script entry point.
- `launchers/Open AAAAT Desktop.cmd`.
- `launchers/open-aaaat-desktop.sh`.

### Tests

- `tests/test_local_desktop_dashboard_slice.py`
  - Projection contract.
  - Smart View primary-note model.
  - Detailed View rows/columns model.
  - Read-only permission projection.
  - Toolkit-neutral projection import behavior.
  - Layout state round-trip and file persistence.
  - Smart View default proportion guard.
  - Module registry validation.
  - Desktop adapter import without wx.
  - Optional desktop package metadata.
  - Source-level guard for overview/focus/collapsible/reset behavior.
  - Agent runtime boundary.

## Not implemented yet

- Full Detailed View wx table/grid.
- Full User View wx workspace.
- Full Welcome View onboarding surface.
- Real new-candidature/profile/settings desktop dialogs.
- Desktop packaging beyond launcher scripts.
- Browser dashboard removal or deprecation.

## Manual verification required

Run after installing the desktop extra:

```bash
python -m pip install -e .[desktop]
python scripts/seed_desktop_demo.py --count 64
aaaat-desktop
```

Verify:

```text
app opens into an overview board, not a tiny list
candidature cards distribute horizontally and wrap across available width
cards are readable without being a thin vertical list
whole card is clickable and enters focus mode
company, role, keywords, and call signal are visually easy to scan
selecting a card enters focus mode
focus mode collapses the candidature list into a narrow left strip
Expand/List returns to the overview board
center area gets most visual space
right context is smaller and secondary
center modules are collapsible/expandable
right modules are collapsible/expandable
long content appears as compact summaries before expansion
primary note editing works in full mode
read-only launch disables note editing
search/filter works in overview and focus navigation
panes are resizable
Reset restores layout proportions
layout state persists after restart
agent runtime remains unchanged
```

## Review decision

Do not classify as `PRODUCT_READY_TO_REVIEW` yet.

Use:

```text
READY_FOR_THIRD_MANUAL_WX_SMART_VIEW_VERIFICATION
```

If this verification fails, classify as:

```text
BLOCKED_BY_UX_REGRESSION
```

If this verification passes, the next implementation slice should be Detailed View table/grid.
