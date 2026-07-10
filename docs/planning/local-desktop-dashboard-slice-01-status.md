# Local Desktop Dashboard Slice Status

Branch: `didacll/local-desktop-dashboard`
PR: `#37`

## Classification

```text
SMART_VIEW_APPROVED
DETAILED_VIEW_FOUNDATION_ADDED
DETAILED_VIEW_COLUMNS_ADDED
DETAILED_VIEW_LIMITED_EDITING_INCOMPLETE
DETAILED_VIEW_FULL_EDITOR_REQUIRED_BEFORE_SLICE_CLOSE
```

Smart View remains the approved local desktop call cockpit. Detailed View foundation and column controls are in the right direction, but the slice is not closable while the selected-candidature right panel only edits a small subset of fields.

Correct product rule:

```text
Smart View = recruiter-call cockpit / panic-mode summary
Detailed View = complete candidature inspection and editing surface
```

## Approved Smart View UX contract

Smart View remains unchanged:

```text
overview cards distribute horizontally and wrap
first click expands a card in place
second click on the expanded card opens Smart View focus mode
focus mode keeps narrow left navigation, dominant center workspace, and narrow right keyword pane
center content remains card-based
center card expansion state remains explicit and independent
collapsing all center cards leaves all collapsed
Source remains a center card with full-width source reader when expanded
notes remain fixed in the bottom center band
keyword links inside center text update the right definition pane
```

## Detailed View behavior so far

Detailed View is the batch review and full editing surface, not the recruiter-call cockpit.

Implemented and visually accepted foundation:

```text
open Detailed View from the desktop frame
show projected candidature rows
filter visible rows from the projected search query
select a row
show selected structured detail
open selected candidature back in Smart View
```

Implemented refinement:

```text
hide/show columns through a small Columns dialog
rebuild wx table from selected visible columns
persist visible column choices through existing DashboardLayoutState.detailed_columns
limited editable selected-candidature fields in the right panel
clear editable/read-only separation
explicit Save and Cancel/Revert
save through DesktopCommandService.update_candidature_fields
projection refresh after save with selected candidature kept stable
Open in Smart View continues to open the selected candidature after edits
```

The current editable subset is useful but insufficient for closing the Detailed View slice.

## Required before slice closure

The selected-candidature right panel must become a full grouped candidature editor.

Required rule:

```text
show every meaningful projected field for the selected candidature
make every safely writable field editable
keep only internal, provenance, timestamp, immutable source, and unsupported fields read-only
show read-only fields intentionally instead of omitting them
```

Suggested groups:

```text
Identity
Logistics
Workflow
Notes and call prep
Research and context
Artifacts and generated material
Offer and compensation
Raw/source
```

All writes must still go through `DesktopCommandService` or similarly tiny explicit local desktop command methods. Widgets must not write directly through broad DB calls.

## Current wx adapter structure

```text
aaaat/ui_desktop/app.py
  desktop launcher and toolkit-isolated projection build

aaaat/ui_desktop/main_window.py
  top-level frame/menu/toolbar/view switching/layout shell

aaaat/ui_desktop/smart_view.py
  Smart View orchestration and shared desktop refresh routing

aaaat/ui_desktop/overview_board.py
  Smart overview cards and staged overview interaction

aaaat/ui_desktop/center_cards.py
  Smart center cards

aaaat/ui_desktop/card_state.py
  explicit toolkit-neutral center-card state

aaaat/ui_desktop/keyword_pane.py
  Smart right keyword pane

aaaat/ui_desktop/notes_band.py
  fixed bottom-center notes editor

aaaat/ui_desktop/wx_html_links.py
  kw: glossary links in wx HTML

aaaat/ui_desktop/services.py
  DesktopCommandService.save_note and update_candidature_fields

aaaat/ui_desktop/detailed_view.py
  Detailed View orchestration, column controls, save/cancel handoff

aaaat/ui_desktop/detail_table.py
  projected candidature row table and visible-column rendering

aaaat/ui_desktop/detail_panel.py
  selected-row structured detail panel; must become full grouped editor

aaaat/ui_desktop/detail_columns.py
  toolkit-neutral visible-column helpers
```

## Projection/runtime contract

The projection boundary remains unchanged. `dashboard_projection.py`, `dashboard_layout.py`, `dashboard_modules.py`, domain code, browser/dashboard runtime, MCP descriptors, and agent runtime contracts remain toolkit-neutral.

No wx, HTML dashboard route, MCP resource, external machine-facing route, broad CRUD API, plugin framework, heavy dependency, or mutation-authority expansion should be added.

## Tests required for closure

Coverage must include:

```text
projection contract and toolkit-neutral imports
Smart View primary-note/source/keyword/card-state guards
Detailed View projection rows/selected row
Detailed View desktop projection builder import without wx
Detail column helper behavior without wx
column hide/show source guards
right-panel full grouped editor guards
meaningful projected fields are not silently omitted
writable fields save through DesktopCommandService or tiny explicit local commands
read-only fields remain visible and are not passed to storage updates
Cancel/Revert restores projected values without saving
main_window.py shell-size and no-table/no-persistence/no-edit-logic guards
wx import isolation
runtime boundary guard
full unittest discovery in CI
```

## Not implemented yet

```text
Detailed View full grouped candidature editor
Detailed View complete meaningful field visibility
Detailed View editing for every safely writable field
Detailed View richer field validation/pickers
Detailed View drag column reordering
Full User View wx workspace
Full Welcome View onboarding surface
real new-candidature/profile/settings desktop dialogs
desktop packaging beyond launcher scripts
browser dashboard removal or deprecation
```

## Manual verification command

```bash
python -m pip install -e .[desktop]
aaaat-seed-desktop-demo --reset --count 64
aaaat-desktop
```

Check:

```text
List opens the approved Smart overview
Detailed opens the batch review surface
Detailed shows candidature rows
Columns opens hide/show controls
visible column choices rebuild the table and persist
selecting a row shows a grouped full candidature record in the right panel
all meaningful fields are visible
all safely writable fields are editable
read-only fields are intentionally visible and read-only
Save applies edits across groups and keeps selection stable
Cancel/Revert restores projected values without saving
Open in Smart View opens the selected candidature after edits
Smart overview/focus/card/notes/keyword behavior remains unchanged
```
