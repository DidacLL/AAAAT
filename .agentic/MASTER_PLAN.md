# AAAAT master plan

This is the durable sequencing record for the path to alpha. Current explicit Product Owner instruction and `PRODUCT_DEFINITION.md` are higher authority. `CURRENT_MISSION.md` owns the active run.

Do not treat historical PLAN completion flags as product authority. A PLAN is a development/acceptance grouping beneath the AAAAT northstar.

## Northstar

AAAAT is an **open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them**.

The product supports Human → AAAAT, AAAAT → AI and AI → AAAAT as peer interaction directions. Manual/no-AI use remains complete. Provider/model/host/protocol/carrier choices are implementation mechanisms. Local authoritative data and generated artifacts belong to the user.

VCVGenerator/document work is independently core. AAAAT is not an ATS lifecycle product, job-discovery engine, AI/chat platform or generic agent/plugin framework.

Architecture stays small, explicit and maintainable by one developer.

## Recovery checkpoint — 2026-09-29

The September 28 audits were over-scoped. They identified some real implementation questions but also introduced new product interpretations and used those interpretations to reopen PLANs. PR #375 then wrote some of those conclusions into `PRODUCT_DEFINITION.md`, creating a circular authority problem.

The canonical Product Definition is being repaired before PLAN status is reclassified.

During this recovery:

- preserve real implementation/evidence;
- do not preserve an audit conclusion merely because it was merged;
- do not restore an older PLAN flag mechanically;
- separate product meaning, PLAN acceptance and implementation debt;
- distinguish a user-visible capability boundary from an internal transport/mechanism choice.

## PLAN[0] — integrated candidature/domain baseline

Purpose: establish the local application/candidature domain and a useful human-operable baseline.

Durable product foundations demonstrated by the PLAN[0] lineage include:

- sparse candidatures;
- flexible user-maintainable candidature information;
- Sources retained independently from extraction;
- no required lifecycle/status/priority/next-action model;
- user-controlled primary/favourite presentation;
- manual/no-AI operation;
- bounded AI assistance with local validation/partial-result handling;
- narrow typed renderer/main-process mutation boundaries.

Later UX/product refinement does not automatically invalidate this baseline. Conversely, a PLAN[0] completion flag does not exempt later behavior from the current Product Definition.

Current classification: **re-evaluate after authority recovery; do not use PR #375's automatic reopening as authority.**

## PLAN[1] — real test basis

Purpose: keep verification around real user/domain behavior rather than development-era generated guardrails.

Tests are evidence only for the premise they encode. A green test does not preserve a poisoned product assumption.

Current classification: **retained unless a directly affected authority correction proves otherwise.**

## PLAN[2] — external-AI-originated journeys

Purpose: demonstrate useful AAAAT work originating in external AI environments without turning one carrier into product architecture.

Important evidence already exists:

- real local-computer/tool-capable external-host journey through llama.cpp Web UI + Granite;
- real no-local-computer journey using a portable bounded task/result carrier;
- useful returned work retained visibly in AAAAT;
- candidature-level `Send to my AI` interaction with editable task text, shipped/user reusable tasks, visible bounded context, Copy/Paste and file alternatives;
- reusable host guidance separated from individual task payloads.

Issue #333 is the key Product Owner correction for the accepted user-facing interaction. It requires a useful `Send to my AI` task experience and bounded context/return authority; it does **not** establish a product rule forbidding every internal local-selection mechanism used by a carrier.

Provider/host/carrier choices remain evidence fixtures.

Current classification: **re-evaluate from Issue #333 + real-host evidence; PR #375's transport-state reopening is not authority.**

## PLAN[3] — architecture and dependency health

Purpose: keep the Electron/React/TypeScript/SQLite application understandable and explicit without architecture churn.

Retain where independently justified:

- explicit main-process composition;
- sandboxed/context-isolated renderer;
- narrow typed preload/API boundaries;
- small runtime dependency set;
- direct application-service mutations;
- no speculative ORM/event-bus/plugin/workflow framework.

Current classification: **retained.**

## PLAN[4] — document/LaTeX package and AAAAT integration

Purpose: deliver the real VCVGenerator/document source/rendering model and integrate it with AAAAT.

Strong implemented/evidenced foundations include:

