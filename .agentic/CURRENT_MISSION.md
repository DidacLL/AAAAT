# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#233](https://github.com/DidacLL/AAAAT/issues/233) — implement the accepted contextual handoffs and exact return paths between existing work areas.

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
- Stage 6 / #219 — accepted global shell implementation; PR #220 merged at `63dbda8d31f60e16e0076f7cde6cdb6046d7a9a5` after full packaged verification and exact `720×600` Linux evidence.
- Stage 7 / #221 — sparse candidature capture; PR #222 merged at `c5d7c5aaf20c909ff268198662452e22dca60469`; Verify #494 passed the selected fast/package gates and exact `720×600` sparse capture/Focus evidence.
- Stage 8 / #223 — selected candidature local hierarchy; PR #224 merged at `c986b9731077591756250384516b5496b319e963`; Verify #499 passed selected fast/Linux package gates and exact `720×600` local-navigation evidence.
- Stage 9 / #225 — compact candidature collection/selected transition; PR #226 merged at `50b6e133d8bc415e941f2a380582801c09a9b840`. Code head `56f89f829ebd3ceef6390cd4c1bb2943301eb176` passed Verify #501 including Fast verification, Windows/macOS/Linux packaged runtime, exact `720×600` selected/collection behavior, query/archive preservation, and zero horizontal overflow. The Issue was corrected to Class B because it was bounded local UX composition under `.agentic/DECISION_POLICY.md`.
- Stage 10 / #227 — CVs & letters local composition; PR #228 merged at `1620f38636942fc6dd50ec9d099feab6fa9c2a35`. Exact code head `8d0a41ddd1ac9d1c5ec31e357d363a067c3f3660` passed Verify #506 including Fast verification, Windows/macOS/Linux packaged runtime, aggregate Verification gate, exact `720×600` document collection/selected transitions and local intentions with zero horizontal overflow, plus `1200×800` collection-and-selected continuity.
- Stage 11 / #229 — Professional information local composition; PR #230 merged at `bc54c4060ed213d17593c50f29afa1f41354ac07`. Exact code head `bf4ec70cb878317e652674eef48696ade55e9733` passed Verify #512 after an infrastructure-only Linux retry, including Fast verification, Windows/macOS/Linux packaged runtime, aggregate Verification gate, and exact `720×600` Professional information overview/item-editor/Saved-variations evidence with zero horizontal overflow.
- Stage 12 / #231 — Settings local composition; PR #232 merged at `ed372dacad18393e842b0ffe9e9769629d11002f`. Exact code head `307fe1a159efeb60e98f706e09e1a2c25d5e8f17` passed Verify #514 including Fast verification, Windows/macOS/Linux packaged runtime, aggregate Verification gate, and exact `720×600` Settings overview/AI-add/rendering/portability/return evidence with zero horizontal overflow.

## Stage 13 — Issue #233: contextual handoff integration — current

The bounded implementation must complete the already-accepted cross-context flows without reopening IA:

- Candidature X application material can open an associated CV/letter in the shared **CVs & letters** destination, or start new CV/letter work for that candidature;
- document work shows explicit candidature context and a labeled return that restores the originating candidature surface;
- document Professional information can open the contributing reusable source item in the shared **Professional information** destination and return to the same document;
- document rendering failure can enter **Settings / Document rendering** directly and return to the same document;
- an existing optional-AI action that fails because assistance is unavailable can offer **Settings / AI connections** and return to the originating work context;
- contextual visits preserve mounted origin state when safe rather than inventing persisted navigation history or unnecessary discard prompts;
- dirty drafts are never silently destroyed; workspace switching and destructive local transitions retain their existing explicit protections;
- exact `720×600` keeps contextual cues and return actions labeled/reachable with vertical scrolling and no horizontal clipping.

Implementation is limited to the smallest App/renderer coordination needed for these concrete flows. No router, generic history stack, event bus, global state library, persistence schema, service-authority change, provider semantic change, or new dependency is authorized.

This work is **Class C** because it intentionally coordinates multiple accepted destinations. Merge requires focused renderer tests, packaged Linux cross-context evidence at normal size and exactly `720×600`, selected GitHub Verification gates, and independent exact-head Reviewer `MERGE` plus Skeptical Simplifier `PASS`.

## Evidence to reuse

Integrated alpha acceptance PR #203 merged at `90b578064030ce863c9eb912f854f08559fd4777`. Stage-6 shell, Stage-7–9 candidature, Stage-10 CV/letter, Stage-11 Professional information, and Stage-12 Settings evidence remain reusable where Stage 13 does not alter their premises.

## North star

Users can retain job-related material without organizing it first, find and recall candidature context quickly, inspect/edit important information and Sources, work with application documents in context or independently, maintain reusable professional information without schema/variant ceremony, work completely without AI, configure secondary administration without it dominating the product, and move between contextual work surfaces without losing orientation or drafts.
