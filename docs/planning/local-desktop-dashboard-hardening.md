# Local desktop dashboard hardening

Status: implementation review branch for PR #37.

## Purpose

Preserve the approved wx Smart View and Detailed View behavior while extracting only the semantics a future first-party browser UI should reuse.

## Shared core contracts

- `aaaat.candidature_fields` owns candidature field grouping, labels, editability, storage keys, value kinds, and read-only reasons.
- `aaaat.application_commands` owns strict human-local mutation validation, normalization, and transaction boundaries.
- `aaaat.desktop_view_projection` builds only the active desktop view projection and remains independent of wxPython.
- mode and raw-intake permissions remain in the existing security policy.

## Desktop-only responsibilities

- wx widgets and event binding;
- splitter, window, card, and scroll state;
- explicit Smart, Detailed, and User screen composition;
- desktop layout persistence;
- compatibility filtering of unknown widget fields before strict command execution.

## Explicitly not shared

- pane placement or a universal left/center/right contract;
- generic module registration;
- widget classes or rendering callbacks;
- wx layout dimensions;
- a public projection API;
- agent mutation authority.

`dashboard_modules.py` and the eager `build_dashboard_projection` remain compatibility surfaces for existing tests and non-desktop callers. The desktop runtime no longer uses their generic module registry or all-view projection composition.

## Refresh contract

Desktop mutations follow:

```text
widget values
→ shared application command
→ storage commit
→ rebuild active projection
→ rerender active view
→ preserve valid selection and layout state
```

Durable values are reloaded from storage. Widgets are not the authoritative post-save state.

## Future browser UI seam

A future browser adapter may reuse:

- candidature field policy;
- human-local commands;
- permission policy;
- active-view projection semantics.

It must not import `aaaat.ui_desktop`, inherit wx layout assumptions, or expose dashboard projections through agent HTTP or MCP.
