# Current execution state

## Active bounded work

**Issue #313 — Product recovery: re-establish AAAAT interaction authority before further implementation**

Branch: `product/recover-aaaat-authority`

Exact base: `main` at `0c5e647c96a5e734957544c3c3cebc71bfeb1a50`

Pre-recovery active work is retired. Issue #304 is closed as superseded and PR #312 is closed unmerged. Do not reuse that branch/tranche as implementation authority.

## Recovered product authority

Current authority now defines AAAAT as a local user-owned candidature/professional-information/application-document workspace with multiple direct intentions rather than one workflow.

Key recovered constraints:

- Focus is one two-state rapid-retrieval experience: corpus recognition first, then selected-candidature recall using the available screen.
- Focus shows a deliberately selected subset of information and is editable for displayed fields; it is not a dump of Sources/documents/reminders/activity.
- Complete candidature editing is independently reachable and is not a mandatory continuation of Focus.
- Capture is raw-material-first and classification-light.
- Common fields are shipped defaults, not a closed ontology; the model remains compatible with user-maintainable/custom fields.
- Use `Tags` consistently for the shared reusable keyword/glossary/wiki object. Historical `Concepts` terminology is implementation drift to remove.
- No forced candidature lifecycle, priority, next-action or completeness machinery.
- Notes/checkable reminders are secondary candidature-attached conveniences only.
- VCVGenerator remains independently core and uses the same document system standalone or in candidature context.
- AAAAT owns no AI/inference; AI is optional bounded contextual assistance. External AI may be another entrance without redefining AAAAT around agent tooling.
- Local storage, Focus presentation and AI disclosure are separate concerns.

## Recovery audit result

Preserve where independently justified:

- top-level Candidatures / CVs & letters / Professional information with secondary Settings;
- local workspace ownership and first-run create/open;
- flexible candidature values and first-class Sources;
- useful search semantics;
- VCVGenerator independence and candidature handoffs;
- bounded contextual AI/manual-no-AI behavior;
- dirty-state protection and narrow privileged boundaries.

Highest-risk redesign:

- current Candidatures auto-selects a record and places Focus inside that selected record;
- corpus is reduced to a permanent sidebar;
- first-sight field filtering exposes implementation machinery;
- current Focus defaults Sources, `Concepts`, reminders, documents and Activity into the recall surface and lacks direct field editing;
- capture still exposes dedicated title/URL assumptions and forces a post-save selected-detail path;
- `Concept` survives throughout schema/contracts/services/renderer/tests;
- Reminders retain more shell/Focus prominence than the product justifies.

Known later drift, not yet activated as another work item:

- professional information still uses a closed ten-value `ProfileItemKind` taxonomy;
- pre-user migration/compatibility machinery still needs re-evaluation independently of retired #304/#312.

## Next bounded implementation

**Issue #314 — Rebuild Candidatures around two-state Focus, raw capture, direct editing and Tags.**

Do not start #314 until the product-recovery authority change from #313 is merged into `main`. Then start from that exact resulting `main`; do not reuse a pre-recovery branch.

No renderer/schema implementation belongs on `product/recover-aaaat-authority`.

## Completion criterion for #313

The recovery tranche is complete when its authority changes are merged and a fresh implementation agent can read current Product Definition, Product Context, UX Definition, Current Mission and Issue #314 and correctly understand the candidature redesign without reconstructing old prompts/conversations.