# M5 — Release Hardening

**Status: active.** M0 through M4 are accepted and complete. M5 is the final hardening Mission. It stabilizes the existing product for release without adding a new product or architectural layer.

## Outcome

AAAAT's accepted local-first, manual-first product works reliably as a packaged desktop application on supported platforms, with release-critical security, recovery, compatibility, documentation, and cleanup evidence. Hardening fixes demonstrated defects and removes accidental complexity; it does not create new extensibility systems.

## Required

- prove packaged Windows, macOS, and Linux behavior for release-critical existing workflows
- fix demonstrated reliability defects in startup, workspace use, documents/rendering, optional AI, bounded integrations, backup, and restore
- preserve Electron renderer isolation, narrow preload/IPC authority, privacy projection, local ownership, manual independence, and portable user-owned LaTeX as hard gates
- verify clean-install/runtime prerequisites and failure messages are understandable and truthful
- verify existing workspace/migration compatibility and recovery behavior without editing accepted migration history
- make release documentation sufficient to install, run, use core manual workflows, configure optional capabilities, back up, restore, and troubleshoot known prerequisites
- remove dead experiments, obsolete temporary compatibility code, or duplicated release-path logic when evidence shows it is no longer needed
- prefer deletion and direct fixes over new abstractions
- keep executable evidence focused on release-critical behavior; do not grow a general test/infrastructure framework

## Explicit non-goals

- new candidature, profile, document, AI, MCP, host, installer, backup, or restore product capabilities
- generic agent, plugin, workflow, provider, command, repository, service, or compatibility frameworks
- new background daemons, localhost APIs, cloud services, synchronization, telemetry, or account infrastructure
- v1 compatibility layers or migration
- speculative second hosts/providers or future-release scaffolding
- broad dependency upgrades unrelated to a demonstrated release blocker
- architecture rewrites disguised as cleanup

## Completion

M5 is complete when the existing AAAAT v2 product has focused cross-platform packaged evidence for its release-critical paths, applicable security/privacy/recovery/portability gates pass, user-facing setup and recovery documentation is truthful, demonstrated release blockers are resolved, and no unjustified architectural expansion remains.