- typed CV/template/letter state;
- LaTeX2e public package API with expl3 internals;
- pdfTeX through pdfLaTeX;
- TypeScript-generated `data.tex`;
- one Blueprint contract for CV and cover-letter presentation;
- render-time Blueprint choice without Blueprint ownership on editable CV records;
- semantic `main` / `secondary` CV section roles independent from concrete layout geometry;
- immutable rendered snapshots and portable retained/exported source projects;
- bounded Latin-script Babel behavior and Blueprint-owned fonts;
- real multipage/content-survival and packaged-runtime evidence.

Owner decisions preserved in PR #350 / Issue #351 establish application-level advanced-user Blueprint configuration under Electron `userData`, one shared AAAAT package/library, and render-time Blueprint selection rather than per-CV presentation ownership.

One real deferred question must be judged carefully: ADR 0015 preserves user ownership of modified package sources, and Issue #344 explicitly recorded persistent reuse/selection of modified Blueprint/package sources as later PLAN[4] debt. The Blueprint side was subsequently implemented; current rendering still sources the shipped package unless/until the shared-package model is completed.

PR #377 changed production/setup/self-test to direct `pdflatex` and has strong real evidence. Preserve it if technically sound. Do **not** describe direct invocation as a Product Owner requirement: ADR 0015 requires pdfTeX through pdfLaTeX, not one wrapper/invocation command.

Issue #373 currently records the application-level shared-source model instead of asking the Product Owner to repeat that decision. Its necessity and exact acceptance boundary must be confirmed after the canonical/technical authority repair.

Current classification: **under recovery; substantial implementation/evidence retained, final acceptance to be re-evaluated against the recovered document ownership requirement.**

## PLAN[5] — coherent product UX/UI

Purpose: turn the implemented product capabilities into the intended low-friction AAAAT experience rather than a set of technically correct forms/panels.

The final experience must be judged against the whole Product Definition, not isolated component headings.

Important requirements/evidence include:

- first-run Create/Open with recovery secondary;
- loaded Home as a useful branded landing surface rather than another workspace-entry launcher;
- fast Applications retrieval and coherent selected-application work;
- direct structured entry and raw-material capture as peer creation paths;
- retained raw Source followed by clear AI-assisted and manual continuations;
- user-maintainable information without schema-first language;
- read-first My information and document work;
- contextual AI/disclosure controls;
- Tags as bounded shared glossary/retrieval aid;
- practical Settings language;
- meaningful sparse/empty states;
- genuinely adaptive constrained/expanded desktop layouts;
- AAAAT's owner-approved visual direction rather than generic SaaS/dashboard styling.

Issue #314 and later Product Definition corrections are important product evidence, but historical wording such as separate Focus modes must be interpreted against the current canonical interaction model rather than copied mechanically.

Issues #360/#362/#365/#369 contain useful renderer work and should be retained where it fits the final coherent UX.

Current classification: **pending recovery of preceding PLAN boundaries and then coherent integrated acceptance; do not fragment into cosmetic micro-patches.**

## Evidence policy

Evidence proves only the premise exercised.

- mocked providers do not prove useful constrained-model behavior;
- AAAAT's own client does not prove a third-party-host journey;
- real external-host evidence remains reusable until the relevant context/carrier/mutation premise materially changes;
- real pdfLaTeX compilation proves rendering mechanics/portability, not by itself the complete document ownership/product model;
- component tests do not by themselves prove coherent UX.

Do not make the Product Owner repeat real-environment demonstrations after unrelated changes.

## Execution contract

The orchestrator owns authority recovery, sequence, scope, independent diff/evidence review and PLAN classification.

- Small deterministic corrections may be done directly.
- Substantial implementation belongs to one bounded specialist after product meaning is clear.
- Specialists do not edit higher authority to normalize their work and do not declare PLAN completion.
- Prefer coherent vertical work over artificial issue proliferation.
- No heavy dependencies or speculative frameworks.

## Next

1. Finish canonical/derived authority repair after the over-scoped audit.
2. Re-evaluate PLAN[0]–PLAN[5] from the recovered Product Definition and actual evidence.
3. Correct live Issues only where their boundary still carries audit drift.
4. Select exactly one next coherent implementation outcome.
