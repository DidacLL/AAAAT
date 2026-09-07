# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#217](https://github.com/DidacLL/AAAAT/issues/217) — synthesize the global shell/navigation from accepted Stage-1 through Stage-4 contracts.

Mission #204 replaces the additive-development presentation with one coherent product UX while preserving accepted functionality, privacy/security, local ownership, human/no-AI operation, document authority, and portability gates.

## Canonical UX authority

- `docs/UX_DEFINITION.md` — single durable UX/interaction contract.
- `docs/UX_VISUAL_DIRECTION.md` — subordinate visual-character reference only.
- `docs/UX_HISTORY_RECONCILIATION.md` — historical/research evidence only.

Stage-specific design contracts:

- Stage 1: `docs/UX_CANDIDATURE_INTERACTION.md`.
- Stage 2: `docs/UX_VCVGENERATOR_INTERACTION.md`.
- Stage 3: `docs/UX_PROFESSIONAL_INFORMATION_INTERACTION.md`.
- Stage 4: `docs/UX_SETTINGS_RECOVERY_INTERACTION.md`.
- Stage 5: `docs/UX_GLOBAL_SHELL_INTERACTION.md`.

Do not recreate competing current UX contracts. Direct Product Owner instruction remains above repository documents; `docs/OWNER_INTENT.md` and `docs/SPEC.md` remain product/architecture authority.

## Durable product hierarchy

The accepted shell synthesis defines three primary work destinations:

1. **Candidatures** — job/application work and local candidature search/capture.
2. **CVs & letters** — standalone and candidature-linked document work.
3. **Professional information** — reusable user-owned source content.

**Settings** is secondary administration, not a peer primary work destination.

Not global primary destinations: Focus, Sources, application material, ToDos/reminders, Concepts, Activity/provenance, privacy/presentation controls, AI, retained artifacts, variants, TeX, backup/recovery, provider connections, generic Documents, or generic Home/dashboard.

## Development sequence

### Stage 0 — Issue #205 — completed

Canonical UX authority/reconciliation. PR #206 merged at `bb6825f292bf2cafe3fdd630ff7a2ecef0fc409f`.

### Stage 1 — Issue #207 — completed

Candidature interaction contract. PR #208 merged at `43668e27c3951eadfab644e6d607d5ffd12704c5`.

### Stage 2 — Issue #209 — completed

VCVGenerator interaction contract. PR #211 merged at `91b2a4ce5a807da8c99864727e6c277803ea8d44`.

### Stage 3 — Issue #212 — completed

Reusable professional-information interaction contract. PR #214 merged at `f2a9c22d57916a2e0e3f08d250f87b012c6fa407`.

### Stage 4 — Issue #215 — completed

Settings/setup/recovery interaction contract. PR #216 merged at `b258b2f3633083e15daf3d5febf0998fec85a6b0`.

### Stage 5 — Issue #217: global shell/navigation synthesis — current

`docs/UX_GLOBAL_SHELL_INTERACTION.md` resolves the durable destination hierarchy and cross-context handoffs.

Key decisions:

- no generic dashboard/Home requirement;
- candidature retrieval search remains local to Candidatures rather than undefined universal search;
- candidature → CV/letter handoff preserves Candidature X and explicit return;
- CV/letter → Professional information handoff preserves the originating document and explicit return;
- contextual Settings handoffs preserve origin when practical;
- AI remains contextual, never shell navigation;
- global navigation protects dirty drafts without routine confirmation noise;
- at `720×600`, primary destinations remain labeled/reachable while the local work surface takes priority.

This Stage is design/documentation only. No production UI/CSS/React, persistence, routing-library, dependency, or design-system changes belong in #217.

### Stage 6 — implementation

After Stage 5 is accepted and merged, derive exactly one smallest coherent renderer implementation Issue from the accepted contracts.

Stage-6 renderer/shell work is **Class C** and requires:

- independent Reviewer assessment;
- Skeptical Simplifier assessment;
- packaged UX evidence at default and `720×600`;
- functional/privacy/security/local-ownership verification appropriate to changed surfaces.

Do not reopen information architecture during implementation absent a direct authority contradiction.

## Evidence to reuse

Integrated alpha acceptance PR #203 merged at `90b578064030ce863c9eb912f854f08559fd4777`. Existing package/runtime, security, backup/recovery, VS Code, Source retrieval, dirty-draft, TeX, and prior evidence remains reusable unless implementation changes the surface or premise it proved.

Stages 1–5 are documentation/design. Broad packaged visual verification belongs to Stage-6 implementation whose renderer surface it tests.

## North star

Users can retain job-related material without organizing it first, find and recall candidature context quickly, inspect/edit all important information, see application documents from their candidature, use CV/letter work independently, maintain reusable professional information without schema/variant ceremony, work completely without AI, configure secondary administration without it dominating the product, and inspect deeper ownership/privacy/provenance when desired.
