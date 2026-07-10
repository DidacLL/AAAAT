# Local Desktop Dashboard Slice 01 Status

Branch: `didacll/local-desktop-dashboard`
PR: `#37`

## Classification

```text
READY_FOR_MANUAL_WX_SMART_VIEW_VERIFICATION
```

The first local desktop dashboard slice now includes both the toolkit-neutral foundation and a wxPython Smart View adapter.

## Implemented

### Toolkit-neutral foundation

- `aaaat/dashboard_projection.py`
  - Builds human-local projection sections for `welcome`, `smart`, `detailed`, `user`, `glossary`, `permissions`, and `view_state`.
  - Exposes Smart View selected-candidature detail, primary note, right context modules, keyword context, artifacts, call card, company research, form answers, and agent suggestions.
  - Exposes Detailed View rows, available columns, visible columns, column order, selected row, toolbox actions, and task queue summary.
  - Does not import wxPython.
  - Is not exposed as an agent API.

- `aaaat/dashboard_modules.py`
  - Defines stable module declarations for Smart, Detailed, User, and Welcome surfaces.
  - Validates module ids, supported views, default regions, visibility, and minimum useful sizes.

- `aaaat/dashboard_layout.py`
  - Persists selected view, selected candidature reference, selected keyword, pane sizes, visible modules, and Detailed View columns.
  - Stores layout/selection only, not private professional values or note bodies.

### wx desktop Smart View adapter

- `aaaat/ui_desktop/app.py`
  - Provides `aaaat-desktop` entry point and `python -m aaaat.ui_desktop.app` support.
  - Imports wxPython only at launch time.
  - Builds projection before creating the desktop frame.

- `aaaat/ui_desktop/main_window.py`
  - Implements the first Smart View desktop window.
  - Uses a readable three-region layout:

    ```text
    left: compact candidature list
    center: selected candidature operational detail
    right: context modules
    ```

  - Supports candidature selection.
  - Supports search/filter over the candidature list.
  - Shows selected candidature focus detail.
  - Provides one primary note editor per selected candidature.
  - Saves primary note changes in full local mode.
  - Disables note editing in read-only mode.
  - Provides right context modules for notes, keywords, artifacts, call card, company research, form answers, and agent suggestions.
  - Supports keyword selection and definition display.
  - Supports module visibility toggling through the Modules menu.
  - Persists selected view, selected candidature, selected keyword, visible modules, and pane sizes on close.
  - Provides File menu support-surface entries for new candidature and profile/settings as reachable dialogs/placeholders, without occupying Smart View.

### Launch surfaces

- `aaaat-desktop` script entry point.
- `launchers/Open AAAAT Desktop.cmd`.
- `launchers/open-aaaat-desktop.sh`.

### Tests

- `tests/test_local_desktop_dashboard_slice.py`
  - Projection contract.
  - Smart View primary-note model.
  - Detailed View rows/columns model.
  - Read-only permission projection.
  - Toolkit-neutral projection import behavior.
  - Layout state round-trip and file persistence.
  - Module registry validation.
  - Desktop adapter import without wx.
  - Optional desktop package metadata.
  - Agent runtime boundary.

## Not implemented yet

- Full Detailed View wx table/grid.
- Full User View wx workspace.
- Full Welcome View wx onboarding surface.
- Real new-candidature/profile/settings desktop dialogs.
- Desktop packaging beyond launcher scripts.
- Browser dashboard removal or deprecation.

## Manual verification required

Run after installing the desktop extra:

```bash
python -m pip install -e .[desktop]
aaaat init
aaaat app create --company "Example Co" --role "Backend Engineer"
aaaat-desktop
```

Verify:

```text
app window starts
Smart View renders
candidature list is readable
selecting a candidature updates central detail
primary note editing works in full mode
right context module switching works
keyword selection preserves selected candidature
module visibility can change through the Modules menu
pane resizing works
layout state persists after restart
read-only launch disables note editing
agent runtime remains unchanged
```

## Review decision

Do not classify as `PRODUCT_READY_TO_REVIEW` yet.

Use:

```text
READY_FOR_MANUAL_WX_SMART_VIEW_VERIFICATION
```

If manual wx verification passes, the next implementation slice should be Detailed View table/grid.
