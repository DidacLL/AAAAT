# Current execution state

## Active integrated recovery

PR #319 remains open and unmerged on `product/dogfood-workspace-ai-context`.

The accepted engineering head after the document-domain pass is `65ce825adc17f19d9e10a2c5fc80a90d57dc2cb8`.

This is still product interaction architecture recovery, not deployment polish.

## Product authority

Read authority in `AGENTS.md` order. Current `PRODUCT_DEFINITION.md` and `docs/UX_DEFINITION.md` contain the settled product model. Existing schema, tests and visible UI are implementation evidence only when they conflict with that model.

AAAAT has no canonical workflow. Applications, reusable professional information, reusable CV/document work and Settings are direct peer intentions.

## Accepted work to preserve

Do not regress:

- sparse applications, Sources/raw capture and manual/no-AI use;
- flexible user-maintainable application information;
- shared Tags with scalable attach/search/create/edit interaction and reviewed AI Tag proposals;
- the single persistent `AI may use this information` permission across application fields, professional information and career-context information;
- Opportunity Review using the same permission model with projected-context preview;
- AI reliability, operation validation, provider diagnostics, inspectable exchanges and bounded prompt/context behavior;
- demo workspace/reset, local ownership and backup/recovery;
- the corrected document domain now present at the accepted head:
  - item-level profile variants;
  - section-based CV templates with current/variant/override/custom sources;
  - editable Working CVs with explicit ownership actions;
  - separate immutable Rendered CV snapshots;
  - application-owned cover letters;
  - Application packets;
  - visible Templates / Rendered CVs / Letters / Application packets collections;
  - no generic `documents`, CV descriptor, document external-access, permanent PDF-tab or raw-path UI architecture.

Routine PR CI is intentionally lightweight: dependency install plus TypeScript typecheck. Focused tests are evidence for changed behavior where useful. Full package/LaTeX/cross-platform verification remains acceptance/release evidence, not an iterative implementation gate.

## Current owned area: persistent rail + Settings

Recompose the loaded-workspace shell so environment state is continuously legible without duplicating it in Home.

The persistent rail must appear on Home, Applications, CVs, My information and Settings and own three compact statuses:

- **Data: Demo / Local** from the actual loaded workspace;
- **AI: Off / Ready / Needs attention**;
- **PDF: Ready / Unavailable**.

`AI: Off` means no configured connection. `AI: Ready` means configured AI has a usable validated route for supported AAAAT assistance. `AI: Needs attention` covers configured-but-not-usable state such as invalid/unreadable configuration, missing usable validation/default routing, or a failed/unreachable configured connection surfaced by the existing validation flow. Do not equate merely having a saved connection with Ready.

Do not add a monitoring framework. Derive this compact projection from the existing workspace/setup/AI connection state and refresh it after relevant Settings changes or validation results.

Home must stop duplicating these environment badges and must not introduce a competing `Open demo` / `Applications` primary workflow CTA. Navigation already lives in the rail.

Settings must become a conventional compact tabbed surface with one unmistakably active panel. The product tabs are:

- **Workspace**
- **AI**
- **Documents**
- **Backup**

Map existing capabilities into those four tabs instead of preserving the current launcher/overview, `Backup & recovery`, `Document rendering`, and `External assistants & portability` as peer destinations.

Expected ownership:

- Workspace: current workspace, create/open/switch, demo/local identity, destructive workspace reset/delete where appropriate;
- AI: connection editing, endpoint/model validation, operation capability state, prompt transparency and AI setup portability;
- Documents: PDF/TeX readiness and practical rendering setup/status; advanced portable document-project concerns only if still justified;
- Backup: create/restore workspace backup and recovery.

Bounded external-assistant setup is secondary configuration. Keep meaningful host-agnostic capability setup where it still serves the product, but do not make it a fifth top-level Settings destination or let MCP/assistant vocabulary dominate normal configuration.

An invalid AI endpoint must show a concrete inline error beside the endpoint/control. A saved but unreachable/incompatible configuration must remain a valid saved connection while the rail reports `AI: Needs attention`; do not collapse connection reachability and per-operation capability validation.

Keep the established compact worn physical-console / paper-dossier visual direction. Do not replace the launcher with four oversized cards; use tabs and one active content panel.

Do not change the accepted document, Tag or AI-permission domain models in this pass except for minimal status-refresh/API integration.

## Next after rail + Settings acceptance

1. Audit this shell/Settings pass and correct only material gaps.
2. Independent final product/architecture audit of PR #319.
3. Owner natural-use acceptance on a fresh packaged Windows candidate.
4. Only after owner acceptance, run impact-appropriate Windows regression plus Linux/macOS/release verification.

Never merge PR #319 during this recovery.