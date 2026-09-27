# Current mission — PLAN[2] “Send to my AI” product shape

Current explicit Product Owner instruction remains highest authority.

Base main: `dd7bf289245500822696bbdb5a15c6015bf38a7e`.

Do not start PLAN[4] or PLAN[5]. PLAN[2] external-host/carrier feasibility is already demonstrated. The active work is the user-facing `Send to my AI` product shape in Issue #333.

## Achieved and actually demonstrated

- PR #326: direct job extraction through a real constrained model (`qwen2.5:0.5b-instruct` via Ollama). One target-scoped Role extraction was useful; broad four-field constrained-model usefulness remains partial after the demonstrated request timed out at AAAAT’s intended 15-minute ceiling.
- PLAN[2] local-computer host boundary: demonstrated with llama.cpp Web UI + Granite 4.1 3B. The external host originated the request, read bounded AAAAT candidature context, produced useful work, wrote one Source back, and the result was visible in normal AAAAT UI.
- PR #330 + Issue #329: no-local Markdown task/result carrier implemented and demonstrated with an external AI that could not access the local AAAAT computer. #329 is closed as carrier/domain evidence.
- PR #332: removed defensive AAAAT/security/transport prose from portable task payloads.

These real-host results are durable evidence for the external boundary. Do **not** make the Product Owner repeat llama.cpp/no-local manual journeys after ordinary UI, wording, refactoring or task-editor changes that do not materially alter the context projection, external mutation or carrier boundary. Re-run representative external-host evidence only when a change actually changes one of those boundaries or introduces a genuinely new external capability.

Evidence hosts/models/carriers are fixtures only. llama.cpp, Granite, Markdown files and MCP are not product defaults or architecture authority.

## Current Product Owner direction — Issue #333

`External opportunity research` is superseded as a product concept. The intended interaction is contextual **Send to my AI**:

1. invoke it from a relevant AAAAT context;
2. choose a shipped or user-saved task;
3. edit the complete task instruction freely;
4. see the bounded local context separately;
5. use a connected/local route, clipboard, or file carrier as appropriate;
6. receive useful work from the external AI;
7. retain the result through a bounded AAAAT domain action.

Task instruction is user-owned. Local context projection and return mutation authority remain AAAAT-owned. Reusable host guidance is separate from individual task payloads.

## Implemented since #333

- PR #335: candidature-level `Send to my AI` editor; shipped editable Opportunity research and Interview preparation tasks; visible bounded context; Copy task; file export; pasted-result Source retention; file import; existing dirty-context safety. Verify/gate passed.
- PR #336: user-created reusable candidature task templates persisted in existing `workspace_metadata`; save/select/update/delete; one-off tasks still require no save. Verify/gate passed.

These behaviors are implemented and covered by ordinary automated verification. Their external boundary does not need to be manually re-proven because the same boundary was already demonstrated above.

One concrete UX drift remains from #335: the only visible `Send to my AI` entry point is still nested under the candidature `More` disclosure. This preserves the discoverability problem explicitly rejected by the Product Owner. Issue #338 is the bounded deterministic correction. Its acceptance is ordinary UI behavior + Verify/gate; it does not require another llama.cpp or no-local run.

PR #337 (reusable external-host guidance) was started prematurely by the orchestrator and is closed **without merge**. No #337 code is on main. Reusable host guidance remains required by #333, but its concrete artifact/UX must be chosen deliberately rather than normalized speculatively.

## Current capability classification

- Direct bounded one-field constrained-model extraction: **implemented and actually demonstrated**.
- Broad/multi-field constrained-model usefulness: **partial**.
- External AI with local-computer/tool access: **implemented and actually demonstrated** at the carrier/domain boundary.
- External AI without local-computer access: **implemented and actually demonstrated** at the carrier/domain boundary.
- Specialized `External opportunity research` product UX: **superseded**.
- `Send to my AI` candidature editor and shipped editable tasks: **implemented; discoverability correction pending #338**.
- User-created reusable candidature task templates: **implemented**.
- Reusable external-host skill/definition guidance separated from task payloads: **missing; #337 closed unmerged**.
- Reuse of the task model in another justified AAAAT context: **missing**.
- Setup/integration UX: **partial/scaffold**; raw executable/MCP configuration is not accepted ordinary-user setup.
- PLAN[3]: retained.
- PLAN[4] rendering/portable/immutable artifact infrastructure: **implemented and actually demonstrated** as infrastructure; ADR-0015 package design remains incomplete.
- PLAN[5]: blocked.

## Architecture boundaries

Preserve existing privacy projections, AI visibility choices, bounded external mutations, Source retention, local workspace ownership and manual/no-AI completeness.

Do not build a generic workflow engine, task queue, provider marketplace, host registry, agent planner, permission framework, generic CRUD API, or host-specific architecture. A small user-maintainable task-template set is product data, not an orchestration platform.

The older JSON `applicationHandoff` (`sourceText + outputs`) remains a separate mechanism and is not the `Send to my AI` product model. OpenAI-compatible remains an implementation adapter only.

## Orchestration contract

The recovery orchestrator owns sequence, scope, evidence reuse and acceptance. It may execute small deterministic corrections directly. Substantial product implementation belongs in a bounded specialist task. Do not use the Product Owner as a transport or QA layer for routine engineering. Do not spend scarce Codex/Copilot quota on deterministic setup, harness or small UI work.

Automated verification protects ordinary implementation behavior. Manual/real-environment evidence is a scarce boundary check, not a gate to repeat after each implementation increment.

## Next

1. Complete #338 as a narrow deterministic correction: make `Send to my AI` directly discoverable from the ordinary selected-candidature surface, preserve #335/#336 behavior, and pass Verify/gate. No Product Owner manual QA and no repeated external-host run.
2. Reassess the two genuinely remaining #333 product gaps: reusable external-host guidance separated from task payloads, and reuse of the task model in another justified context. Choose the smallest product-shaped slices; do not invent frameworks.
3. Once those product gaps are settled, classify PLAN[2] using the already-demonstrated host/carrier evidence plus ordinary implementation verification. Do not manufacture another acceptance matrix.
