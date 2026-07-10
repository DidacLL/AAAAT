# Local Desktop Dashboard Slice Status

Branch: `didacll/local-desktop-dashboard`
PR: `#37`

## Classification

```text
SMART_VIEW_APPROVED
DETAILED_VIEW_FOUNDATION_ADDED
READY_FOR_DETAILED_VIEW_MANUAL_VERIFICATION
```

Smart View remains the approved local desktop call cockpit. The Detailed View foundation has now been added as the structured batch inspection/review surface.

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

## Detailed View foundation

Detailed View is the batch review surface, not the recruiter-call cockpit.

Implemented:

```text
open Detailed View from the desktop frame
show projected candidature rows
filter visible rows from the projected search query
select a row
show selected structured detail
open selected candidature back in Smart View
```

The Detail panel shows projected toolbox actions as non-mutating review affordances only. This foundation slice does not add editing, broad CRUD, or agent-facing mutation authority.

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
  DesktopCommandService.save_note

aaaat/ui_desktop/detailed_view.py
  Detailed View orchestration

aaaat/ui_desktop/detail_table.py
  projected candidature row table

aaaat/ui_desktop/detail_panel.py
  selected-row structured detail panel
```

## Projection/runtime contract

The projection boundary remains unchanged. `dashboard_projection.py`, `dashboard_layout.py`, `dashboard_modules.py`, domain code, browser/dashboard runtime, MCP descriptors, and agent runtime contracts remain toolkit-neutral.

No wx, HTML dashboard route, MCP resource, external machine-facing route, broad CRUD API, plugin framework, heavy dependency, or agent mutation-authority expansion was added.

## Tests

Coverage includes:

```text
projection contract and toolkit-neutral imports
Smart View primary-note/source/keyword/card-state guards
Detailed View projection rows/selected row
Detailed View desktop projection builder import without wx
Detailed View open-from-frame source guard
DetailTable / DetailPanel extraction guards
main_window.py shell-size and no-table/no-persistence guards
wx import isolation
runtime boundary guard
full unittest discovery in CI
```

## Not implemented yet

```text
Detailed View editing
Detailed View column chooser/persistence UI
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
selecting a row updates the selected detail panel
Open in Smart View opens the selected candidature in Smart focus
Smart overview/focus/card/notes/keyword behavior remains unchanged
```
