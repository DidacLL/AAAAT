# Local Desktop Dashboard Detailed View Foundation

Branch: `didacll/local-desktop-dashboard`

## Status

```text
DETAILED_VIEW_FOUNDATION_ADDED
DETAILED_VIEW_FOUNDATION_VISUALLY_ACCEPTED_WITH_FOLLOWUPS
DETAILED_VIEW_COLUMNS_ADDED
DETAILED_VIEW_GROUPED_FULL_EDITOR_ADDED
SMART_VIEW_APPROVED_UNCHANGED
READY_FOR_DETAILED_VIEW_FULL_EDITOR_MANUAL_VERIFICATION
```

This document records the accepted Detailed View foundation, column controls, and the grouped full selected-candidature editor. Detailed View is the complete candidature inspection/editing surface. Smart View remains the recruiter-call cockpit / panic-mode summary.

## Current Detailed View behavior

```text
open Detailed View from the desktop frame
show projected candidature rows
select a row
show the complete meaningful projected selected-candidature record
open the selected candidature back in Smart View
filter visible rows from the projected search query
hide/show columns through a small Columns dialog
persist visible column choices through existing DashboardLayoutState.detailed_columns
edit all safely writable projected candidature fields
keep read-only/internal/source-derived fields visible and intentionally read-only
explicit Save and Cancel/Revert
refresh projection after save while keeping selected candidature stable
```

## Grouped full editor

The right panel groups the selected candidature into:

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

Writable fields are rendered as controls. Read-only fields are rendered visibly with a read-only label/reason.

Writable projected fields currently include:

```text
company
role
keywords
location
remote_mode
source
source_url
status
priority
next_action
notes
call_signals
pitch
smart_question
risks_to_avoid
prepare_first
prepare_later
company_research
form_answers
offer_snapshot
```

Read-only projected context remains visible, including:

```text
ref
created_at
updated_at
deadline
last_contact
task_queue
artifacts_state
artifacts_count
artifacts_items
source_excerpt
source_text
source_length
source_has_raw
```

## Local command boundary

All writes go through:

```text
aaaat/ui_desktop/services.py
DesktopCommandService.save_note(candidature_ref, body)
DesktopCommandService.update_candidature_fields(candidature_ref, changes)
```

The command service filters writes to supported local storage fields before calling the local DB update function. This is local desktop UI plumbing only. It is not an agent API and not a broad dashboard CRUD surface.

## File ownership

```text
aaaat/ui_desktop/detail_fields.py
```

Owns the toolkit-neutral grouped field map, editability rules, writable storage-key mapping, change collection, and projection coverage helpers.

```text
aaaat/ui_desktop/detail_panel.py
```

Owns the grouped full selected-candidature editor, explicit Save and Cancel/Revert controls, read-only context, and Open in Smart View action.

```text
aaaat/ui_desktop/detailed_view.py
```

Owns Detailed View orchestration: panel construction, search events, row selection, column controls, refresh, save/cancel handoff, and return-to-Smart handoff.

```text
aaaat/ui_desktop/detail_table.py
```

Owns the projected candidature row table using `wx.ListCtrl`, selected ref exposure, visible column rendering, and stable table rebuilds.

```text
aaaat/ui_desktop/detail_columns.py
```

Owns toolkit-neutral visible-column normalization helpers.

```text
aaaat/ui_desktop/main_window.py
```

Remains the top-level shell: frame, menu, toolbar, view-surface construction, and layout containers only. It does not contain row-table, column-dialog, or selected-detail editing logic.

## Preserved boundaries

`dashboard_projection.py`, domain services, browser/dashboard runtime, MCP descriptors, and agent runtime contracts remain toolkit-neutral. wx imports remain isolated to `aaaat/ui_desktop` UI adapter modules.

No new UI toolkit, plugin framework, heavy dependency, broad CRUD API, agent route, MCP resource, or agent mutation authority was added.

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
