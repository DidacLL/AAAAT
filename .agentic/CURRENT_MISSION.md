# Current mission — post-PLAN[2] recovery checkpoint

Current explicit Product Owner instruction remains highest authority.

Base main after PR #342: `21f45debffdfaad931a1a7c19015950c704ebb3a`.

PLAN[2] is complete. Do not reopen it from ordinary UI/refactoring changes or manufacture another external-host acceptance matrix.

## Achieved

- PR #326: real constrained-model direct extraction demonstrated for one target-scoped Role operation through Ollama + `qwen2.5:0.5b-instruct`; partial-result salvage worked. Broad four-field constrained-model usefulness remains partial after the demonstrated request timed out at AAAAT's intended 15-minute ceiling.
- Local-computer external AI boundary: actually demonstrated with llama.cpp Web UI + Granite 4.1 3B. The external host originated work, read bounded AAAAT candidature context, produced useful reasoning, wrote one Source back, and the result was visible in normal AAAAT UI.
- No-local external AI boundary: actually demonstrated through PR #330 / closed #329. An external AI without local AAAAT access worked from bounded exported context and its returned result was retained in normal AAAAT UI.
- PR #335: candidature-level `Send to my AI` task editor, shipped editable tasks, visible bounded context, Copy task, file export, Paste/Save result, file import and existing dirty-context safety.
- PR #336: reusable user-created candidature task templates persisted in existing `workspace_metadata`; one-off use does not require saving.
- PR #341 / closed #338: `Send to my AI` is directly discoverable on the normal selected-candidature surface rather than hidden under `More`.
- PR #342: reusable AAAAT guidance for external AI hosts is separate from individual task payloads; the user can preview/copy/save it once in AI Settings while raw local-tool connection mechanics remain Advanced.
- Issue #333 is closed as the completed PLAN[2] product-shape work.

## Evidence reuse rule

The llama.cpp/Granite and no-local #329 journeys are durable evidence for the external boundary. Do not make the Product Owner repeat them after ordinary UI, wording, task-template or refactoring changes that do not materially alter context projection, external mutation or carrier behavior.

Manual real-environment evidence is a scarce boundary check, not routine QA. The Product Owner is not a transport or QA layer. Ordinary implementation changes use automated verification unless they materially change the boundary being claimed.

Evidence hosts/models/carriers are fixtures only. llama.cpp, Granite, Markdown, clipboard and MCP are not product defaults or architecture authority.

## Capability classification

- Direct bounded one-field constrained-model extraction: **implemented and actually demonstrated**.
- Broad/multi-field constrained-model usefulness: **partial**.
- External AI with local-computer/tool access: **implemented and actually demonstrated**.
- External AI without local-computer access: **implemented and actually demonstrated**.
- `Send to my AI` candidature UX, shipped editable tasks, user reusable tasks, clipboard/file paths and reusable host guidance: **implemented**; their external boundary is covered by the durable real-host evidence above.
- Specialized `External opportunity research` product UX: **superseded**; retained internals are compatibility/mechanism only.
- Setup/integration UX: **partial/scaffold**. A working MCP/local-host boundary does not make raw executable/configuration mechanics an ordinary-user setup journey.
- PLAN[3]: retained.
- PLAN[4] rendering/portable/immutable artifact infrastructure: **implemented and actually demonstrated as infrastructure**; ADR-0015 document-package design remains incomplete.
- PLAN[5]: blocked.

## Remaining recovery debt

Before resuming PLAN[4], perform one bounded setup/integration audit against current authority. Do not implement broadly during the audit.

Determine whether any remaining setup debt materially blocks the alpha sequence, specifically:

- first-run usability versus optional TeX/AI/external-host setup;
- current AI connection setup and validation versus representative real usefulness already demonstrated;
- external-host setup UX, which still exposes technical executable/MCP mechanics in Advanced;
- capabilities removed by PR #319 (including prior VS Code setup and external CV operations): do not restore automatically; classify each only if current authority still requires it;
- installer/configurator mechanisms: distinguish useful bounded implementation from ordinary-user acceptance.

Classify each as: implemented and actually demonstrated / implemented but only synthetically demonstrated / partial-scaffold / removed during drift / missing / superseded by explicit Product Owner direction.

If no setup item materially blocks sequence, record that conclusion and resume PLAN[4]. Do not create work merely to eliminate every historical mechanism gap.

## Architecture and execution boundaries

AAAAT is not an AI platform, workflow engine, provider marketplace, host registry or generic CRUD/query surface. Preserve local workspace ownership, privacy-aware projections, bounded mutations, Source retention and manual/no-AI completeness.

OpenAI-compatible is an adapter only. The older JSON `applicationHandoff` remains a separate mechanism, not the `Send to my AI` product model.

The orchestrator owns sequence, scope, evidence reuse and acceptance. Execute small deterministic corrections directly. Use a bounded specialist for substantial autonomous implementation where it materially reduces owner effort. Do not spend scarce Codex/Copilot quota on deterministic setup, harness or small UI work.

## Next

Audit the remaining setup/integration debt only far enough to answer: **does anything here block moving to PLAN[4]?**

If no, propagate the classification and start the ADR-0015 owner-paired PLAN[4] document-package design. If yes, define the smallest concrete user journey that closes the blocker before PLAN[4].
