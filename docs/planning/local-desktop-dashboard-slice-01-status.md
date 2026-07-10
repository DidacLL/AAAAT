# Local Desktop Dashboard Slice Status

Branch: `didacll/local-desktop-dashboard`
PR: `#37`

## Classification

```text
SMART_VIEW_APPROVED
DETAILED_VIEW_FOUNDATION_ADDED
DETAILED_VIEW_FOUNDATION_VISUALLY_ACCEPTED_WITH_FOLLOWUPS
DETAILED_VIEW_COLUMNS_AND_EDITING_ADDED
READY_FOR_DETAILED_VIEW_EDITING_MANUAL_VERIFICATION
```

Smart View remains the approved local desktop call cockpit. The Detailed View foundation has been visually accepted as the structured batch inspection/review surface, and the focused follow-up for column controls and right-panel editing has been implemented.

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

## Detailed View behavior

Detailed View is the batch review surface, not the recruiter-call cockpit.

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
editable selected-candidature fields in the right panel
clear editable/read-only separation
explicit Save and Cancel/Revert
save through DesktopCommandService.update_candidature_fields
projection refresh after save with selected candidature kept stable
Open in Smart View continues to open the selected candidature after edits
```

Editable fields:

```text
company
role
status
priority
location
remote_mode
source
source_url
next_action
notes
```

Unsupported/source-derived projected fields remain read-only.

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
  editable selected-row structured detail panel

aaaat/ui_desktop/detail_columns.py
  toolkit-neutral visible-column helpers
```

## Projection/runtime contract

The projection boundary remains unchanged. `dashboard_projection.py`, `dashboard_layout.py`, `dashboard_modules.py`, domain code, browser/dashboard runtime, MCP descriptors, and agent runtime contracts remain toolkit-neutral.

No wx, HTML dashboard route, MCP resource, external machine-facing route, broad CRUD API, plugin framework, heavy dependency, or mutation-authority expansion was added.

## Tests

Coverage includes:

```text
projection contract and toolkit-neutral imports
Smart View primary-note/source/keyword/card-state guards
Detailed View projection rows/selected row
Detailed View desktop projection builder import without wx
Detail column helper behavior without wx
DesktopCommandService supported-field updates
Detailed View open-from-frame source guard
DetailTable / DetailPanel extraction guards
column hide/show source guards
right-panel editable-field save/cancel source guards
main_window.py shell-size and no-table/no-persistence/no-edit-logic guards
wx import isolation
runtime boundary guard
full unittest discovery in CI
```

## Not implemented yet

```text
Detailed View drag column reordering
Detailed View richer field validation/pickers
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
visible column choices rebuild the table
selecting a row updates editable fields in the right panel
Save applies supported field edits and keeps selection stable
Cancel/Revert restores projected values without saving
Open in Smart View opens the selected candidature after edits
Smart overview/focus/card/notes/keyword behavior remains unchanged
```
