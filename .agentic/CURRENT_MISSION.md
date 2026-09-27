# Current mission — PLAN[2] “Send to my AI” product shape

Current explicit Product Owner instruction remains highest authority.

Base main: `a0615293de8af4108e2c44e1a25c5d6b64a5a0ed`.

Do not start PLAN[4] or PLAN[5]. The remaining PLAN[2] work is no longer transport proof; both representative external-AI environments have been demonstrated. The active product gap is the user-facing external-AI task model in Issue #333.

## Achieved and actually demonstrated

- PR #326: direct job extraction exercised through a real constrained model (`qwen2.5:0.5b-instruct` via Ollama). One target-scoped Role extraction was useful; broad four-field constrained-model usefulness remains partial because the demonstrated request timed out at AAAAT’s intended 15-minute ceiling.
- PR #328: restored the selected-candidature external-AI authorization surface and dirty-state revocation. This code is mechanism/scaffold evidence now, not accepted final UX.
- PLAN[2] local-computer external host: demonstrated with llama.cpp Web UI + Granite 4.1 3B. The external host originated the work, read AAAAT context through bounded tools, produced useful reasoning, wrote a Source back, and the result was visible in normal AAAAT UI.
- PR #330 + Issue #329: no-local portable task/result carrier implemented and then demonstrated with an external AI that had no access to the local AAAAT computer. The returned Markdown result imported successfully. #329 is closed as completed transport/journey evidence.
- PR #332: removed defensive implementation framing from the current exported task and related wording. This improves the scaffold but does not make the specialized opportunity-research UX acceptable.

Evidence hosts/models/carriers are fixtures only. llama.cpp, Granite, Markdown files and MCP are not product defaults or architecture authority.

## Current Product Owner direction — Issue #333

The current `External opportunity research` concept is rejected as the final product surface. It is too specialized, hidden and explanation-heavy.

Replace it with a contextual **Send to my AI** interaction.

The intended product model is:

1. From a candidature, career-information/document context, or another justified local context, the user chooses **Send to my AI**.
2. AAAAT opens a task editor.
3. The editor loads a shipped task template appropriate to that context, for example opportunity research, career-path/role adequacy, CV evaluation/tailoring or another useful task.
4. The complete task instruction is visible in ordinary editable text and may be changed freely before sending/exporting.
5. The user may choose another shipped template and may save/add their own reusable task templates.
6. AAAAT supplies the relevant user-approved local context separately from the task instruction.
7. The task is sent/exported through an available external-AI route.
8. Returned useful work is retained through an appropriate bounded AAAAT domain action.

### Task text versus local authority

Do not conflate these layers:

- **Task instruction:** user-owned and fully editable.
- **Local context projection:** AAAAT-owned, privacy-aware and appropriate to the current task/context.
- **Return mutation:** AAAAT-owned and bounded to legitimate domain actions.

User freedom to edit the task does not imply generic database/filesystem/shell authority.

### Reusable external-host guidance

Provider/host UX is not only transported task files or exposed tools.

AAAAT should provide reusable skills/definitions/host guidance for external AI environments, especially hosts without local-computer access. That reusable material explains how to work with AAAAT and how returned material is handled.

It is separate from individual task payloads. A task should contain only its own concerns plus relevant user-approved context. Do not repeatedly inject AAAAT architecture, local IDs, MCP vocabulary, filesystem/database warnings or defensive implementation explanations into every task.

Where a host supports reusable skills/instructions, use that mechanism when justified. Where it does not, a concise reusable instruction artifact is sufficient. Do not turn a demonstrated host into AAAAT architecture.

## Current capability classification

- Direct bounded one-field constrained-model extraction: **implemented and actually demonstrated**.
- Broad/multi-field constrained-model usefulness: **partial**.
- External AI with local-computer/tool access: **implemented and actually demonstrated** at the carrier/domain boundary.
- External AI without local-computer access: **implemented and actually demonstrated** at the portable-carrier/domain boundary.
- Current specialized `External opportunity research` UX: **superseded by explicit Product Owner direction** as final UX; retain only useful implementation pieces.
- General editable `Send to my AI` task UX: **missing**.
- Shipped editable task templates: **missing**.
- User-created reusable task templates: **missing**.
- Reusable external-host skills/definitions separated from task payloads: **missing**.
- Setup/integration UX: **partial/scaffold**; current technical MCP/executable configuration is not accepted ordinary-user setup.
- PLAN[3]: retained.
- PLAN[4] rendering/portable/immutable artifact infrastructure: **implemented and actually demonstrated** as infrastructure; ADR-0015 document-package design remains incomplete.
- PLAN[5]: blocked.

## Architecture boundaries

Preserve useful existing mechanisms without normalizing their current UX:

- existing privacy projections and AI visibility choices;
- bounded external mutations instead of generic CRUD;
- Source retention/search/activity behavior;
- local workspace ownership;
- MCP/file carriers where they fit a host;
- manual/no-AI completeness.

Do not build a generic workflow engine, task queue, provider marketplace, host registry, agent planner, generic permission framework or generic CRUD API. A small user-maintainable set of task templates is product data, not justification for an orchestration framework.

ADR 0025 remains useful evidence for bounded task-specific projection/mutation semantics and already anticipated future user-defined tasks. Its one `opportunity_research` task and selection UI are not authority for the final product surface after the owner direction in #333.

## Known debt / drift

- PR #319 removed VS Code setup and external CV description/content/render capabilities. Do not restore them automatically; evaluate only where #333 or later document work requires a concrete capability.
- The older JSON `applicationHandoff` (`sourceText + outputs`) remains a separate mechanism and is not the `Send to my AI` product model.
- OpenAI-compatible remains an adapter only, not provider/product authority.
- Scarce Codex/Copilot quotas must not be spent on deterministic setup/harness work that the orchestrator can execute directly.

## Next

Drive Issue #333 from UX/domain shape first. Inspect the existing candidature panel, task projection services, MCP operations, portable file carrier and AI privacy model, then define the smallest coherent implementation that:

- introduces the contextual `Send to my AI` editor;
- supports shipped editable task templates and user-created reusable templates;
- cleanly separates task instruction from context projection;
- reuses current local-host and no-local carriers behind the same user-facing task concept;
- provides one reusable host-skill/definition path without embedding host explanations in every task;
- migrates/removes the specialized opportunity-research product surface without weakening privacy or bounded mutation authority.

Do not advance sequence until that product shape is implemented and demonstrated in both a local-access and no-local external host journey.