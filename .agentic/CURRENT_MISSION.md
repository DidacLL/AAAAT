# M5 — Release Hardening

**Status: accepted and complete.** M0 through M5 are accepted. The approved AAAAT v2 capability roadmap is complete and no later Mission is active. Further product scope requires a new owner-defined Mission; bounded maintenance may proceed under the accepted SPEC and existing hard gates.

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

## Accepted evidence

- #111 proves native Windows/macOS ZIP and Linux Debian release artifacts plus artifact inspection and packaged runtime smoke.
- #113 provides truthful alpha installation, first-run, manual-use, optional-capability, backup/restore, and troubleshooting documentation.
- #116 corrects the recovery test so its async rejection evidence is actually awaited.
- #117 makes packaged Electron shutdown deterministic on Windows; the full matrix and a second Windows packaged-smoke run passed on the same exact head.
- #119 records reproducible dependency-security evidence: zero npm findings in the production dependency graph, current supported Electron runtime verified separately, and remaining build-tool advisories documented without forced dependency churn.
- PR #121 exact head `6a4490798399c75a939ccb694e49a21c22ff2802` passed Fast verification, LaTeX unrelated-directory portability, and packaged Windows/macOS/Linux checks and was explicitly accepted by the Product Owner with no blocking findings.
- No M5 change edits accepted migration history, weakens a security/privacy/local-ownership/manual-independence/portable-output gate, or introduces a new product subsystem or architectural framework.

## Completion

M5 is complete when the existing AAAAT v2 product has focused cross-platform packaged evidence for its release-critical paths, applicable security/privacy/recovery/portability gates pass, user-facing setup and recovery documentation is truthful, demonstrated release blockers are resolved, and no unjustified architectural expansion remains.

The Product Owner accepted M5 at PR #121 head `6a4490798399c75a939ccb694e49a21c22ff2802`. That acceptance closes the approved M0–M5 capability roadmap as the AAAAT v2 alpha/reviewable release checkpoint; it does not by itself publish a release or create a later Mission.
