# Local Desktop Dashboard Detailed View Foundation

Branch: `didacll/local-desktop-dashboard`

## Status

```text
DETAILED_VIEW_FOUNDATION_ADDED
DETAILED_VIEW_FOUNDATION_VISUALLY_ACCEPTED_WITH_FOLLOWUPS
SMART_VIEW_APPROVED_UNCHANGED
```

This slice adds the first wx Detailed View surface for structured candidature review. It does not redesign Smart View, does not implement broad CRUD, does not change the projection/runtime boundary, and does not touch agent mutation authority.

Local visual verification result:

```text
Good job. This is what is expected.
```

The foundation is accepted, with two follow-up requirements for the next slice:

```text
1. Detailed View needs an easier way to control columns: hide/show columns is preferred if simpler than moving/reordering columns.
2. The selected candidature shown in the right panel should be easy to edit for supported fields.
```

## Scope

Detailed View is the batch inspection/review surface. Smart View remains the recruiter-call cockpit.

The foundation provides:

```text
open Detailed View from the desktop frame
show projected candidature rows
select a row
show selected structured detail
open the selected candidature back in Smart View
filter visible rows locally from the projected search query
```

The toolbox actions shown in the selected detail panel are review affordances only in this foundation slice. They do not perform desktop mutations.

## Files added

```text
aaaat/ui_desktop/detailed_view.py
```

Owns Detailed View orchestration: panel construction, search events, row selection, refresh, and return-to-Smart handoff.

```text
aaaat/ui_desktop/detail_table.py
```

Owns the projected candidature row table using `wx.ListCtrl`.

```text
aaaat/ui_desktop/detail_panel.py
```

Owns the selected-row structured review panel.

```text
tests/test_local_desktop_detailed_view_slice.py
```

Freezes the Detailed View foundation behavior and architecture boundaries.

## Files updated

```text
aaaat/ui_desktop/main_window.py
```

Still remains the top-level shell: frame, menu, toolbar, view-surface construction, and layout containers only. It wires the new Detailed surface but does not contain row-table or selected-detail behavior.

```text
aaaat/ui_desktop/smart_view.py
```

Routes shared desktop refresh and view switching between Smart and Detailed surfaces. Smart View card, notes, keyword, and overview behavior remains in the existing extracted Smart adapter modules.

## Preserved boundaries

`dashboard_projection.py`, domain services, browser/dashboard runtime, MCP descriptors, and agent runtime contracts are unchanged. wx imports remain isolated to `aaaat/ui_desktop` UI adapter modules.

No new UI toolkit, plugin framework, heavy dependency, broad CRUD API, agent route, MCP resource, or agent mutation authority was added.

## Accepted foundation behavior

```text
Detailed opens the batch review surface
Detailed shows candidature rows
selecting a row updates the selected detail panel
Open in Smart View opens the selected candidature in Smart focus
Smart overview/focus/card/notes/keyword behavior is unchanged
```

## Follow-up slice

The next slice is planned in:

```text
docs/planning/local-desktop-dashboard-slice-03-detailed-view-editing-columns-plan.md
```

Target:

```text
READY_FOR_DETAILED_VIEW_EDITING_MANUAL_VERIFICATION
```

The next slice should add:

```text
- hide/show columns, preferred over drag column movement if simpler and more stable
- editable selected-candidature fields in the right detail panel
- explicit save/cancel behavior
- local UI mutation through DesktopCommandService or an equivalent tiny desktop command boundary
```

## Manual check

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
Smart overview/focus/card/notes/keyword behavior is unchanged
```
