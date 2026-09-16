# Current execution state

## Active integrated recovery

PR #319 remains open and unmerged on `product/dogfood-workspace-ai-context`.

The accepted product candidate implementation is `78772750bd15d9c1a8a2b8bf5930f3ebceddbbff`.

The independent whole-PR product/architecture audit and its bounded correction are complete. Do not start another feature, domain or interaction redesign unless owner natural-use testing exposes a concrete defect.

## Product authority

Read authority in `AGENTS.md` order. Current `PRODUCT_DEFINITION.md` and `docs/UX_DEFINITION.md` contain the settled product model. Active user/operator documentation and `docs/SPEC.md` have been reconciled to the implementation; historical ADRs, old desktop tests and owner-source material remain evidence only.

## Accepted implementation to preserve

Do not regress:

- sparse applications, first-class Sources and complete manual/no-AI use;
- Focus / All data over one application corpus;
- flexible user-maintainable application information;
- shared Tags with scalable attach/search/create/edit and reviewed AI Tag proposals;
- one persistent `AI may use this information` permission for application fields, professional information and career-context information;
- Opportunity Review with the same permission model and projected-context preview;
- bounded AI operations, typed capability validation, provider diagnostics and inspectable exchanges;
- item-level Profile variants;
- CV templates, Working CVs, immutable Rendered CV snapshots, application-owned cover letters and Application packets;
- Templates / Rendered CVs / Letters / Application packets collections;
- persistent rail Data / AI / PDF status;
- exactly four Settings tabs: Workspace / AI / Documents / Backup;
- advanced bounded external-assistant connection plus explicit installer/configurator action authority under Settings → AI;
- demo/reset, local ownership and backup/recovery.

Routine PR CI at the candidate SHA is green. The final-audit correction removed the stale `variant_recommendation` runtime key and reconciled the active MCP/user documentation with the registered bounded tool surface.

## Current gate: fresh packaged Windows candidate

Produce one fresh Windows package from exact accepted candidate `78772750bd15d9c1a8a2b8bf5930f3ebceddbbff` for Product Owner natural-use acceptance.

This is acceptance evidence, not a new implementation pass.

On a Windows environment with the repository checked out at that exact SHA:

1. use the repository-pinned Node/npm versions from `package.json`;
2. run `npm ci`;
3. confirm `npm run typecheck`;
4. create the distributable with `npm run make` (Electron Forge Windows zip maker);
5. launch the packaged application, not the development renderer;
6. perform only a short packaging/runtime smoke sufficient to prove the package starts, loads/creates a workspace and exposes the current shell; do not substitute automation for owner natural-use acceptance;
7. provide the resulting Windows ZIP artifact, exact SHA, file size and SHA-256 checksum to the Product Owner.

If packaging itself fails because of a concrete packaging/runtime defect, fix only that demonstrated blocker on this same branch, rerun the smallest relevant checks, and report the new SHA. Do not opportunistically change product UX or domain behavior.

Do not use stale historical Playwright expectations as authority. `npm run verify:package` may be useful evidence only where its current tests still match the accepted product; a historical UI assertion is not permission to revert the product.

## Owner natural-use acceptance

The Product Owner should use the fresh packaged Windows candidate normally, with special attention to:

- new sparse/raw application capture and optional CV/letter creation;
- Focus and complete application work;
- shared Tag attach/search/create/edit behavior;
- the single AI-use eye and AI diagnostics;
- My information item variants;
- template → Working CV → Rendered CV ownership behavior;
- application-owned letters and Application packets;
- persistent Data/AI/PDF rail status;
- four-tab Settings, including concrete AI endpoint errors and advanced external-assistant authorization;
- demo/reset and backup/recovery.

Do not merge on packaging success alone.

## After owner acceptance

Only after explicit Product Owner natural-use acceptance:

1. run impact-appropriate Windows regression/package evidence;
2. run Linux/macOS packaging or cross-platform verification appropriate to release readiness;
3. resolve only demonstrated release blockers;
4. prepare final merge/release decision.

Never merge PR #319 without explicit Product Owner direction.