# Local Desktop Dashboard Slice 03 Detailed View Full Editor and Column Controls Plan

Branch: `didacll/local-desktop-dashboard`

## Corrected closure rule

Detailed View is not just a selected-row summary. It is the complete candidature inspection and editing surface.

The slice is not closable while the right panel only edits a small allowlist of fields and omits other meaningful candidature fields.

Correct rule:

```text
Smart View = recruiter-call cockpit / panic-mode summary
Detailed View = complete candidature inspection and editing surface
```

Detailed View must show every meaningful projected field for the selected candidature, grouped clearly. Every safely writable field must be editable. Only internal IDs, timestamps, provenance, immutable raw intake, generated/derived values without a storage target, and unsafe/unsupported fields should remain read-only.

## Current state

Implemented and accepted as direction:

```text
Detailed View opens
projected rows are useful
row selection updates the right panel
Open in Smart View works
column hide/show exists
visible columns persist through DashboardLayoutState.detailed_columns
limited right-panel editing exists for an initial field set
```

But the current right panel is incomplete for closing the Detailed View slice because it does not yet act as the full candidature editor.

## Classification

Current:

```text
DETAILED_VIEW_LIMITED_EDITING_INCOMPLETE
DETAILED_VIEW_FULL_EDITOR_REQUIRED_BEFORE_SLICE_CLOSE
```

Target:

```text
READY_FOR_DETAILED_VIEW_FULL_EDITOR_MANUAL_VERIFICATION
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

## Required right-panel behavior

The selected candidature panel must become a grouped full record editor.

Recommended groups:

```text
Identity
- company
- role
- status
- priority

Logistics
- location
- remote_mode
- source
- source_url

Workflow
- next_action
- deadlines/dates if present
- review/application state if present

Notes and call prep
- notes
- call signals
- pitch
- risks to avoid
- smart question
- prepare first
- prepare later

Research and context
- company research
- technical reading
- keywords
- glossary-linked terms

Artifacts and generated material
- generated artifacts
- cover letter drafts
- CV variants
- interview guides
- form answers

Offer and compensation
- offer snapshot
- compensation fields if present

Raw/source
- raw intake
- source excerpt
- source text
```

These groups may be adjusted to match the actual projection/data model, but the rule is: do not omit meaningful fields merely because they were not part of the first editable subset.

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

Read-only fields must still be visible where useful. They should not be silently omitted.

## Column controls

Column hide/show is already the preferred path and should remain.

Required behavior:

```text
- Default columns remain useful on first launch.
- User can hide/show supported columns from the Detailed View UI.
- Visible column choices persist through the existing layout state when available.
- Rebuild the wx table from selected visible columns.
- Do not add fragile drag-reordering unless it is small and reliable.
```

## Mutation boundary

All writes must go through local desktop command plumbing.

Expected service boundary:

```text
DesktopCommandService.save_note(candidature_ref, body)
DesktopCommandService.update_candidature_fields(candidature_ref, changes)
```

If more writable groups require more local commands, add tiny explicit commands to `DesktopCommandService`. Do not let widgets call broad DB write functions directly.

This remains local desktop UI plumbing only. It is not an agent API and not a broad external CRUD surface.

## Suggested file ownership

```text
aaaat/ui_desktop/detailed_view.py
- orchestrates table, column controls, full editor panel, refresh, selection stability

aaaat/ui_desktop/detail_table.py
- owns visible-column model and row rendering
- exposes selected candidature ref

aaaat/ui_desktop/detail_panel.py
- owns grouped full selected-candidature editor
- renders writable fields as controls and read-only fields as read-only context
- emits save/cancel/open-in-smart callbacks

aaaat/ui_desktop/detail_columns.py
- owns visible-column helpers

aaaat/ui_desktop/services.py
- owns local update command boundary

aaaat/ui_desktop/main_window.py
- remains shell-only
```

Add a tiny helper such as `detail_fields.py` only if it keeps field grouping/editability rules explicit and testable. Do not create a framework.

## Tests to add or extend

```text
- DetailPanel shows grouped sections for the complete selected candidature.
- DetailPanel does not silently omit meaningful projected fields.
- Writable projected fields are rendered/editable where storage supports them.
- Read-only fields remain visible and intentionally read-only.
- Save collects all changed writable fields through DesktopCommandService.
- Unsupported fields are not passed to storage updates.
- Cancel/Revert restores projected values without saving.
- Column hide/show behavior remains covered.
- main_window.py remains shell-only and does not absorb full-editor logic.
- DetailPanel does not import/use direct DB writes.
- Smart View guards still pass.
- card_state_patch.py remains absent.
- wx imports remain isolated to ui_desktop.
- runtime boundary tests still pass.
```

Avoid tests for exact pixel widths, exact visual styling, exact temporary fake data names, or wx platform-specific drag behavior.

## Acceptance criteria

```text
- Smart View manual behavior remains unchanged.
- Detailed View still opens and shows projected candidature rows.
- Column hide/show still works and persists through existing layout state.
- Selected candidature right panel shows the complete meaningful candidature record in grouped sections.
- All safely writable projected fields are editable.
- Read-only fields are intentionally visible and read-only, not omitted.
- Save persists all edited writable fields through DesktopCommandService or tiny explicit local commands.
- Widgets do not write directly through broad DB calls.
- Cancel/Revert restores projected values.
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
4. Column hide/show works and persists.
5. Selecting a row loads a grouped full candidature record in the right panel.
6. All meaningful fields are visible.
7. Writable fields are editable.
8. Read-only fields are visible and clearly not editable.
9. Editing several fields across groups and saving updates the candidature.
10. Cancel/Revert restores projected values before save.
11. Saved edits remain visible after refresh/reselect/restart where storage supports it.
12. Open in Smart View opens the edited candidature.
13. No new external mutation surface is introduced.
```
