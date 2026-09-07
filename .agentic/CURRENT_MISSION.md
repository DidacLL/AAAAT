# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#219](https://github.com/DidacLL/AAAAT/issues/219) — implement the accepted global shell hierarchy and relocate rejected peer destinations without losing accepted capability.

Mission #204 replaces the additive-development presentation with one coherent product UX while preserving accepted functionality, privacy/security, local ownership, human/no-AI operation, document authority, and portability gates.

## Canonical UX authority

- `docs/UX_DEFINITION.md` — single durable UX/interaction contract.
- `docs/UX_CANDIDATURE_INTERACTION.md` — accepted candidature interaction contract.
- `docs/UX_VCVGENERATOR_INTERACTION.md` — accepted CV/letter interaction contract.
- `docs/UX_PROFESSIONAL_INFORMATION_INTERACTION.md` — accepted reusable professional-information contract.
- `docs/UX_SETTINGS_RECOVERY_INTERACTION.md` — accepted secondary Settings/setup/recovery contract.
- `docs/UX_GLOBAL_SHELL_INTERACTION.md` — accepted global shell/navigation contract.
- `docs/UX_VISUAL_DIRECTION.md` — subordinate visual-character reference only.
- `docs/UX_HISTORY_RECONCILIATION.md` — historical/research evidence only.

Direct Product Owner instruction remains above repository documents; `docs/OWNER_INTENT.md` and `docs/SPEC.md` remain product/architecture authority.

## Durable product hierarchy

Primary work destinations are exactly:

1. **Candidatures** — job/application work and local candidature search/capture.
2. **CVs & letters** — standalone and candidature-linked document work.
3. **Professional information** — reusable user-owned source content.

**Settings** is secondary administration, not a peer primary work destination.

Not global primary destinations: Focus, Sources, application material, ToDos/reminders, Concepts, Activity/provenance, privacy/presentation controls, AI, retained artifacts, variants, TeX, backup/recovery, provider connections, generic Documents, or generic Home/dashboard.

## Completed design stages

- Stage 0 / #205 — UX authority reconciliation; PR #206 merged at `bb6825f292bf2cafe3fdd630ff7a2ecef0fc409f`.
- Stage 1 / #207 — candidature interaction; PR #208 merged at `43668e27c3951eadfab644e6d607d5ffd12704c5`.
- Stage 2 / #209 — VCVGenerator interaction; PR #211 merged at `91b2a4ce5a807da8c99864727e6c277803ea8d44`.
- Stage 3 / #212 — reusable professional information; PR #214 merged at `f2a9c22d57916a2e0e3f08d250f87b012c6fa407`.
- Stage 4 / #215 — Settings/setup/recovery; PR #216 merged at `b258b2f3633083e15daf3d5febf0998fec85a6b0`.
- Stage 5 / #217 — global shell/navigation synthesis; PR #218 merged at `4e1fe7ee987fb87cd85cbfbdfe1e148de8f38a5b`.

## Stage 6 — Issue #219: first bounded implementation slice — current

PR #220 implements the accepted shell hierarchy without reopening product IA.

The bounded implementation must:

- expose only Candidatures, CVs & letters, and Professional information as primary work destinations;
- keep Settings consistently reachable but secondary;
- keep existing candidature AI assistance contextual under Candidatures;
- keep existing reminders/ToDos reachable as secondary candidature support rather than global navigation;
- keep existing AI document assistance contextual under CVs & letters;
- preserve existing professional-information capability under the ordinary-user shell label;
- keep workspace switching/recovery safe but secondary;
- preserve dirty-draft, first-run, manual/no-AI, privacy/security/local-ownership behavior;
- remain usable at normal packaged desktop size and exactly `720×600`;
- avoid new router/state/design-system/plugin frameworks or unrelated architecture.

This work is **Class C**. Do not merge PR #220 without exact-head evidence for:

1. relevant fast/renderer verification;
2. packaged runtime/UX at normal desktop size;
3. packaged runtime/UX at exactly `720×600`;
4. relevant dirty-draft, first-run/workspace, manual/no-AI, privacy/security/local-ownership regressions;
5. independent Reviewer assessment;
6. independent Skeptical Simplifier assessment;
7. required GitHub Verification gates.

If implementation reaches the independent-review gate, preserve the exact head and request those assessments rather than self-approving.

## Evidence to reuse

Integrated alpha acceptance PR #203 merged at `90b578064030ce863c9eb912f854f08559fd4777`. Existing security, backup/recovery, TeX, portability, source-retrieval, dirty-draft, and packaged-runtime evidence remains reusable unless #219 changes the surface or premise it proved.

## North star

Users can retain job-related material without organizing it first, find and recall candidature context quickly, inspect/edit all important information, see application documents from their candidature, use CV/letter work independently, maintain reusable professional information without schema/variant ceremony, work completely without AI, configure secondary administration without it dominating the product, and inspect deeper ownership/privacy/provenance when desired.
