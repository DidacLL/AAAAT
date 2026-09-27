# Current mission — PLAN[2] “Send to my AI” product shape

Current explicit Product Owner instruction remains highest authority.

Base main: `c272615286abbe8fc0274b035cf8449d23bafb6e`.

Do not start PLAN[4] or PLAN[5]. PLAN[2] carrier/domain feasibility is demonstrated; the active work is the user-facing `Send to my AI` product shape in Issue #333.

## Achieved and actually demonstrated

- PR #326: direct job extraction through a real constrained model (`qwen2.5:0.5b-instruct` via Ollama). One target-scoped Role extraction was useful; broad four-field constrained-model usefulness remains partial after the demonstrated request timed out at AAAAT’s intended 15-minute ceiling.
- PLAN[2] local-computer host boundary: actually demonstrated with llama.cpp Web UI + Granite 4.1 3B. The external host originated the request, read bounded AAAAT candidature context, produced useful work, wrote one Source back, and the result was visible in normal AAAAT UI.
- PR #330 + Issue #329: no-local Markdown task/result carrier implemented and actually demonstrated with an external AI that could not access the local AAAAT computer. #329 is closed as carrier/domain evidence.
- PR #332: removed defensive AAAAT/security/transport prose from portable task payloads.

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

## Implemented since #333 — not yet accepted as the completed product journey

- PR #335: candidature-level `Send to my AI` editor; shipped editable Opportunity research and Interview preparation tasks; visible bounded context; Copy task; file export; pasted-result Source retention; file import; existing dirty-context safety. Verify/gate passed.
- PR #336: user-created reusable candidature task templates persisted in existing `workspace_metadata`; save/select/update/delete; one-off tasks still require no save. Verify/gate passed.

These two PRs are **implemented but only synthetically demonstrated**. They do not by themselves satisfy #333 acceptance.

A concrete drift remains from #335: the only visible entry point is still nested under the candidature `More` disclosure. This preserves the discoverability problem explicitly rejected by the Product Owner. Issue #338 is the bounded correction/evidence task.

PR #337 (reusable external-host guidance) was started prematurely by the orchestrator and is closed **without merge**. No #337 code is on main. Reusable host guidance remains required by #333, but its concrete artifact/UX must follow evidence from the corrected task interaction rather than be normalized speculatively.

## Current capability classification

- Direct bounded one-field constrained-model extraction: **implemented and actually demonstrated**.
- Broad/multi-field constrained-model usefulness: **partial**.
- External AI with local-computer/tool access: **implemented and actually demonstrated** at the carrier/domain boundary.
- External AI without local-computer access: **implemented and actually demonstrated** at the carrier/domain boundary.
- Specialized `External opportunity research` product UX: **superseded**.
- `Send to my AI` candidature editor and shipped editable tasks: **implemented but only synthetically demonstrated; discoverability correction pending #338**.
- User-created reusable candidature task templates: **implemented but only synthetically demonstrated**.
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

## Orchestration correction

The recovery orchestrator owns sequence, evidence and acceptance. It may execute small deterministic corrections directly, but substantial product implementation belongs in a bounded specialist task. Do not use the Product Owner as a transport layer for routine engineering. Do not spend scarce Codex/Copilot quota on deterministic setup/harness work.

## Next

Drive Issue #338 first. A bounded specialist should:

- make `Send to my AI` directly discoverable from the ordinary selected-candidature surface rather than only under `More`;
- preserve #335/#336 behavior without adding architecture;
- pass ordinary Verify/gate;
- demonstrate the corrected user-facing task concept in one real local-access host journey and one real no-local journey.

After #338 evidence, classify #333 again. Only then choose the smallest reusable host-guidance artifact/skill path and, separately, whether another context (career/document) is justified. Do not advance PLAN sequence until #333 is actually demonstrated, not merely implemented.