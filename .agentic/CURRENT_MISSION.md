# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#221](https://github.com/DidacLL/AAAAT/issues/221) — implement the accepted sparse candidature capture flow without changing candidature domain authority.

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
- Stage 6 / #219 — accepted global shell implementation; PR #220 merged at `63dbda8d31f60e16e0076f7cde6cdb6046d7a9a5`. Exact reviewed head `3df20e9f8a7bd4d63e13ef38ac46ad9f06713d9b` passed Fast verification, Windows/macOS/Linux packaged runtime, exact `720×600` Linux evidence, and Verification gate; independent Reviewer returned `MERGE` and Skeptical Simplifier returned `PASS`.

## Stage 7 — Issue #221: sparse candidature capture — current

The bounded implementation must:

- make `New candidature` open a transient local capture draft rather than persist an empty candidature immediately;
- keep the ordinary path as paste/add available raw material → Save;
- retain raw text and/or URL as the initial Source using the existing candidature creation contract;
- require no company, role, status, priority, AI, profile, CV, or completeness ceremony;
- preserve existing candidature drafts while capture is merely opened/cancelled, and require an explicit discard decision before a successful save replaces a dirty candidature editor;
- save exactly one candidature, select it, and return to Focus where the retained Source supplies sparse recognition;
- keep AI optional and manual/no-AI operation complete;
- remain usable at normal packaged size and exactly `720×600` without horizontal clipping.

This slice does **not** redesign the selected-candidature section hierarchy, persistence, fields, Sources, Concepts, ToDos, documents, AI/provider architecture, or global shell. Those remain separate bounded work when justified.

This work is **Class C**. Do not merge its PR without exact-head fast/relevant renderer verification, packaged Linux capture evidence at normal size and exactly `720×600`, required GitHub Verification gates, independent Reviewer assessment, and independent Skeptical Simplifier assessment.

## Evidence to reuse

Integrated alpha acceptance PR #203 merged at `90b578064030ce863c9eb912f854f08559fd4777`. Stage-6 shell evidence at `3df20e9f8a7bd4d63e13ef38ac46ad9f06713d9b` remains reusable where Stage 7 does not alter its premise.

## North star

Users can retain job-related material without organizing it first, find and recall candidature context quickly, inspect/edit important information and Sources, work with application documents in context or independently, maintain reusable professional information without schema/variant ceremony, work completely without AI, configure secondary administration without it dominating the product, and inspect deeper ownership/privacy/provenance when desired.
