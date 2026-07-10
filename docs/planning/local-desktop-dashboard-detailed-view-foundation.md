# Local Desktop Dashboard Detailed View Foundation

Branch: `didacll/local-desktop-dashboard`

## Status

```text
DETAILED_VIEW_FOUNDATION_ADDED
DETAILED_VIEW_FOUNDATION_VISUALLY_ACCEPTED_WITH_FOLLOWUPS
DETAILED_VIEW_COLUMNS_ADDED
DETAILED_VIEW_LIMITED_EDITING_INCOMPLETE
DETAILED_VIEW_FULL_EDITOR_REQUIRED_BEFORE_SLICE_CLOSE
SMART_VIEW_APPROVED_UNCHANGED
```

This document records the accepted Detailed View foundation and the follow-up refinement that added practical column controls and limited supported-field editing.

Important correction: Detailed View is the complete candidature inspection and editing surface. The slice is not complete while the right panel only edits a small subset of fields and omits other meaningful candidature data.

## Scope

```text
Smart View = recruiter-call cockpit / panic-mode summary
Detailed View = complete candidature inspection and editing surface
```

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
edit a limited set of selected-candidature fields in the right panel
explicit Save and Cancel/Revert
refresh projection after save while keeping selected candidature stable
```

This is directionally correct, but it is not enough to close the Detailed View slice.

## Required before closure

The right panel must become a grouped full candidature editor.

Required behavior:

```text
show every meaningful projected field for the selected candidature
group fields clearly
make every safely writable field editable
keep internal IDs, timestamps, provenance, immutable source, and unsupported fields read-only
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

## Current editable fields

Currently editable:

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

This list is no longer the closure target. It is only the first writable subset.

## Editability rule

Editable:

```text
user-maintained candidature fields
workflow/status/priority/next-action fields
URLs/source labels
notes
editable research/prep text where storage already exists
other projected fields that cleanly map to local storage
```

Read-only:

```text
internal refs/IDs
created_at/updated_at
provenance fields
derived summaries without a storage target
generated artifact metadata unless artifact-state editing already exists
immutable raw intake/source material if the app treats it as source evidence
unsupported fields that cannot be safely written yet
```

Read-only fields should still be visible where useful.

## Local command boundary

All writes go through:

```text
aaaat/ui_desktop/services.py
DesktopCommandService.save_note(candidature_ref, body)
DesktopCommandService.update_candidature_fields(candidature_ref, changes)
```

If more field groups require more local write methods, add tiny explicit methods to `DesktopCommandService`. This is local desktop UI plumbing only. It is not an agent API and not a broad dashboard CRUD surface.

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

Must own the grouped full selected-candidature editor, explicit Save and Cancel/Revert controls, read-only context, and Open in Smart View action.

```text
aaaat/ui_desktop/detail_columns.py
```

Owns toolkit-neutral visible-column normalization helpers.

```text
aaaat/ui_desktop/main_window.py
```

Remains the top-level shell: frame, menu, toolbar, view-surface construction, and layout containers only. It must not contain row-table, column-dialog, or selected-detail editing logic.

## Preserved boundaries

`dashboard_projection.py`, domain services, browser/dashboard runtime, MCP descriptors, and agent runtime contracts remain toolkit-neutral. wx imports remain isolated to `aaaat/ui_desktop` UI adapter modules.

No new UI toolkit, plugin framework, heavy dependency, broad CRUD API, agent route, MCP resource, or agent mutation authority should be added.

## Manual check for closure

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
selecting a row shows a grouped full candidature record in the right panel
all meaningful fields are visible
all safely writable fields are editable
read-only fields are intentionally visible and read-only
Save applies edits across groups and keeps selection stable
Cancel/Revert restores projected values without saving
Open in Smart View opens the selected candidature after edits
Smart overview/focus/card/notes/keyword behavior is unchanged
```
