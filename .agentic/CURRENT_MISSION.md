# Current mission — close PLAN[2] no-local acceptance

Current explicit Product Owner instruction remains highest authority.

This mission continues the recovery sequence after the authority correction in PR #325 and the evidence/implementation work that followed. The repository is no longer at the earlier “choose a PLAN[2] journey” checkpoint: one representative local-computer external-AI journey is actually demonstrated, and the bounded no-local carrier is implemented. The remaining immediate gate is the real no-local-computer acceptance journey.

Base main: `ce1c1530a985342f0d0f552f69c90d5ae7dc56ad` (PR #330 merged).

Do not start PLAN[4] or PLAN[5] until this PLAN[2] acceptance gate is classified honestly.

## Achieved and actually demonstrated

- Recovery authority/state correction and truthful TeX rendering self-test from PR #325 remain in force.
- Direct AAAAT AI: PR #326 exercised the production job-extraction path through a real constrained model (`qwen2.5:0.5b-instruct` via Ollama). A target-scoped one-field Role request produced useful accepted output while AAAAT rejected bad sibling material through existing local validation/salvage. This is real-model usefulness evidence for that bounded case, not proof that every current-field/broad extraction request is useful.
- The provider transport defect exposed by that evidence was corrected so AAAAT’s configured timeout, not Node/Undici’s shorter parser timeout, is authoritative. The ordinary four-field request still failed to produce a model response within AAAAT’s 15-minute ceiling; do not overclaim broad constrained-model usefulness.
- PR #328 restored the real user-controlled `External opportunity research` authorization UI and dirty-state revocation behavior for the selected candidature.
- PLAN[2] local-computer third-party host: actually demonstrated using llama.cpp Web UI + Granite 4.1 3B. The journey originated in the external host, called AAAAT’s bounded `opportunity_research_context_read`, produced useful external reasoning, called `candidature_source_add`, and the returned Source was visible in normal AAAAT UI. llama.cpp/Granite are evidence fixtures, not product architecture or defaults.
- PR #330 implements the no-local portable carrier for the same ADR-0025 task: readable Markdown export of the existing bounded selected-candidature projection and selector-free Markdown/text import through the existing Source-only mutation. Verify run `36305537889` passed ordinary verification and the Verification gate.

## Immediate missing acceptance

Issue #329 remains open only for the real no-local-computer journey:

1. packaged/current AAAAT selects and authorizes one candidature;
2. AAAAT exports the bounded opportunity-research task file;
3. an external AI environment with no local-machine access receives only that file and performs substantive work beyond copying it;
4. the external AI returns a UTF-8 Markdown/text file;
5. AAAAT imports that file through `Import external AI result…` with no candidature selector/ID from the external side;
6. the returned Source is verified in normal AAAAT UI.

The intended next acceptance host may be this ChatGPT conversation because it has no access to the user’s local AAAAT workspace. Host choice is evidence only and must not become AAAAT architecture.

If this journey succeeds, close #329 and classify the no-local PLAN[2] boundary as **implemented and actually demonstrated**. Then reassess whether any remaining recovery debt is a PLAN[2] blocker before advancing sequence.

## Current capability classification

- Direct bounded job extraction with one real lightweight/constrained model: **implemented and actually demonstrated** for the target-scoped one-field case.
- Broad/multi-field constrained-model usefulness: **partial**; the demonstrated four-field request timed out at AAAAT’s intended ceiling.
- PLAN[2] external AI with local-computer/tool access: **implemented and actually demonstrated** through llama.cpp + Granite over the bounded MCP task.
- PLAN[2] no-local portable carrier: **implemented but not yet actually demonstrated end-to-end**; real external-host acceptance pending in #329.
- ADR-0025 selected-candidature opportunity-research read + Source-only return semantics: **implemented and actually demonstrated** on the local-host path; portable no-local carrier shares the same projection/mutation boundary.
- Setup/integration UX: **partial/scaffold**. Current host use still exposes technical setup/mechanics; no representative setup experience has been accepted as the ordinary user path.
- `installer.ai` / `configurator.ai`: useful bounded mechanisms exist, but representative real setup usefulness remains **partial/scaffold** unless separately demonstrated.
- PLAN[3]: retained.
- PLAN[4] real rendering/portable/immutable artifact infrastructure: **implemented and actually demonstrated** as infrastructure. The owner-approved LaTeX2e public API + expl3 internals + user-owned editable blueprint/package-source design remains **partial/missing** and requires the owner-paired design phase preserved by ADR 0015.
- PLAN[5]: blocked.

## Known debt / drift still to resolve

- Do not restore VS Code integration merely because PR #319 removed it. The local-host proof shows the bounded MCP task works in a real host, but ordinary host setup remains too technical. Recover the user setup intention before choosing any host-specific setup work.
- PR #319 also removed external CV description/content/render capabilities. Their removal is historical evidence, not proof that the broader external-document contribution intention is obsolete. Reassess against current Product Definition/ADR 0015 when the sequence reaches the relevant document work; do not revive them automatically.
- The older JSON `applicationHandoff` carrying `{ sourceText, outputs }` remains a mechanism for creating application material. It is not PLAN[2] external-AI acceptance and must not be used as evidence for useful completed external work.
- The new portable no-local carrier is intentionally one carrier for one named task, not a generic handoff/result framework. Do not generalize it pre-emptively.
- Setup probes/status surfaces and raw executable/MCP guidance are not equivalent to a completed user setup journey.
- The direct AI provider remains OpenAI-compatible as an implementation adapter only; do not turn that protocol into product/provider authority.
- Scarce Codex/Copilot quotas are not to be spent on deterministic setup/harness work. The orchestrator should execute narrow GitHub/code actions directly and use specialists only where substantial autonomous work is justified.

## Orchestrator execution contract

The orchestrator owns sequence, acceptance and repository state.

- Inspect actual implementation/evidence before issuing work.
- Execute small bounded fixes/actions directly; do not use the Product Owner as a transport layer for routine engineering.
- Do not convert an evidence host/model/carrier into project architecture.
- Mechanism tests prove only the mechanism they exercise.
- Do not close #329 or PLAN[2] from export/import unit tests alone; require the real no-local external-AI work loop.
- After PLAN[2] is honestly settled, propagate the classification into this mission/master plan before moving to the next gate.

## Next

Wait for the exported task artifact from the current packaged/main AAAAT build. Process that artifact in the no-local external AI environment, return one substantive Markdown/text result file, have the user import it through AAAAT, verify normal UI retention, close #329 if successful, and then determine the next recovery gate from authority rather than automatically jumping to PLAN[4].
