# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#225](https://github.com/DidacLL/AAAAT/issues/225) — implement the accepted minimum-size candidature collection/selected transition.

Mission #204 replaces additive-development presentation with one coherent product UX while preserving accepted functionality, privacy/security, local ownership, human/no-AI operation, document authority, and portability gates.

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

Focus, Sources, application material, reminders, Concepts, Activity/provenance, privacy/presentation controls, AI, variants, TeX, recovery, provider connections, generic Documents, and generic Home/dashboard are not global primary destinations.

## Completed stages

- Stage 0 / #205 — UX authority reconciliation; PR #206 merged at `bb6825f292bf2cafe3fdd630ff7a2ecef0fc409f`.
- Stage 1 / #207 — candidature interaction; PR #208 merged at `43668e27c3951eadfab644e6d607d5ffd12704c5`.
- Stage 2 / #209 — VCVGenerator interaction; PR #211 merged at `91b2a4ce5a807da8c99864727e6c277803ea8d44`.
- Stage 3 / #212 — reusable professional information; PR #214 merged at `f2a9c22d57916a2e0e3f08d250f87b012c6fa407`.
- Stage 4 / #215 — Settings/setup/recovery; PR #216 merged at `b258b2f3633083e15daf3d5febf0998fec85a6b0`.
- Stage 5 / #217 — global shell/navigation synthesis; PR #218 merged at `4e1fe7ee987fb87cd85cbfbdfe1e148de8f38a5b`.
- Stage 6 / #219 — accepted global shell implementation; PR #220 merged at `63dbda8d31f60e16e0076f7cde6cdb6046d7a9a5` after exact-head Reviewer `MERGE`, Simplifier `PASS`, full packaged verification, and exact `720×600` Linux evidence.
- Stage 7 / #221 — sparse candidature capture; PR #222 merged at `c5d7c5aaf20c909ff268198662452e22dca60469`. Exact reviewed head `cb341e18f338fd99a09d44431d4adab6aaf5bbe0` passed Verify run #494 including Fast verification, Windows/macOS/Linux packaged runtime, sparse capture/Focus evidence, exact `720×600` Linux evidence, and Verification gate; independent Reviewer returned `MERGE` and Skeptical Simplifier returned `PASS`.
- Stage 8 / #223 — selected candidature local hierarchy; PR #224 merged at `c986b9731077591756250384516b5496b319e963`. Exact reviewed head `3ccbffca9a6d6896f5aec5832f826b0be272d732` passed Verify run #499 including Fast verification, Linux packaged runtime, exact `720×600` local-navigation evidence, and Verification gate; independent Reviewer returned `MERGE` and Skeptical Simplifier returned `PASS`.

## Stage 9 — Issue #225: minimum-size candidature transition — current

The bounded implementation must:

- preserve the accepted wide desktop collection + selected-candidature composition where space permits;
- at compact/minimum candidature width, present one principal state at a time: **collection/search** or **selected candidature**;
- enter compact candidature work through collection/search even when a record is internally selected for wide-layout continuity;
- open the selected candidature state after deliberate selection or successful sparse capture;
- keep candidature identity and the four accepted local intentions visible/reachable in selected compact context;
- provide a labeled route back to collection/search while preserving query/filter/archive state;
- preserve dirty drafts when returning to collection because that presentation transition does not destroy the selected candidature state, while retaining existing guards for real destructive boundaries;
- keep exact `720×600` content readable, vertically scrollable, keyboard reachable, and free of horizontal clipping.

This slice does **not** redesign search/filter semantics, result identity, sparse capture, selected-candidature hierarchy, VCVGenerator, professional information, Settings, persistence/domain authority, fields, Concepts, reminders, provider architecture, or global shell.

This work is **Class B** local UX composition under `.agentic/DECISION_POLICY.md`. Merge requires focused renderer verification, packaged Linux state-transition evidence at normal size and exactly `720×600`, and the selected GitHub Verification gates. Independent Reviewer/Simplifier assessment is not a mandatory gate unless review raises the change to Class C significance.

## Evidence to reuse

Integrated alpha acceptance PR #203 merged at `90b578064030ce863c9eb912f854f08559fd4777`. Stage-6 global-shell, Stage-7 sparse-capture, and Stage-8 selected-hierarchy evidence remain reusable where Stage 9 does not alter their premises.

## North star

Users can retain job-related material without organizing it first, find and recall candidature context quickly, inspect/edit important information and Sources, work with application documents in context or independently, maintain reusable professional information without schema/variant ceremony, work completely without AI, configure secondary administration without it dominating the product, and inspect deeper ownership/privacy/provenance when desired.
