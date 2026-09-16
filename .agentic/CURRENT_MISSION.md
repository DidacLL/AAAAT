# Current execution state

## Active integrated recovery

PR #319 remains open and unmerged on `product/dogfood-workspace-ai-context`.

The accepted product implementation is `78772750bd15d9c1a8a2b8bf5930f3ebceddbbff`. The audited packaging workflow was added afterward without product-code changes.

The independent whole-PR product/architecture audit and bounded correction are complete. Do not start another feature, domain or interaction redesign unless Product Owner natural-use testing exposes a concrete defect.

## Product authority

Read authority in `AGENTS.md` order. Current `PRODUCT_DEFINITION.md` and `docs/UX_DEFINITION.md` contain the settled product model. Active user/operator documentation and `docs/SPEC.md` match the accepted implementation; historical ADRs, old desktop tests and owner-source material are evidence only.

## Accepted implementation to preserve

Do not regress:

- sparse applications, first-class Sources and complete manual/no-AI use;
- Focus / All data over one application corpus;
- flexible user-maintainable application information;
- shared Tags with scalable attach/search/create/edit and reviewed AI Tag proposals;
- one persistent `AI may use this information` permission for application fields and reusable professional information;
- Opportunity Review with the same bounded permission model;
- bounded AI operations, typed capability validation, diagnostics and inspectable exchanges;
- item-level Profile variants;
- CV templates, Working CVs, immutable Rendered CV snapshots, application-owned cover letters and Application packets;
- Templates / Rendered CVs / Letters / Application packets collections;
- persistent rail Data / AI / PDF status;
- exactly four Settings tabs: Workspace / AI / Documents / Backup;
- advanced bounded external-assistant connection plus explicit installer/configurator action authority under Settings → AI;
- demo/reset, local ownership and backup/recovery.

## Windows candidate produced

A fresh Windows x64 candidate was produced by GitHub Actions from exact SHA `74b9259d882534571acd65cd129f1bdcdaf309d7` using workflow `Windows package candidate`, run `35138407909`.

The only repository change between the prior acceptance-state head and this packaging SHA is `.github/workflows/windows-package.yml`.

Packaging evidence:

- Node `24.20.0`;
- npm `11.19.0`;
- `npm ci` passed;
- `npm run typecheck` passed;
- `npm run make` passed;
- Verify run at the same SHA passed;
- package `AAAAT-win32-x64-2.0.0-alpha.0.zip`;
- package size `160169616` bytes;
- package SHA-256 `a7e67e56a796f43a3c0deafd8ba2d099cef58e1a3c21beff0597965ac7b5a36d`;
- GitHub Actions artifact `10463274901` contains that package plus `windows-package-metadata.txt`.

This is an unsigned alpha package. Packaging success is build evidence only, not Product Owner acceptance.

## Current gate: Product Owner natural-use acceptance

Do not perform additional implementation, cross-platform packaging or release work until the Product Owner reports natural-use findings from the Windows candidate.

Owner testing should use the packaged application normally, not the development renderer. Useful coverage includes:

- sparse/raw application capture and optional CV/letter creation;
- Focus and complete application work;
- shared Tag attach/search/create/edit behavior;
- the single AI-use eye, AI connection validation and diagnostics;
- My information item variants;
- template → Working CV → Rendered CV ownership behavior;
- application-owned letters and Application packets;
- persistent Data/AI/PDF rail status;
- four-tab Settings, endpoint errors and advanced external-assistant authorization;
- demo/reset and backup/recovery.

Treat observed owner friction, wrong behavior, data loss, broken document ownership, misleading privacy/AI disclosure, or packaged-runtime failures as evidence. Do not invent speculative cleanup during acceptance.

## After owner findings

If owner testing finds a material defect, make one coherent correction pass scoped to demonstrated findings, then rebuild the Windows candidate as needed.

Only after explicit Product Owner natural-use acceptance:

1. run impact-appropriate Windows regression/package evidence;
2. run Linux/macOS packaging or cross-platform verification appropriate to release readiness;
3. resolve only demonstrated release blockers;
4. prepare the final merge/release decision.

Never merge PR #319 without explicit Product Owner direction.