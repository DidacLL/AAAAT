# Current mission — PLAN[4] owner-paired document-package design

Current explicit Product Owner instruction remains highest authority.

Base main after PR #342: `21f45debffdfaad931a1a7c19015950c704ebb3a`.

PLAN[2] is complete. A bounded post-PLAN[2] setup audit found no setup/integration item that blocks the sequence. The active mission is therefore the unresolved ADR-0015 PLAN[4] document-package design. Do not start broad PLAN[4] implementation before the owner-paired design decisions are explicit.

## Completed recovery state

- PLAN[0] integrated candidature/domain/UI baseline retained.
- PR #326: real constrained-model direct extraction demonstrated for one target-scoped Role operation through Ollama + `qwen2.5:0.5b-instruct`; broad four-field constrained-model usefulness remains partial after the demonstrated request timed out at AAAAT's intended 15-minute ceiling.
- PLAN[1] retained.
- PLAN[2] complete:
  - local-computer external AI boundary actually demonstrated with llama.cpp Web UI + Granite 4.1 3B;
  - no-local external AI boundary actually demonstrated through PR #330 / closed #329;
  - PRs #335/#336: `Send to my AI` candidature editor, shipped editable tasks, clipboard/file paths and reusable user tasks;
  - PR #341 / #338: first-class candidature entry point;
  - PR #342: reusable external-host guidance separate from task payloads;
  - Issue #333 closed.
- PLAN[3] retained.
- PLAN[4] rendering/portable/immutable artifact infrastructure is real, but the owner-approved package/design model remains incomplete.
- PLAN[5] remains blocked until PLAN[4] settles.

## Evidence reuse

The llama.cpp/Granite and no-local #329 journeys are durable external-boundary evidence. Do not make the Product Owner repeat them after ordinary UI, wording, template or refactoring changes that do not materially alter context projection, external mutation or carrier behavior.

Manual real-environment evidence is a scarce boundary check, not routine QA. The Product Owner is not a transport or QA layer. Evidence hosts/models/carriers are fixtures only, not architecture.

## Setup/integration audit — no sequence blocker

Classify current setup state as follows:

- **Basic local workspace / manual use:** retained and usable without AI or TeX; not a blocker.
- **Document-rendering environment detection:** implemented. AAAAT detects `latexmk`/`pdflatex`, explains missing tools, and keeps document editing available when rendering is unavailable.
- **Rendering self-test:** implemented and actually demonstrated; it performs real local LaTeX rendering rather than a synthetic command check.
- **AI connection configuration/routing:** implemented; the production route has real constrained-model evidence. Ordinary-user setup polish remains partial, but AI is optional and this does not block PLAN[4].
- **External-host setup:** carrier/domain operation is actually demonstrated. Ordinary local-host connection UX remains partial/technical; raw executable/MCP details are Advanced. This is optional because `Send to my AI` also supports clipboard/file use, so it does not block PLAN[4].
- **Reusable external-host guidance:** implemented by PR #342 and separate from task payloads.
- **`installer.ai`:** bounded status + real rendering self-test mechanism exist. It is optional setup assistance, not a prerequisite.
- **`configurator.ai`:** bounded typed connection/default/validation mechanism exists; representative ordinary-user usefulness remains partial/synthetic. It is optional and not a sequence blocker.
- **Prior VS Code-specific setup removed by PR #319:** superseded as a product requirement unless a future concrete host journey justifies a host-specific adapter. Do not restore it automatically.
- **External CV description/content/render operations removed by PR #319:** not a setup blocker. Re-evaluate only against the settled PLAN[4] document model if a concrete external-document capability requires them.

Keep setup debt visible for later refinement; do not turn it into a new recovery PLAN merely to eliminate every historical mechanism gap.

## PLAN[4] authority already fixed

Preserve the production infrastructure already demonstrated:

- typed document state and deterministic local rendering;
- real pdfLaTeX/`latexmk` execution;
- self-contained portable projects;
- immutable Rendered CV/letter snapshots;
- Application packet output;
- retained/exportable user-owned artifacts;
- TeX-sensitive text encoding boundary.

ADR 0015 preserves the unresolved owner-approved direction:

- LaTeX2e public API;
- expl3 internals;
- user-owned editable blueprints and modified package sources;
- owner collaboration on detailed blueprint/language/font design;
- coherent AAAAT integration around that document model.

Do not equate the current small `aaaat.sty` facade or existing rendering infrastructure with completion of this design.

## Orchestration boundary

The orchestrator owns sequence, scope, evidence and acceptance. Execute small deterministic corrections directly. Substantial implementation belongs in a bounded specialist task after the product/design decision is fixed. Do not spend scarce Codex/Copilot quota on deterministic setup, harness or small fixes.

Do not ask the Product Owner to test ordinary implementation increments. Escalate only genuine design decisions that cannot be recovered from authority.

## Next

Inspect ADR 0015, the current document-domain implementation, current LaTeX package/templates and owner-source document notes. Reduce PLAN[4] to the smallest set of genuine Product Owner design decisions needed before implementation—especially public package API, blueprint ownership/customization model, document composition, language/font expectations and how AAAAT exposes those choices.

Present those decisions concretely, with existing defaults/recommendations where authority already narrows the choice. Do not ask broad architectural questions and do not implement the package redesign before those owner decisions are settled.
