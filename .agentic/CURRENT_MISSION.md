# Current execution state

## Active integrated recovery

PR #319 remains open and unmerged on `product/dogfood-workspace-ai-context`.

The accepted product baseline before the document-domain pass is `92ad484f6d15d72599ef5ecf86b512a131d2a16d`.

This is still product interaction/domain architecture recovery, not deployment polish.

## Product authority

Read authority in `AGENTS.md` order. Current `PRODUCT_DEFINITION.md` and `docs/UX_DEFINITION.md` already contain the settled product model. Do not invent a competing document or profile model from existing schema, tests, migrations, historical UI or implementation cost.

AAAAT has no canonical workflow. Application work, reusable professional information, reusable CV work, application-owned letter work, rendered artifacts and Settings are direct intentions.

## Accepted work to preserve

Do not regress:

- Sources/raw capture and sparse applications;
- flexible user-maintainable application information;
- shared Tags with scalable attach/search/create/edit interaction;
- bounded AI Tag matching/new-Tag proposals with review before persistence;
- one persistent `AI may use this information` permission for application fields, professional-information items and career-context information;
- Opportunity Review using that same permission model, with exact projected-context preview and no competing token/omit/expose selectors;
- demo workspace/reset;
- AI reliability, provider diagnostics, inspectable exchanges and bounded prompt/context behavior;
- local ownership, manual/no-AI operation, backup/recovery and useful rendering foundations.

Routine PR CI is intentionally lightweight: dependency install plus TypeScript typecheck. Focused tests should protect changed behavior when useful. Full package/LaTeX/cross-platform verification is acceptance/release evidence, not an iterative implementation gate.

## Current owned area: CV/document domain recovery

Rebuild the document model around the settled distinction:

- **My information**: reusable professional facts;
- **Profile variant**: reusable alternative wording/emphasis for one professional-information item;
- **CV template**: reusable ordered composition of sections and selected information;
- **Working CV**: editable CV derived from a template, application, My information or blank;
- **Rendered CV**: generated PDF plus the content/composition snapshot that produced it;
- **Cover letter**: normally owned by one application;
- **Application packet**: generated CV + cover letter combination.

Current implementation is evidence to replace where it conflicts. In particular, the aggregate whole-profile variant model, generic `documents` CV/letter record, document item patch/rule architecture, permanent PDF tab, CV descriptor/assistant metadata, external-content-access UI, raw path/source-ownership UI and candidature-only `combined` artifact vocabulary are not product authority.

The document pass should produce one coherent end-to-end model and UI, not adapters around the old one. Edit the current schema directly; no migration/compatibility layer is required.

Required behavior:

- CV templates have name, optional language, ordered renameable sections and ordered items/custom content.
- A template item can use current My information, a saved item variant, or a template-specific override.
- Excluding/overriding/reordering in a template never mutates My information.
- Working-CV edits are document-local unless the user explicitly chooses a contextual ownership action such as Save to template, Save as new template, Save as profile variant, or Update My information.
- Render PDF acts on the current working composition, including unsaved document-specific changes, and creates a separate Rendered CV record with enough snapshot data to inspect/duplicate/reproduce it.
- Application-created cover letters are owned/linked immediately and visible from the application as well as the Letters collection.
- Reuse the existing combined rendering capability as Application packet where semantics fit; do not create a second packet engine.
- CVs/Documents presents distinct collections: Templates, Rendered CVs, Letters, Application packets.
- Keep source-project export only as a compact advanced user-owned action if still useful. Remove permanent raw paths, LaTeX ownership explanations, descriptors, assistant tags/notes and generic external-assistant access surfaces.

Do not redesign the workspace rail or Settings in this pass except where document APIs must stop exposing rejected concepts. Those are the next coherent area.

## Next after document acceptance

1. Audit the document pass against the settled domain model and correct only material gaps.
2. Recompose persistent rail/status + compact tabbed Settings.
3. Independent final product/architecture audit.
4. Owner natural-use acceptance and then impact-appropriate packaged/cross-platform verification.

Never merge PR #319 during this recovery.