# Active Mission — Graphical workspace backup and restore

**Active:** [Issue #187](https://github.com/DidacLL/AAAAT/issues/187) on `feature/gui-workspace-recovery`, based on integrated portable local AI setup `99db35d826b5604e61f9d2fbc290821a75b7796f`.

## Outcome

Expose the already-proven portable workspace backup/restore capability through normal AAAAT desktop controls. A non-developer must be able to create a backup from Settings and restore one either from first-run/no-workspace state or Settings without shell commands, JSON, or renderer-visible filesystem paths.

## Boundaries

ADR 0010 remains authoritative for the backup directory format, exclusions, integrity validation, overlap rules and cleanup behavior. This slice adds graphical authority only: fixed no-argument renderer intentions, Electron-main-owned directory dialogs, explicit confirmation before switching away from an open workspace, and current/remembered workspace activation only after a restore succeeds.

Do not redesign the backup format, add archives, scheduled backup, cloud sync, encryption/key management, generic filesystem/path APIs, restore-in-place, migration changes, AI requirements, dependencies or unrelated setup work.

This is Class C because it adds a privileged renderer → preload → main recovery boundary. ADR 0021 records only that GUI authority/switching decision. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if generic recovery/filesystem abstraction appears.

## Evidence and continuation

Issue #185 / PR #186 is integrated at `99db35d826b5604e61f9d2fbc290821a75b7796f`. Verify #437 passed typecheck, lint, 54 test files / 167 active tests, Windows/macOS/Linux packaged-runtime smoke and the aggregate Verification gate; LaTeX portability was correctly not selected.

Next: finish Issue #187, run focused recovery API/UI tests plus existing backup/restore service tests and impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
