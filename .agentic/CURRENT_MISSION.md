# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#215](https://github.com/DidacLL/AAAAT/issues/215) — design Settings, setup, and recovery interaction before global shell synthesis.

Mission #204 replaces the additive-development presentation with one coherent product UX while preserving accepted functionality, privacy/security, local ownership, human/no-AI operation, document authority, and portability gates.

## Canonical UX authority

- `docs/UX_DEFINITION.md` — the **single durable UX/interaction contract** for this Mission.
- `docs/UX_VISUAL_DIRECTION.md` — direct Product Owner visual-character reference only. It is subordinate to the UX contract for hierarchy/interaction and does not define navigation, layout mechanics, components, tokens, or implementation structure.
- `docs/UX_HISTORY_RECONCILIATION.md` — historical/research evidence only; it cannot define current navigation or interaction mechanics.

Stage-specific design contracts refine one bounded journey without replacing `UX_DEFINITION.md`:

- Stage 1: `docs/UX_CANDIDATURE_INTERACTION.md`.
- Stage 2: `docs/UX_VCVGENERATOR_INTERACTION.md`.
- Stage 3: `docs/UX_PROFESSIONAL_INFORMATION_INTERACTION.md`.
- Stage 4: `docs/UX_SETTINGS_RECOVERY_INTERACTION.md`.

Do not recreate competing current UX-contract documents. Direct Product Owner instruction remains above repository documents; `docs/OWNER_INTENT.md` and `docs/SPEC.md` remain product/architecture authority.

## Product experience to preserve

- Candidature is the central context for job/application work; Sources are first-class retained material; Focus is the fast-recall projection.
- VCVGenerator is the major parallel journey and works both candidature-linked and standalone.
- Reusable professional information supports many documents/candidatures; variants/differences remain progressive.
- AI is contextual assistance, never primary navigation; provider administration belongs in secondary Settings.
- ToDos remain lightweight reminders, not a task-management pillar.
- Sparse candidature/professional information are normal.
- Workspace, backup/recovery, TeX, AI connections, portability, and host trust are important but secondary/infrequent administration.

## Development sequence

Advance one bounded stage at a time. Do not pre-create later Issues.

### Stage 0 — Issue #205 — completed

Established `docs/UX_DEFINITION.md`, reconciled UX authority/history, and recorded staged sequencing. PR #206 merged at `bb6825f292bf2cafe3fdd630ff7a2ecef0fc409f`.

### Stage 1 — Issue #207 — completed

`docs/UX_CANDIDATURE_INTERACTION.md` defines candidature collection/search, selection/context, Focus, complete information/editing, Sources, application material, contextual support, dirty-state safety, and default/minimum behavior. PR #208 merged at `43668e27c3951eadfab644e6d607d5ffd12704c5`.

### Stage 2 — Issue #209 — completed

`docs/UX_VCVGENERATOR_INTERACTION.md` defines standalone and candidature-linked document work, working documents versus retained exact artifacts, ordinary editing, optional variants/document differences, render/export, ownership/auditability, contextual AI, and responsive behavior. PR #211 merged at `91b2a4ce5a807da8c99864727e6c277803ea8d44`.

### Stage 3 — Issue #212 — completed

`docs/UX_PROFESSIONAL_INFORMATION_INTERACTION.md` defines sparse/read-first reusable professional information, built-in/custom information without schema administration, base → optional saved variation → document-specific difference ownership, VCVGenerator handoff/return, privacy/AI disclosure, dirty-state safety, and responsive behavior. PR #214 merged at `f2a9c22d57916a2e0e3f08d250f87b012c6fa407`.

### Stage 4 — Issue #215: Settings / setup / recovery UX — current

`docs/UX_SETTINGS_RECOVERY_INTERACTION.md` defines first-run local workspace entry; workspace switching; backup/restore/recovery; TeX capability/setup; AI connection administration; configuration portability; external-host trust boundaries; contextual handoffs from ordinary work; destructive/dirty-state safety; and usable default/minimum `720×600` behavior.

The key interaction decision is that Settings groups secondary administration by user intention and frequency. It is not a giant form, provider hierarchy, or primary work destination. First run establishes a usable local workspace without requiring AI or TeX.

This Stage is **design/interaction architecture only**. No production UI/CSS/React changes, persistence/provider architecture changes, global shell synthesis, or implementation belongs in #215.

### Stage 5 — global shell/navigation synthesis

After Stage 4 is accepted and merged, create exactly one bounded design Issue to synthesize the global shell/navigation from accepted Stages 1–4. Do not derive destinations from persisted entities/features.

### Stage 6 — implementation

Only after navigation/screen interaction contracts exist. Broad renderer reorganization is Class C and proceeds in the smallest coherent implementation slices with independent Reviewer, Skeptical Simplifier, packaged UX verification at default + `720×600`, and all functional/privacy/security/local-ownership gates preserved.

## Evidence to reuse

Integrated alpha acceptance PR #203 is merged at `90b578064030ce863c9eb912f854f08559fd4777`; Issue #202 is closed. Existing package/runtime, security, backup/recovery, VS Code, Source retrieval, dirty-draft, TeX, and prior visual evidence remains reusable unless later implementation changes the surface or premise it proved.

Stages 1–4 are design/documentation work. Do not repeat broad packaged audits merely because interaction contracts change. Packaged visual verification belongs to implementation work whose actual UI surface it tests.

## North star

The Mission succeeds when users can retain job-related material without organizing it first, find and recall candidature context quickly, inspect/edit all important information, see application documents from their candidature, use VCVGenerator independently, maintain reusable professional information without schema/variant ceremony, work completely without AI, configure secondary administration without it dominating the product, and inspect deeper ownership/privacy/provenance when desired.
