# Optional local AI evaluation tooling

This repository retains a stochastic journey evaluator under `scripts/ai-journey-eval.mjs` and `test/ai-eval/`. It is development tooling, not ordinary AAAAT use, product authority or a CI acceptance gate. The current product-shaping loop is static typecheck/lint plus inspection of the real running application.

Use the desktop's **Settings → AI** and contextual actions to operate AAAAT normally. Do not run repeated model evaluations or repair historical scenarios merely to accompany a product change. The revised v2 request/document boundary needs a separately scoped evidence question before relying on this harness again.

## When an evaluation is deliberately needed

The launcher can compare explicitly configured compatible model endpoints over selected journeys and repetitions. It does not launch or manage the model server. Inventory comes from `test/ai-eval/catalog.mjs`; fixed scenario counts in documentation would become stale.

```text
npm run eval:ai
```

The interactive launcher asks for connection coordinates and selected journeys. Results remain local under ignored `ai-eval-results/`. Never commit credentials, real workspace data or transcripts. A harness failure, provider error and unhelpful model result are different outcomes; a green report does not establish product meaning or integration completeness.

The Windows launcher uses Node JavaScript entry points rather than spawning `.cmd` shims. Native packaging and MCP startup may be exercised by deliberately selected host journeys. AAAAT's own client/stub cannot substitute for a third-party assistant, and a synthetic compatible server cannot prove actual lightweight-model usefulness.

Evidence for the current refinement is recorded in [Current Mission](../.agentic/CURRENT_MISSION.md) and GitHub. Reuse applicable evidence; do not schedule a new benchmark simply because a commit changed.
