# First real-use v2 baseline candidate

Status: **candidate only — no real-use/release compatibility baseline has been established.**

Parent Mission: #235. Audit Issue: #236.

## Candidate

The current runtime/data candidate is merged `main` commit:

`9e238b90be351ae55ac5732a5b136bc6dd8aebc8`

This is the post-UX product after Mission #204 and PR #234. The audit/reconciliation work for #236 is documentation only and does not change the candidate runtime, schema, provider boundary, document authority, or packaged application behavior.

`package.json` still identifies the application as `2.0.0-alpha.0`. That alpha label is not a compatibility promise and this document does not convert it into one.

Only an explicit Product Owner decision may establish the first real-use/release data baseline. If approval happens after further commits, the approval must name the exact intended baseline commit rather than inferring it from this candidate record.

## Data/schema candidate

At the candidate commit, workspace startup owns exactly these ordered migrations:

1. `001_workspace.sql`
2. `002_profile.sql`
3. `003_documents.sql`
4. `004_candidatures.sql`
5. `005_concepts.sql`
6. `006_activity.sql`
7. `007_career_context.sql`
8. `008_candidature_information.sql`
9. `009_todos.sql`

`src/main/workspace.ts` derives SHA-256 from each raw SQL migration, stores `version`, `name`, `sha256`, and `applied_at`, validates the ordered applied prefix, fails closed on name/hash mismatch, and applies each missing migration transactionally. New-workspace initialization removes provisional SQLite/WAL/SHM state when migration fails.

Before explicit baseline approval these files remain development-era schema under `OWNER_INTENT` / `SPEC`; their history is not a compatibility commitment. If the Product Owner establishes this candidate as the first real-use/release baseline, these exact migration contents become the baseline history and later schema evolution must use new numbered migrations rather than editing the released/applied baseline migrations.

## Evidence map

| Hard gate | Current evidence |
| --- | --- |
| Fresh/current workspace and migration integrity | `src/main/workspace.ts`; `test/workspace.test.ts`; packaged recovery tests exercise real SQLite migration history and hash validation. |
| Local ownership and complete manual/no-AI use | Integrated acceptance Issue #202 / PR #203; packaged manual candidature/document/setup flows. The UX Mission preserved the same application-service and local-workspace authority. |
| Renderer/process isolation | `test/window-options.test.ts`, `test/preload-api.test.ts`, external-command/API tests, and packaged runtime security checks. Mission #204 changed renderer composition, not the Electron privilege boundary. |
| Privacy and bounded operation context | `test/ai-service.test.ts`, candidature comparison/privacy tests, MCP CV descriptor/content/render tests, and the fixed named-operation preload/main boundaries. |
| Backup and restore | `test/workspace-backup.test.ts`, `test/WorkspaceRecoveryPanel.test.tsx`, `test/desktop/packaged-recovery.spec.ts`, plus integrated acceptance #202/#203. |
| Portable user-owned documents | `test/document-service.test.ts`, `test/latex-portability.test.ts`, `test/artifact-service.test.ts`, `test/combined-document-service.test.ts`. PR #203 strengthened real pdfLaTeX portability with Spanish/French Latin content. |
| Cross-platform packaged application | Verify #548 (`34296548080`) passed Fast verification, Windows/macOS/Linux release packaging and packaged runtime smoke, and the aggregate gate. |
| Final post-review Stage-13 production behavior | Verify #550 (`34298705829`) passed Fast verification, real Linux packaging/runtime smoke, and aggregate gate at `9fd99bdf…`; the subsequent `cca55bbb…` delta was test-only. Verify #551 (`34299615670`) passed Fast verification on that final test-only head after retrying one unrelated MCP timeout. |
| Cohesive minimum-size UX | Mission #204 Stages 6–13 provide packaged `720×600` evidence for shell, candidature, CV/letter, Professional information, Settings, and contextual handoffs with zero horizontal overflow on the relevant final Linux runs. |

The cross-platform release evidence from #548 remains applicable after the later Stage-13 corrections because the subsequent production changes were renderer-only coordination/dirty-state/AI-fallback corrections, with no platform-specific packaging, main-process, preload, dependency, persistence, TeX, or provider changes; those final production changes were then covered by Fast + real Linux packaged runtime in #550.

## Documentation/compatibility audit

Current repository authority consistently says there is **no real-user v2 compatibility baseline yet**. `README.md` points users to alpha installation guidance, and `package.json` remains `2.0.0-alpha.0`. No current repository document found by this audit claims that migrations `001`–`009` are already released/immutable compatibility history.

Therefore no compatibility promise needs to be unwound before an explicit baseline decision.

## Explicit non-blocking deferrals

The following are not blockers to nominating the current product/data state for first real use because authority already treats them as optional/deferred rather than prerequisites:

- detailed CV section design, executive/classic/dense style variants, typography, and broader language/font handling remain the explicit future LaTeX collaboration with the Product Owner;
- no AI connection is required; provider setup remains optional;
- alternate TeX engines are not required; the accepted production boundary is pdfLaTeX/pdfTeX;
- a dashboard, template marketplace, updater, telemetry, cloud sync, provider marketplace, generic workflow/agent framework, or plugin system is not required;
- the alpha package label may remain until a separate release/versioning decision; approving a data baseline is not itself a release announcement.

Multilingual document content is **not** treated as deferred: integrated acceptance #203 already strengthened the real pdfLaTeX portability scenario with Spanish/French Latin content, and later UX work did not change that document-production boundary.

## Audit result

No concrete blocker was found that makes `9e238b90be351ae55ac5732a5b136bc6dd8aebc8` unsafe to **nominate** as the first real-use v2 data baseline candidate.

This conclusion does not establish the baseline. It means the engineering/audit side is ready for one explicit Product Owner decision.

## Consequence of approval

If the Product Owner explicitly approves a named commit as the first real-use/release data baseline:

- existing workspaces created at that baseline become real compatibility obligations;
- the approved baseline migration files become immutable release history;
- later schema changes use new numbered migrations and preserve hash validation;
- development-era direct schema correction is no longer allowed for already-baselined history;
- backup/restore and future upgrade tests must preserve data from that baseline forward;
- v1 migration remains out of scope unless separately authorized.

Until that explicit approval occurs, the repository remains pre-baseline and `SPEC`'s direct-correction rule continues to apply.
