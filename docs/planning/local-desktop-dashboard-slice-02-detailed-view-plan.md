# Local Desktop Dashboard Slice 02 Detailed View Plan

Branch: `didacll/local-desktop-dashboard`

Depends on:

```text
SMART_VIEW_APPROVED
READY_FOR_SECOND_SLICE_FOUNDATION
```

## Objective

Build the first wx Detailed View foundation after the Smart View adapter cleanup.

Detailed View is the structured review surface for candidatures. Smart View remains the approved recruiter-call cockpit.

## Classification target

```text
READY_FOR_DETAILED_VIEW_MANUAL_VERIFICATION
```

If the slice regresses Smart View or crosses the desktop/runtime boundary, classify as:

```text
BLOCKED_BY_DESKTOP_BOUNDARY_REGRESSION
```

## Non-goals

- Do not redesign Smart View.
- Do not change approved Smart View behavior.
- Do not merge to `main` during the slice.
- Do not add a new UI toolkit.
- Do not add a plugin framework.
- Do not create broad dashboard CRUD APIs.
- Do not expose desktop projection/layout state as an external machine API.
- Do not add heavy dependencies.
- Do not replace the projection boundary.

## Existing foundation to preserve

- `aaaat/dashboard_projection.py` remains the toolkit-neutral source for desktop sections.
- `aaaat/dashboard_modules.py` remains toolkit-neutral.
- `aaaat/dashboard_layout.py` remains local UI layout state only.
- `aaaat/ui_desktop/main_window.py` remains the frame/menu/toolbar/view-switching/top-level layout shell.
- Smart View remains implemented through extracted adapter modules.

## Detailed View role

Detailed View should help the user answer:

```text
Which candidatures need cleanup?
Which records are missing important fields?
Which applications need action?
Which statuses and priorities should be reviewed?
Which source/artifact/profile details are attached?
```

It should be useful for batch review and data inspection.

## Initial UX shape

Use a simple two-level layout:

```text
top: filter/search/status controls
main: candidature rows/table/list
side or bottom: selected candidature detail summary
```

Prefer standard wx widgets. Do not introduce a desktop UI framework.

## Suggested files

```text
aaaat/ui_desktop/detailed_view.py
aaaat/ui_desktop/detail_table.py
aaaat/ui_desktop/detail_panel.py
```

Responsibilities:

```text
main_window.py
- route View -> Detailed to DetailedView
- keep top-level frame/menu/toolbar/view switching only

detailed_view.py
- orchestrate Detailed View
- own selection handoff between table and detail panel
- own refresh entry point

detail_table.py
- construct candidature rows/table/list
- expose selected candidature ref
- apply simple search/status filters if available

detail_panel.py
- render selected candidature summary from projection data
```

## Projection contract

Prefer consuming the existing Detailed View projection rows/columns if already present.

Only modify `dashboard_projection.py` if a test reveals a genuine missing Detailed View projection field. If projection changes are required, keep them toolkit-neutral and contract-focused.

Do not add wx imports, HTML routes, MCP resources, or external machine-facing routes to projection/domain/runtime code.

## Mutation boundary

Start read-oriented.

If a minimal local UI write is unavoidable, route it through `DesktopCommandService` or a similarly tiny desktop command adapter. Do not let table/detail widgets call broad DB write functions directly.

## Tests to add or extend

```text
- Detailed View projection rows/columns import without wx.
- Detailed View wx adapter modules are isolated under aaaat/ui_desktop.
- main_window.py remains reduced and does not absorb Detailed View table/detail logic.
- Detailed View can be selected through the desktop frame/view shell.
- Detailed View table/list source uses projection data.
- Smart View behavior guards still pass.
- card_state_patch.py remains absent.
- DesktopCommandService remains the local UI write boundary.
- Runtime boundary tests still pass.
```

Avoid tests for exact wx pixel layout, exact column widths, or temporary fake data names.

## Acceptance criteria

```text
- Smart View manual behavior remains unchanged.
- Detailed View exists as a wx desktop surface.
- Detailed View uses the existing projection pattern.
- main_window.py remains top-level shell code only.
- Detailed View logic is extracted into small adapter modules.
- wx imports remain isolated to ui_desktop.
- projection/domain/runtime remain toolkit-neutral.
- runtime boundary tests still pass.
- no broad CRUD API is introduced.
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
1. Smart View still opens and behaves as previously approved.
2. View switching can open Detailed View.
3. Detailed View shows a useful row/table/list of candidatures.
4. Search/filter/status review behavior is usable enough for manual review.
5. Selecting a row updates the detail surface.
6. Detail surface shows company, role, status, priority, next action, source/context summary, and available artifact references where projected.
7. Returning to Smart View does not reset or break approved Smart View behavior.
8. No Detailed View action exposes external mutation authority.
```
