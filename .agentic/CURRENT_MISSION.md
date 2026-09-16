# Current execution state

## Active integrated recovery

PR #319 remains open and unmerged on `product/dogfood-workspace-ai-context`.

The accepted product architecture remains the model in `PRODUCT_DEFINITION.md` and `docs/UX_DEFINITION.md`, but Product Owner natural-use testing of Windows candidate `74b9259d882534571acd65cd129f1bdcdaf309d7` proved the implementation is not yet acceptance-ready. Do not merge.

This mission supersedes the earlier narrow packaging/acceptance gate. The next implementation pass is one integrated runtime-coherence recovery, not a sequence of one-button patches.

## Product authority

Read authority in `AGENTS.md` order. Preserve the settled product model: sparse applications and Sources; Focus / All data; shared Tags; one AI-use permission; item-level Profile variants; CV templates / Working CVs / immutable Rendered CV snapshots / application-owned cover letters / Application packets; persistent Data / AI / PDF rail; exactly Workspace / AI / Documents / Backup Settings; demo/reset/backup/recovery; bounded external capabilities.

Do not reintroduce rejected generic documents, aggregate profile variants, workflow architecture, migration/compatibility machinery, provider frameworks, or obsolete UI destinations.

## Confirmed integration defects from the audit

The first packaged operation exposed a broader stale/current split around the document-domain replacement.

1. `src/main/schema.sql` is the current schema, but `src/main/workspace.ts::validateCurrentWorkspaceDatabase()` still requires deleted schema objects such as `profile_variant_item_rules`, `documents`, `document_item_rules`, `document_activity`, `candidature_documents`, `application_artifacts`, `documents_one_ai_content_visible_cv`, and old `application_artifacts` columns. Fresh workspaces and demo workspaces therefore create the current database and immediately reject it as incompatible.

2. `removeWorkspaceData()` still removes obsolete `documents/` and `artifacts/` directories while current generated projects live in `rendered-cvs/` and `application-packets/`. Reset/delete can therefore leave current AAAAT-generated files behind after deleting the database that owns them.

3. Welcome error handling is not truthful enough: New workspace maps every create failure to a folder-selection message, masking initialization/runtime failures; demo currently exposes the raw Electron remote-method error prefix. Correct this minimally without redesigning Welcome or creating an error framework.

4. Current document collection records hard-code `hasPdf: true` for Rendered CVs and Application packets without checking the retained file. The UI then offers Open PDF unconditionally. A user-owned/missing file can therefore be represented as present until the open operation fails.

5. Persisted `project_relative_path` values are joined to the workspace root without enforcing that they remain inside the current managed generated-project roots. Current generated-artifact path handling must be bounded to the workspace and expected roots.

6. Current tests contain stale architecture evidence: `test/workspace.test.ts` checks obsolete cleanup directories; `test/workspace-backup.test.ts` and `test/desktop/packaged-recovery.spec.ts` use obsolete document/integration fixture paths; `test/preload-api.test.ts` still supplies removed `documentIds`; `test/desktop/packaged-application-intent.spec.ts` asserts deleted `documents` / `candidature_documents` tables. Other desktop tests include historical superseded UI/AI evidence and must be classified rather than treated as authority.

7. Candidate gating was insufficient. Routine `.github/workflows/verify.yml` is intentionally lightweight, but `.github/workflows/windows-package.yml` also ran only install/typecheck/make. The repository already had fresh-workspace and demo tests that would have caught the blocker. A candidate artifact must run a strong current non-desktop verification gate before packaging.

## Required next pass

Use one executable agent session. Before editing, run the full current non-desktop verification (`npm run verify`) and inventory every failure. Then audit active `src/main`, `src/preload`, `src/shared`, renderer entry paths, workspace persistence/backup/reset, and current tests for stale rejected-model references and current contract mismatches. Fix all material current-runtime/integrity issues found in that pass coherently.

Do not weaken current tests to get green. Update/delete only tests that encode rejected architecture; preserve meaningful current behavior tests. `vitest.config.mts` already excludes `test/desktop/**`, so the non-desktop suite can be made an authoritative candidate gate without dragging historical packaged UI tests into routine unit verification.

The Windows candidate workflow should run `npm run verify` (or an equivalent full current non-desktop gate) before `npm run make`. Reconcile and run a small set of current packaged-runtime tests appropriate to first-run/workspace/recovery/application-document behavior; do not resurrect obsolete desktop expectations.

Work locally through the whole pass and push one coherent final implementation commit rather than one commit/CI loop per symptom. After local verification is green, push once and let GitHub produce one corrected Windows candidate. Return exact SHA, full verification results, packaged-runtime evidence, artifact metadata/checksum, and remaining explicitly classified risks.

## Acceptance

Product Owner natural-use testing restarts only after that integrated pass and corrected Windows artifact exist. Packaging success alone is not merge authorization. Never merge PR #319 without explicit Product Owner direction.