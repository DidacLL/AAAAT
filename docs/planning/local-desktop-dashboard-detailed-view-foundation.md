# Local Desktop Dashboard Detailed View Foundation

Branch: `didacll/local-desktop-dashboard`

## Status

```text
DETAILED_VIEW_FOUNDATION_ADDED
DETAILED_VIEW_FOUNDATION_VISUALLY_ACCEPTED_WITH_FOLLOWUPS
DETAILED_VIEW_COLUMNS_AND_EDITING_ADDED
SMART_VIEW_APPROVED_UNCHANGED
READY_FOR_DETAILED_VIEW_EDITING_MANUAL_VERIFICATION
```

This document records the accepted Detailed View foundation and the follow-up refinement that added practical column controls and supported-field editing. These slices do not redesign Smart View, do not implement broad CRUD, do not change the projection/runtime boundary, and do not touch agent mutation authority.

## Scope

Detailed View is the batch inspection/review surface. Smart View remains the recruiter-call cockpit.

The current Detailed View provides:

```text
open Detailed View from the desktop frame
show projected candidature rows
select a row
show selected structured detail
open the selected candidature back in Smart View
filter visible rows from the projected search query
hide/show columns through a small Columns dialog
persist visible column choices through existing DashboardLayoutState.detailed_columns
edit supported selected-candidature fields in the right panel
explicit Save and Cancel/Revert
refresh projection after save while keeping selected candidature stable
```

The toolbox actions shown in the selected detail panel remain review affordances. They do not perform desktop mutations.

## Editable fields

Supported editable fields:

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

Read-only/source-derived context remains read-only. Unsupported projected fields are not silently given new storage.

## Local command boundary

All writes go through:

```text
aaaat/ui_desktop/services.py
DesktopCommandService.save_note(candidature_ref, body)
DesktopCommandService.update_candidature_fields(candidature_ref, changes)
```

This is local desktop UI plumbing only. It is not an agent API and not a broad dashboard CRUD surface.

## File ownership

```text
aaaat/ui_desktop/detailed_view.py
```

Owns Detailed View orchestration: panel construction, search events, row selection, column controls, refresh, save/cancel handoff, and return-to-Smart handoff.

```text
aaaat/ui_desktop/detail_table.py
```

Owns the projected candidature row table using `wx.ListCtrl`, selected ref exposure, visible column rendering, and stable table rebuilds.

```text
aaaat/ui_desktop/detail_panel.py
```

Owns the editable selected-row review panel, explicit Save and Cancel/Revert controls, read-only context, and Open in Smart View action.

```text
aaaat/ui_desktop/detail_columns.py
```

Owns toolkit-neutral visible-column normalization helpers.

```text
aaaat/ui_desktop/main_window.py
```

Remains the top-level shell: frame, menu, toolbar, view-surface construction, and layout containers only. It does not contain row-table, column-dialog, or selected-detail editing logic.

## Preserved boundaries

`dashboard_projection.py`, domain services, browser/dashboard runtime, MCP descriptors, and agent runtime contracts are unchanged. wx imports remain isolated to `aaaat/ui_desktop` UI adapter modules.

No new UI toolkit, plugin framework, heavy dependency, broad CRUD API, agent route, MCP resource, or agent mutation authority was added.

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
Columns opens hide/show controls
visible column choices rebuild the table and persist through existing layout state
selecting a row updates editable fields in the right panel
Save applies supported field edits and keeps the selected candidature stable
Cancel/Revert restores projected values without saving
Open in Smart View opens the selected candidature after edits
Smart overview/focus/card/notes/keyword behavior is unchanged
```
