# Local Desktop Dashboard Slice 01 Status

Branch: `didacll/local-desktop-dashboard`
PR: `#37`
Head after cleanup: `bcfe287fd3d50af6f96e0efa1ba18dde54f2b2e6`
Latest cleanup commit at that head: `Remove desktop card state patch`

## Classification

```text
SMART_VIEW_APPROVED
READY_FOR_SECOND_SLICE_FOUNDATION
```

Smart View has been manually approved as the local desktop call cockpit. The code-quality run keeps that approved behavior while splitting the wx adapter so the next slice does not copy a large `main_window.py` pattern.

## Approved Smart View UX contract

### Recognition before administration

The no-selection state is an overview board. Candidatures are readable cards with company, role, status, priority, keywords, a short identifying signal, and source excerpt. The overview distributes cards horizontally and wraps across the desktop width.

### Staged overview interaction

```text
first click: expand the card in place
second click on the expanded card: open Smart View focus mode
```

The first click gives more recognition information without collapsing the list. The second click commits to the candidature.

### Focus mode hierarchy

```text
left: narrow candidature navigation strip, about 20 percent
center: dominant card workspace and fixed notes band, about 60 percent
right: narrow keyword definition / secondary context, about 20 percent
```

The split is applied after the wx frame is realized so the right pane does not fall back to half of the remaining content width. User resizing remains possible after the initial/default layout is applied.

### Center card behavior

The center uses card surfaces, not title-row-only expanders.

```text
click anywhere on a center card -> expand/collapse that card
linked terms inside card text remain clickable -> update right definition pane
```

Cards currently include Call cockpit, Source, Now, Later, and Offer. Expansion state is explicit and independent by card id. Collapsing all center cards leaves all cards collapsed.

### Literal offer/source text

Smart View exposes long literal offer/source text as a center Source card:

```text
Source card collapsed: compact excerpt
Source card expanded: full-width source reader with linked glossary terms
```

This keeps factual source material readable and out of the narrow right pane.

### Notes band

Notes are fixed at the bottom of the central panel:

```text
center top: card workspace
center bottom: notes band, about 20 percent of center height
```

The notes band remains reachable while reading source text and does not steal the right-pane keyword definition surface.

### Keyword definition interaction

Technical keywords are active links:

```text
click keyword in center text -> right pane shows definition
```

The right pane is dedicated to the active keyword definition, with small keyword shortcut buttons and secondary artifacts below.

## Implemented

### Toolkit-neutral foundation

- `aaaat/dashboard_projection.py`
  - Builds human-local projection sections for `welcome`, `smart`, `detailed`, `user`, `glossary`, `permissions`, and `view_state`.
  - Exposes Smart View selected-candidature detail, primary note, keyword context, artifacts, source text, and call context.
  - Does not import wxPython.
  - Is not exposed as an external machine API.
- `aaaat/dashboard_layout.py`
  - Persists local layout state only.
  - Defaults Smart View to a narrow focus nav and a narrow right context.
- `aaaat/dashboard_modules.py`
  - Keeps module registration toolkit-neutral.

### Extracted wx desktop Smart View adapter

- `aaaat/ui_desktop/app.py`
  - Builds the desktop projection with `include_raw=True`.
  - Keeps wxPython import isolated to launch time.
  - Launches `DesktopDashboardFrame` through `aaaat-desktop`.
- `aaaat/ui_desktop/main_window.py`
  - Keeps only the wx frame, menu, toolbar, view shell, splitters, and top-level layout containers.
- `aaaat/ui_desktop/smart_view.py`
  - Orchestrates Smart View overview/focus surfaces, refresh, selected candidature/keyword handoff, layout persistence, and notes save handoff.
- `aaaat/ui_desktop/overview_board.py`
  - Owns horizontal overview cards and staged first-click expand / second-click focus behavior.
- `aaaat/ui_desktop/center_cards.py`
  - Owns center card construction for call/source/now/later/offer cards.
- `aaaat/ui_desktop/card_state.py`
  - Owns explicit independent center-card expansion state without wx dependencies.
- `aaaat/ui_desktop/keyword_pane.py`
  - Owns the right-pane keyword definition module and shortcut buttons.
- `aaaat/ui_desktop/notes_band.py`
  - Owns the fixed bottom-center notes editor and accepts only a save callback.
- `aaaat/ui_desktop/wx_html_links.py`
  - Owns glossary-aware wx HTML and `kw:` link handling.
- `aaaat/ui_desktop/services.py`
  - Owns tiny local `DesktopCommandService.save_note(candidature_ref, body)`.

### Removed

- `aaaat/ui_desktop/card_state_patch.py`
- `apply_center_card_state_patch()`
- Runtime monkey patching for center-card behavior

### Demo feeder and launch surfaces

- `aaaat.demo_seed`
- `scripts/seed_desktop_demo.py`
- `aaaat-desktop`
- `aaaat-seed-desktop-demo`
- `launchers/Open AAAAT Desktop.cmd`
- `launchers/open-aaaat-desktop.sh`

### Tests

- Projection contract and toolkit-neutral imports.
- Raw source text projection.
- Smart View primary-note model.
- Detailed View projection rows/columns contract only; no Detailed View UI implementation.
- Read-only permission projection.
- Layout state persistence.
- Smart View right-context size guard.
- Desktop projection builder import without wx.
- Dashboard projection builder import without wx.
- Actual package/script metadata for `aaaat` and `aaaat-desktop`.
- wx import isolation to `aaaat/ui_desktop`.
- `main_window.py` reduced to top-level layout.
- Extracted adapter module source guards.
- `card_state_patch.py` removal.
- Explicit independent `CenterCardState` unit behavior.
- Collapsing all center cards leaves all collapsed.
- Demo feeder creation and idempotency.
- Runtime boundary.

## Projection/runtime contract

The projection boundary remains unchanged. `dashboard_projection`, `dashboard_layout`, `dashboard_modules`, domain code, and runtime code remain toolkit-neutral. The runtime boundary still does not import `ui_desktop`, `dashboard_projection`, or `DashboardLayoutState` where those would cross the intended desktop boundary.

No wx, HTML dashboard routes, MCP resources, external machine-facing routes, broad CRUD API, plugin framework, heavy dependency, or mutation-authority expansion was added by this cleanup.

## Not implemented yet

- Full Detailed View wx table/grid.
- Full User View wx workspace.
- Full Welcome View onboarding surface.
- Real new-candidature/profile/settings desktop dialogs.
- Desktop packaging beyond launcher scripts.
- Browser dashboard removal or deprecation.

## Next slice

Slice 02 is now planned in:

```text
docs/planning/local-desktop-dashboard-slice-02-detailed-view-plan.md
```

The next implementation target is a wx Detailed View foundation for structured candidature review. It must preserve Smart View behavior, keep `main_window.py` as the shell, consume the existing projection pattern, and avoid new broad APIs or runtime boundary changes.

Target classification after Slice 02 implementation:

```text
READY_FOR_DETAILED_VIEW_MANUAL_VERIFICATION
```

## Manual verification command

```bash
python -m pip install -e .[desktop]
aaaat-seed-desktop-demo --reset --count 64
aaaat-desktop
```

The approved Smart View checklist remains: overview cards wrap horizontally, first click expands, second click opens focus, focus starts near 20/60/20, center is dominant, center cards expand independently, all cards can remain collapsed, Source expands into a readable full-width source reader, notes stay fixed at center-bottom, keyword links update the right definition pane, search includes recognition/source text, panes are resizable, Reset restores layout, and layout persists after restart.
