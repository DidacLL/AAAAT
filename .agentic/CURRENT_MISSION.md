# Current execution state

## Active integrated recovery

PR #319 remains open and unmerged on `product/dogfood-workspace-ai-context`.

The accepted product implementation head before the final audit correction is `7a3892648c06cc75d0fb156e7e655a65b4709d70`.

The application/Tags/AI-visibility/document/rail/Settings architecture is accepted for owner natural-use testing. Do not start another feature or interaction redesign.

## Product authority

Read authority in `AGENTS.md` order. Current `PRODUCT_DEFINITION.md` and `docs/UX_DEFINITION.md` contain the settled product model. Active user/operator documentation and derived technical architecture must match that model; historical ADRs and owner-source material may remain historical evidence.

## Accepted work to preserve

Do not regress:

- sparse applications, first-class Sources and manual/no-AI use;
- Focus / All data over one application corpus;
- flexible user-maintainable application information;
- shared Tags with scalable attach/search/create/edit and reviewed AI Tag proposals;
- one persistent `AI may use this information` permission for application fields, professional information and career-context information;
- Opportunity Review with that same permission model and projected-context preview;
- AI reliability, typed operation validation, provider diagnostics, inspectable exchanges and bounded prompt/context behavior;
- item-level profile variants, CV templates, Working CVs, immutable Rendered CV snapshots, application-owned cover letters and Application packets;
- visible Templates / Rendered CVs / Letters / Application packets collections;
- persistent rail Data / AI / PDF status;
- four Settings tabs only: Workspace / AI / Documents / Backup;
- demo/reset, local ownership, backup/recovery and bounded external capabilities.

Routine PR CI remains dependency install plus TypeScript typecheck. Full package/LaTeX/cross-platform verification is later acceptance/release evidence.

## Current owned area: final audit correction only

The independent whole-PR audit found three bounded coherence defects. Correct these and nothing broader.

### 1. Restore visible authorization for bounded setup actions

`installer.ai` and `configurator.ai` mutation authority still exists in the services/MCP boundary and is denied by default, but the four-tab Settings rewrite removed the user's visible controls for enabling it.

Restore the two explicit local switches as secondary/advanced controls under **Settings → AI**. Keep external-assistant setup subordinate; do not recreate `External assistants & portability`, a setup dashboard, or a fifth Settings tab.

Preserve the existing semantics:

- status inspection remains privacy-minimal/readable;
- `installer.ai actions` only authorize AAAAT's fixed rendering self-test;
- `configurator.ai actions` only authorize typed connection save, operation validation and validated default selection;
- no shell, arbitrary command, filesystem, database or provider-option authority.

Prefer reusing/extracting the existing `SetupActionAuthority` behavior rather than duplicating permission state.

### 2. Correct active user and technical documentation

`docs/USER_GUIDE.md` still names removed Settings destinations and removed MCP tools. Bring it into exact alignment with the current four-tab product and actual `mcp-server.ts` tool surface. Do not document capabilities that do not exist.

`docs/SPEC.md` still describes the rejected generic/document-source architecture. Update its derived document section to the accepted domain: item-level profile variants, CV templates, Working CVs, Rendered CV snapshots, application-owned cover letters and Application packets. LaTeX is an internal rendering technology; remove claims that ordinary architecture centres editable blueprints, descriptors, generic external disclosure or old document projects.

Historical ADRs/owner-source files can remain as history and must not be bulk-rewritten merely for terminology.

### 3. Remove one stale rejected durable AI key

`src/main/ai-connection-service.ts` still accepts `variant_recommendation` inside `operationDefaultsSchema` even though that operation no longer exists in `aiOperationSchema` and the aggregate profile-variant recommendation architecture was deleted.

Remove that stale key and any active test/fixture dependency on it. AAAAT is pre-user; do not add migration, compatibility or version-shim machinery to preserve rejected development configuration.

## Verification boundary

Run focused checks/typecheck as practical. Search active code and current operator docs for stale current references to `variant_recommendation`, `cv_descriptions_read`, `cv_content_read`, `cv_render`, `External assistants & portability`, `Document rendering`, and `Backup & recovery`. Remaining occurrences are acceptable only where clearly historical/non-authoritative.

Do not package yet. After this correction the orchestrator will re-audit the exact head and, if clean, request one fresh packaged Windows candidate for Product Owner natural-use acceptance.

Never merge PR #319 during this recovery.