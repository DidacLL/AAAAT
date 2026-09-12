# Current execution state

## Active bounded work

**Issue #313 — Product recovery: re-establish AAAAT interaction authority before further implementation**

Branch: `product/recover-aaaat-authority`

Exact base: `main` at `0c5e647c96a5e734957544c3c3cebc71bfeb1a50`

Pre-recovery active work is retired. Issue #304 is closed as superseded and PR #312 is closed unmerged. Do not reuse that branch/tranche as implementation authority.

## Mission

Re-establish one coherent current AAAAT product/interaction authority, then audit the repository against it before activating any new implementation slice.

The recovery model is:

- AAAAT is a local user-owned candidature/professional-information/application-document workspace, not a job-search engine, lifecycle tracker, reminder product or AI platform.
- There is no canonical journey. Focus/retrieval, raw capture, complete candidature work, standalone VCVGenerator, candidature-context document work, professional information, contextual AI/external AI, and setup are direct intentions.
- Focus has two states: corpus recognition first, then selected-candidature recall using the available screen. Focus shows only user-selected/default recall information and remains directly editable for displayed fields.
- Complete candidature editing is independently reachable and is not a mandatory continuation of Focus.
- Capture is raw-material-first and classification-light.
- Common fields are shipped defaults, not a closed ontology. The field model remains compatible with user-maintainable/custom fields.
- Use `Tags` consistently for the shared reusable keyword/glossary/wiki concept. Historical `Concepts` terminology is suspect implementation vocabulary to reconcile.
- No forced candidature lifecycle, priority, next-action or completeness machinery.
- Notes/checkable reminders are secondary candidature-attached conveniences only.
- VCVGenerator remains independently core and uses the same document system in standalone and candidature contexts.
- AAAAT owns no AI/inference; AI is optional bounded contextual assistance. External AI may be another entrance without redefining AAAAT around agent tooling.
- Local storage, Focus presentation and AI disclosure remain separate concerns.

## Current tranche

1. Reconcile `PRODUCT_DEFINITION.md`, `PRODUCT_CONTEXT.md` and `docs/UX_DEFINITION.md` with the recovered model.
2. Audit current product/technical docs, renderer/navigation, domain terminology, persistence representation and tests against that authority.
3. Classify existing behavior as preserve, rename/reframe, redesign, remove or defer.
4. Derive exactly one first implementation Issue from the highest-risk user-visible mismatch.
5. Do not implement renderer/schema changes on this branch unless required to make the authority/audit itself coherent.

## Constraints

- Existing implementation/tests/ADRs/issues are evidence, not requirements.
- Old Smart View/desktop UI solutions are explicitly discarded as design authority.
- Do not preserve work because it is already implemented.
- Do not invent a long successor roadmap.
- Do not ask the Product Owner routine engineering questions.
- Keep architecture small, local-first and appropriate for one developer.

## Completion criterion

This tranche is complete when a fresh GitHub implementation agent can read current authority documents and Issue #313 and correctly explain the complete AAAAT app without reconstructing old prompts/conversations, and one bounded implementation Issue is justified directly from the resulting audit.