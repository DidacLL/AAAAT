# Local Desktop Dashboard Slice 03 Detailed View Editing and Column Controls Plan

Branch: `didacll/local-desktop-dashboard`

Depends on:

```text
SMART_VIEW_APPROVED
DETAILED_VIEW_FOUNDATION_VISUALLY_ACCEPTED
```

## Objective

Refine the wx Detailed View after local visual verification.

The foundation is accepted: Detailed View opens, rows are useful, row selection updates the right panel, and Open in Smart View works. The missing review items are:

```text
1. The table needs a way to hide/show columns, or move columns if that is easier.
2. The selected candidature shown in the right panel should be easy to edit.
```

Prefer hide/show columns over drag-reordering if that is simpler and more stable in wx. Column reordering may be added only if it stays small and reliable.

## Classification target

```text
READY_FOR_DETAILED_VIEW_EDITING_MANUAL_VERIFICATION
```

If Smart View regresses or the desktop/runtime boundary is crossed, classify as:

```text
BLOCKED_BY_DESKTOP_BOUNDARY_REGRESSION
```

## Non-goals

- Do not redesign Smart View.
- Do not change approved Smart View behavior.
- Do not merge to `main` during the slice.
- Do not add a new UI toolkit.
- Do not add a plugin framework.
- Do not create a broad dashboard CRUD API.
- Do not expose desktop projection/layout state as an external machine API.
- Do not change agent mutation authority.
- Do not add heavy dependencies.
- Do not turn Detailed View into a speculative admin framework.

## Column controls

Implement the simpler option first:

```text
Detailed View column hide/show controls
```

Recommended behavior:

```text
- Default columns remain useful on first launch.
- User can hide/show supported columns from the Detailed View toolbar or a small local menu/dialog.
- Visible column choices persist locally if an existing layout/state mechanism can store them cleanly.
- If persistence is not already clean, keep the choice session-local and document that persistence remains a later enhancement.
- Rebuild the wx table from the selected visible columns rather than adding complex column mutation behavior.
```

Column movement/reordering is optional. Do not implement it if wx support requires fragile platform-specific code.

## Editable selected detail panel

Make the right/detail panel an editable local form for the selected candidature.

Recommended behavior:

```text
- Selecting a row loads editable fields into the right panel.
- The panel clearly separates editable fields from read-only/source-derived context.
- User can save changes explicitly.
- Save refreshes the projection and keeps selection stable when possible.
- Cancel/Revert returns the panel to the projected values.
- Open in Smart View still opens the selected candidature.
```

The editable set should cover the values currently shown in the selected candidature detail panel where the existing data model supports updates. Prefer practical coverage over a generic schema editor.

Candidate editable fields:

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
notes / primary note if already supported by the local notes command path
```

Do not silently invent storage for unsupported fields. If a field is projected but not safely writable yet, render it read-only and mark it as a later enhancement.

## Mutation boundary

All writes must go through a tiny local desktop command service.

Extend `aaaat/ui_desktop/services.py` if needed:

```text
DesktopCommandService.save_note(candidature_ref, body)
DesktopCommandService.update_candidature_fields(candidature_ref, changes)
```

This is local UI plumbing only. It is not an agent API and not a broad dashboard CRUD surface.

Widgets must not call broad DB write functions directly.

## Suggested file ownership

```text
aaaat/ui_desktop/detailed_view.py
- orchestrates table, column controls, detail panel, refresh, selection stability

aaaat/ui_desktop/detail_table.py
- owns visible-column model and row rendering
- exposes selected candidature ref

aaaat/ui_desktop/detail_panel.py
- owns editable selected-candidature form
- emits save/cancel/open-in-smart callbacks

aaaat/ui_desktop/services.py
- owns local update command boundary

aaaat/ui_desktop/main_window.py
- remains shell-only
```

Add a tiny `detail_columns.py` or `detail_editing.py` only if it keeps the code smaller. Do not create a framework.

## Tests to add or extend

```text
- DetailTable supports visible column selection without wx where possible, or with source-level guards if wx is unavailable.
- Column hide/show controls are present in Detailed View source.
- main_window.py remains shell-only and does not absorb column/edit logic.
- DetailPanel exposes editable fields and explicit save/cancel behavior.
- DetailPanel writes through DesktopCommandService, not direct DB calls.
- DesktopCommandService has a small update_candidature_fields command.
- Saving selected candidature changes refreshes projection or calls the refresh path.
- Smart View guards still pass.
- card_state_patch.py remains absent.
- wx imports remain isolated to ui_desktop.
- runtime boundary tests still pass.
```

Avoid tests for exact pixel widths, exact column order after local interaction, or wx platform-specific drag behavior.

## Acceptance criteria

```text
- Smart View manual behavior remains unchanged.
- Detailed View still opens and shows projected candidature rows.
- User can hide/show Detailed View columns, or a simpler stable equivalent is implemented.
- Selected candidature detail panel is editable for supported fields.
- Edits save through DesktopCommandService or an equivalent tiny local desktop command boundary.
- Widgets do not write directly through broad DB calls.
- Selection remains stable after save where practical.
- Open in Smart View still works after edits.
- main_window.py remains shell-only.
- projection/domain/runtime remain toolkit-neutral.
- no broad CRUD API or agent mutation authority is introduced.
- no merge to main occurs during the slice.
```

## Manual verification checklist

Run:

```bash
python -m pip install -e .[desktop]
aaaat-seed-desktop-demo --reset --count 64
aaaat-desktop
```

Verify:

```text
1. Smart View still behaves as approved.
2. Detailed View opens from the toolbar.
3. Rows remain readable and useful.
4. Column hide/show works and does not break selection.
5. Selecting a row loads editable values in the right panel.
6. Editing supported fields and saving updates the selected candidature.
7. Cancel/Revert restores projected values before save.
8. Saved edits remain visible after refresh/reselect.
9. Open in Smart View opens the edited candidature.
10. No new external mutation surface is introduced.
```
