# Current mission — PLAN[5] AAAAT visual identity recovery

Current explicit Product Owner instruction remains highest authority.

Base main: `3567959112625670bcfc31e9c3d35430f8f09518`.
Integrated PLAN[5] acceptance umbrella: #314.
Active implementation issue: #398.

The September 28 audits are not execution authority. PLAN[0]–PLAN[4] remain complete/retained. PLAN[5] remains active until #398 and final visual acceptance are complete.

## Accepted PLAN[5] work retained

- #380 / PR #382: direct structured New application and raw Source retention with explicit manual/AI continuations.
- #383 / PR #385: loaded Home as useful local landing console.
- #386 / PR #390: sparse/raw corpus recognition and selected Source visibility.
- #393 / PR #394: constrained shell keeps support surfaces subordinate to work.
- #395 / PR #402: Applications recognize/filter/inspect/collapse/Open model, contextual Tags, all-field selected application editing, AI field actions/failure handling, document-first CV work, landscape composition and compact navigation.

Do not reopen those interaction boundaries unless #398 exposes an actual regression.

## Active Product Owner correction — #398

The current desktop is usable but still does not fully express AAAAT's required visual identity.

The target is a restrained 1950s/atomic-age retrofuturist desk-console / workshop instrument:

- machine/chassis surfaces for shell, navigation, status and advanced controls;
- clean paper/dossier surfaces for applications, My information, Sources and document composition;
- retained AAAAT robot/artwork for orientation, loading and selected empty/onboarding moments;
- strong identity without sacrificing readability or productive density.

### Historical artwork

Inspect and deliberately integrate the retained artwork under `docs/owner-source/`:

- `AAAATlogo.png` / `AAAATlogolight.png`;
- `AAAATbg.png` / `AAAATbglight.png`;
- `AAAATloading.png` / `AAAATloadinglight.png`;
- banner variants and `AAAATART.png` only where they genuinely improve the product.

Current runtime incorrectly relies on one light-logo asset and a generic CSS background. Correct contextual light/dark asset pairing. Do not introduce a theme framework merely because paired assets exist.

### Material and visual hierarchy

Strengthen:
- mid-century industrial/atomic-age proportions;
- restrained machine labels/instrument metadata;
- inset chassis framing, seams/fasteners/indicator cues only where useful;
- warm cream paper, faded olive/sage, charcoal metal, oxidized copper/rust and desaturated teal;
- clear distinction between machine framing and paper/document content.

Avoid:
- generic SaaS/dashboard appearance;
- neon cyberpunk;
- tactical/military severity;
- scanlines/glitch overlays;
- heavy dirt/noise behind readable information;
- decorative gauges/screws everywhere;
- novelty body fonts;
- generic design-system rewrite.

### Typography and density

Preserve #395's compact navigation, landscape composition and reduced control weight.

Machine/navigation labels may carry restrained industrial character. Paper/application/CV content must remain highly readable.

Do not reintroduce implementation vocabulary or noisy schema labels into corpus cards.

### Scope boundary

This is a renderer/asset/style pass.

Do not change:
- schema/persistence/domain behavior;
- AI/provider semantics;
- #395 corpus interaction;
- contextual Tag ownership;
- document-domain ownership;
- routing/state architecture;
- dependencies unless strictly necessary for asset bundling;
- product workflows.

## Acceptance

Do not create or expand automated tests for this run.

Do not use literal wording, semantic-copy, DOM, CSS, class, snapshot or mocked tests as acceptance evidence. Tests never drive product development.

Existing CI may run only as incidental branch-protection/build hygiene. Do not change valid product behavior merely to satisfy stale tests.

Acceptance is:
1. independent production-code audit;
2. real rendered desktop inspection.

The implementation specialist is GitHub-connector-only and does not launch Electron or capture screenshots. After the exact implementation head is returned, the orchestrator owns rendered inspection. If no local runtime is available, use a temporary Actions evidence branch/workflow against that exact head to run the real Electron app and capture direct screenshots. That evidence branch must not alter product code, must contain no visual assertions/tests, and must not be merged as product implementation. Use normal development/demo/local data sufficient to inspect the real surfaces.

Rendered evidence must cover:
- first-run Welcome;
- startup/loading;
- loaded Home;
- Applications corpus and preselected card;
- selected application;
- My information;
- Working CV/document composition;
- Settings;
- constrained and wide landscape sizes.

The orchestrator owns the final audit/merge/classification. The Product Owner is not routine QA or a prompt courier.
