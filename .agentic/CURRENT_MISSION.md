# Current execution state

## Active bounded work

**Issue #314 — Rebuild Candidatures around two-state Focus, raw capture, direct editing and Tags — reopened for UX acceptance correction after real Windows owner review.**

PR #316 merged the domain/state/persistence baseline into `main` as `81668a992a30fe393934f75cf19176addd7aa229`, but the visible renderer did not satisfy the recovered interaction/spatial/visual contract.

Do not revive the retired `product/rebuild-candidatures` branch. Start corrective implementation from current `main`.

## Required correction

Treat the post-merge owner acceptance comment on #314 as blocking scope. In particular:

- Candidatures first sight is retrieval/capture, not field-definition administration.
- Corpus Focus owns the useful viewport; configuration must not push it below the fold.
- Ordinary UI presents information/details, not schema/field-management language.
- Field-definition capability remains user-owned but lives one deliberate step deeper in complete candidature work, close to the information it affects.
- Direct candidature creation is low-friction and coherent, not a page-long sequence of isolated field editors with per-field Save buttons.
- The two creation approaches remain explicit peers, but visible wording must be ordinary/user-facing rather than implementation vocabulary.
- Use maximized/default/minimum desktop space productively; one principal task gets the useful area and fixed narrow centered layouts/excessive blank space are not acceptable.
- First-run workspace selection must fit the supported default/minimum window without scrolling; branding must scale around the task.
- Professional information is read-first; saved variations and privacy/AI disclosure are secondary until relevant.
- AI disclosure is contextual, compact and understandable near the affected information, not permanent first-sight checkbox-console chrome or protocol/security jargon.
- Local storage, Focus visibility and AI disclosure remain independent semantics without forcing the user to understand the internal model.
- Visible UI follows `docs/UX_VISUAL_DIRECTION.md`: friendly worn retrofuturist field-terminal / paper-dossier character with professional information clarity, not generic SaaS card/form styling.
- Empty/sparse states are intentionally composed and useful rather than controls floating in unused space.

## Preserve from #316

Do not regress the useful underlying work already merged:

- two-state corpus → selected-candidature Focus behavior;
- direct complete-candidature entry;
- raw Source-first capture with explicit AI/manual continuations;
- user-maintainable profession-specific candidature information definitions;
- Tags as the shared glossary model;
- local/manual/no-AI operation;
- Sources/search/document handoffs/bounded AI/privacy semantics;
- dirty-state protections and current-schema persistence/backup cleanup;
- no lifecycle/status/priority/next-action architecture;
- no obsolete global ToDo/Concept/migration-compatibility paths.

## UX authority

Use current explicit Product Owner instruction first, then `PRODUCT_DEFINITION.md`, `docs/UX_DEFINITION.md`, `docs/UX_VISUAL_DIRECTION.md`, and relevant current product context.

Do not treat merged renderer structure, historical mockups, component boundaries, existing CSS, or tests that merely assert visible text as design authority.

## Completion boundary

#314 is not complete again until the owner-visible UI is coherently recomposed around the recovered product intentions and is genuinely usable at default and `720×600` sizes without first-sight developer/admin clutter.

Do not activate a successor product issue before this acceptance gap is closed.