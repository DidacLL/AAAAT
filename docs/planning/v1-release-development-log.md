# AAAAT v1 release development log

Branch: `didacll/v1-from-pr37-clean-slice`
Base: accepted PR37/PR39 state `97b2e474d4c609002a4c786f81c60446e3b0be5e`

Status: historical. This log records a superseded branch and must not drive v1
implementation. The authoritative requirements, gap ledger, readiness status,
and direct maintainer decisions supersede it.

## Historical decisions (superseded)

- wx desktop is the only v1 human runtime.
- HTTP/browser serving, static browser export, FastAPI/Uvicorn/Jinja/browser assets and browser launch posture are removed.
- Agent integrations remain provider-agnostic and local: manual external-agent packets, guided Codex CLI / Claude Code / Gemini CLI descriptions, and explicit argv custom-command execution.
- Descriptor-only MCP remains metadata only; no MCP transport is introduced.
- Candidature status is normalized to `active` or `closed`.
- Generated task results are applied as current when safe; stale/conflicting generated output remains non-current history instead of entering a Use/Discard review queue.
- Render failure is fatal for the render operation; failed PDF compilation does not leave a task completed with a misleading artifact.
- Generated artifact versions use immutable version paths and lifecycle events distinguish create, replace, attach/state, and send.

## Current implementation wave

- Removed browser runtime dependencies from packaging.
- Disabled the old HTTP launcher and browser static export path.
- Removed FastAPI/browser dashboard modules from the branch.
- Added a canonical candidature field registry with groups, writable storage keys, read-only reasons, active/closed status semantics, and value kinds.
- Routed Detailed View field semantics through the canonical registry.
- Normalized new, updated, loaded, and initialized candidature status values.
- Added provider-agnostic local adapter metadata.
- Added local workspace settings for automatic task selection and local adapter configuration.
- Added a bounded task runner for `argv_custom_command`.
- Added a single owned non-daemon background worker and a wx adapter using `wx.CallAfter` for UI notifications.
- Reworked task completion so submitted results are applied deterministically and stale output is preserved as history.
- Added artifact lifecycle event logging.
- Updated the CLI around wx-only v1 semantics and removed browser launch/export commands.
- Updated agent/MCP guide text to remove HTTP runtime references.

## Still open

- Wire the desktop task worker into Smart/Detailed/User panels with visible waiting/running/completed/failed/retry/cancel affordances.
- Add first-run/support dialogs for intake, profile/career, integrations, templates, privacy/storage, and backup/restore.
- Add atomic field revision/provenance records across every canonical field update.
- Finish explicit CV/cover-letter generation flows from current edited evaluation, strategy, profile, and template inputs.
- Expand local artifact lifecycle events where external attachments and send tracking are initiated from desktop actions.
- Replace browser/static tests with behavior tests matching wx-only v1 semantics.
