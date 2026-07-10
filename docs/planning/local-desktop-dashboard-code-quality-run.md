# Local Desktop Dashboard Code-Quality Run

Branch: `didacll/local-desktop-dashboard`

## Status

```text
SMART_VIEW_APPROVED
READY_FOR_SECOND_SLICE_FOUNDATION
```

Smart View was manually approved before this cleanup. This run does not redesign Smart View, does not start Detailed View, and does not change the dashboard/desktop projection boundary.

## Reason for cleanup

The first Smart View slice proved the product behavior, but `aaaat/ui_desktop/main_window.py` had become the entire wx adapter: frame construction, widget construction, layout, state, overview card behavior, center-card behavior, keyword links, notes persistence, splitter behavior, and refresh logic. That shape was acceptable for proving the slice, but it would make Detailed View copy a large tangled file.

The temporary `aaaat/ui_desktop/card_state_patch.py` monkey patch fixed center-card state, but it was not an acceptable architectural pattern for the next slices.

## Files extracted

```text
aaaat/ui_desktop/main_window.py
```

Now keeps the top-level wx frame, menu, toolbar, shell construction, view-surface containers, splitters, and fixed bottom-center notes band container.

```text
aaaat/ui_desktop/smart_view.py
```

Owns Smart View orchestration: overview/focus switching, refresh, selected candidature and keyword handoff, search, splitter defaults, right-context refresh, note-save handoff, and close/layout persistence.

```text
aaaat/ui_desktop/overview_board.py
```

Owns horizontal wrapping overview candidature cards and staged first-click expand / second-click open Smart focus behavior.

```text
aaaat/ui_desktop/center_cards.py
```

Owns center card construction for call cockpit, source, now, later, and offer cards, plus card-click binding into explicit expansion state.

```text
aaaat/ui_desktop/card_state.py
```

Defines explicit toolkit-neutral `CenterCardState`. Center-card expansion is independent by card id. Collapsing all cards remains all-collapsed.

```text
aaaat/ui_desktop/keyword_pane.py
```

Owns the right-pane keyword-definition module, shortcut buttons, and secondary artifacts module.

```text
aaaat/ui_desktop/notes_band.py
```

Owns the fixed bottom notes editor. It accepts a save callback and has no database knowledge.

```text
aaaat/ui_desktop/wx_html_links.py
```

Owns glossary-aware HTML rendering and `kw:` link handling for center text.

```text
aaaat/ui_desktop/services.py
```

Defines tiny local `DesktopCommandService.save_note(candidature_ref, body)` for UI write commands.

## Behavior preserved

The approved Smart View manual behavior is preserved:

```text
overview cards distribute horizontally and wrap
first click expands an overview card in place
second click opens Smart View focus mode
focus starts near 20 / 60 / 20 for left / center / right
center content remains card-based
clicking a center card expands/collapses only that card
collapsing all center cards leaves all collapsed
source text remains a full-width center card reader when expanded
keyword links in center text still update the right pane
right pane remains keyword-definition-oriented
notes remain fixed in the bottom center band
notes save through DesktopCommandService
layout state persists on close/reset
```

## Projection contract unchanged

`aaaat/dashboard_projection.py`, the desktop projection builder contract, the module registry, domain code, and agent runtime boundary remain toolkit-neutral. wx imports remain isolated to `aaaat/ui_desktop` launch/UI adapter modules.

No dashboard projection routes, wx dependencies, MCP resources, agent routes, broad CRUD surface, or agent mutation authority were added.

## Removed patch

`aaaat/ui_desktop/card_state_patch.py` was removed. There is no `apply_center_card_state_patch()` runtime monkey patch. Center-card state is represented explicitly by `CenterCardState`.

## Next slice unblocked

Detailed View can now be built against the extracted adapter pattern without copying the old large `main_window.py` shape. The next slice remains Detailed View foundation only; it should preserve the projection/runtime boundaries already established here.
