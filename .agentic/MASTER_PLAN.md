# AAAAT master plan

This is the durable sequencing record for the path to alpha. Current explicit Product Owner instruction and `PRODUCT_DEFINITION.md` are higher authority. `CURRENT_MISSION.md` owns the active run.

AAAAT is an **open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them**. Human → AAAAT, AAAAT → AI and AI → AAAAT are peer interaction directions. Manual/no-AI use remains complete. Local authoritative data and generated artifacts belong to the user. VCVGenerator/document work is independently core.

## Recovery result — 2026-09-29

PR #378 recovered the product northstar after the September 28 audits became over-scoped and promoted audit interpretations into canonical authority.

Independent reclassification against the repaired Product Definition and historical acceptance evidence restores the sequence below.

## PLAN[0] — integrated candidature/domain baseline — COMPLETE

PR #319 integrated the accepted baseline after Product Owner natural-use corrections.

Retained foundation:

- sparse candidatures and first-class Sources;
- flexible user-maintainable candidature information;
- no lifecycle/status/priority/next-action requirement;
- no field-derived candidature identity;
- user-controlled favourite/order/presentation;
- manual/no-AI completeness;
- bounded AI assistance with local validation and partial-result handling;
- explicit user acceptance/save semantics for ordinary AI proposals;
- narrow typed renderer/main-process mutation boundaries;
- truthful current AI reachability semantics;
- no arbitrary fixed BrowserWindow minimum;
- current `schema.sql` as the structural workspace baseline.

Later UX refinement does not retroactively reopen this PLAN. Current Product Definition remains authoritative for new work.

## PLAN[1] — real test basis — COMPLETE / RETAINED

Keep verification around durable user/domain behavior rather than development-era generated guardrails. Tests change when product meaning changes; passing tests never create authority.

## PLAN[2] — external-AI-originated journeys — COMPLETE

The PLAN required useful bounded journeys originating in real third-party AI environments with and without local-computer access, plus a usable product interaction rather than carrier-specific scaffolding.

Accepted evidence:

- real local-computer/tool-capable host journey through llama.cpp Web UI + Granite;
- real no-local-computer journey through the portable task/result carrier;
- useful returned work retained visibly in AAAAT;
- Issue #333 `Send to my AI` interaction with fully editable task instruction, shipped/user reusable tasks, visible bounded context, Copy/Paste and file alternatives;
- directly discoverable candidature entry point;
- reusable external-host guidance separate from individual task payloads.

Carrier/host/model choices are evidence fixtures, not architecture.

The September 28 audit incorrectly treated the internal selected-candidature mechanism retained for connected hosts as a new product defect. Issue #333 defines the user-facing task/context/mutation boundary; it does not ban every internal selection mechanism. Reopen PLAN[2] only if a future change materially breaks the accepted external-AI journey.

## PLAN[3] — architecture and dependency health — COMPLETE / RETAINED

Retain:

- explicit main-process composition;
- sandboxed/context-isolated renderer;
- narrow typed preload/API boundaries;
- direct application-service mutations;
- small runtime dependency set;
- no speculative ORM, event bus, plugin framework, workflow engine or generic policy system.

Avoid architecture churn for its own sake.

## PLAN[4] — document/LaTeX package and AAAAT integration — COMPLETE

PRs #348, #353 and #358 establish the accepted document model and evidence. PR #359 recorded PLAN completion.

Accepted boundary:

- typed editable CV/template/letter state;
- LaTeX2e public `aaaat.sty` API with expl3 internals;
- pdfTeX through pdfLaTeX;
- TypeScript-generated `data.tex` carrying document data/semantic roles rather than geometry;
- one shared AAAAT package/library;
- one Blueprint contract covering CV and cover-letter presentation;
- application-level compatible user Blueprint discovery under Electron `userData`;
- explicit render-time Blueprint selection without Blueprint ownership on CV/template/letter persistence;
- CV composition semantic `main` / `secondary` roles independent from concrete Blueprint geometry;
- bounded Latin-script Babel behavior and Blueprint-owned fonts;
- immutable Rendered CV/letter snapshots and duplicate/resume behavior;
- exact self-contained retained/exported source projects;
- Application packet presentation derived from the selected Rendered CV's retained presentation source;
- real multipage/content-survival and packaged-runtime evidence.

### Why the audit reopening was wrong

After the minimal package slice, derived coordination text temporarily described persistent user-modified Blueprint/package-source reuse as unresolved PLAN[4] debt.

PR #350 explicitly records the Product Owner's corrected Blueprint model and **replaces that earlier ownership/persistence interpretation**. The corrected model kept one shared package/library, application-level advanced-user Blueprints, render-time selection and exact source retention; it did not keep persistent reusable modified-package selection as a completion requirement. Issue #351/PR #353 implemented that correction, and #355/PR #358 completed the remaining section-role/language/font decisions.

ADR 0015's statement that modified package sources remain user-owned is satisfied by the user-owned editable generated/retained source model under the corrected Product Owner interpretation; it does not independently recreate the superseded persistence requirement.

### Current direct-pdfLaTeX implementation

PR #377 changed production/setup/self-test from `latexmk -pdf` to direct `pdflatex` and passed real-LaTeX plus Windows packaged evidence. Retain that implementation. The Product Owner requirement is pdfTeX through pdfLaTeX; wrapper/invocation choice remains technical.

### Future source customization

A reusable application-level editable shared `aaaat.sty` may still be a useful future enhancement. It is not a PLAN[4] completion blocker and does not block PLAN[5]. Do not use the superseded September audit to manufacture acceptance debt around it.

## PLAN[5] — coherent UX/UI refinement — COMPLETE

PLAN[5] owns integrated user-facing coherence after the domain, external-AI, architecture and document foundations are settled.

This is not permission for cosmetic component-by-component patches. Evaluate the complete experience against `PRODUCT_DEFINITION.md`, current owner corrections, `docs/UX_DEFINITION.md` where consistent, and mandatory `docs/UX_VISUAL_DIRECTION.md`.

### Applications

- retrieval/capture first;
- one configurable corpus/selected-information model rather than historical peer Focus/All-data modes;
- fast recognisable candidature corpus;
- progressive selected-candidature detail and low-friction editing;
- user-maintainable information definitions progressively disclosed;
- two direct New candidature approaches: structured entry and raw material retention;
- raw Source retention is already successful work;
- after raw retention, AI-assisted extraction and manual filling are clear peer continuations;
- Sources, Tags, documents and deeper machinery appear when relevant rather than dominating first sight.

### My information

- readable professional information first;
- concise contextual editing;
- saved variations and career preferences remain secondary/contextual parts of the same model;
- AI-use/disclosure controls stay understandable and local to the affected information.

### Documents / VCVGenerator

- document work reads as document composition rather than generic record forms;
- preserve settled PLAN[4] ownership/render semantics;
- reusable CV work remains directly reachable; candidature-owned letters/artifacts surface naturally from candidature context.

### Home / shell / first run

- first-run Create/Open is primary; recovery is secondary;
- loaded Home is a branded useful landing console, not another workspace-entry launcher or metrics framework;
- constrained windows give one principal task the useful viewport;
- expanded windows use available space productively;
- empty/sparse states are intentional.

### Tags

Tags remain a bounded shared glossary/retrieval aid. Attach/search/create and contextual definitions should be low-friction without turning the shell into knowledge-management administration.

### AI / Settings

AI guidance/configuration belongs in understandable Settings. Domain action surfaces should execute bounded useful AI work rather than expose competing provider/protocol configuration concepts.

### Visual direction

Use the friendly worn retrofuturist field-terminal/workshop framing with clear paper/dossier information surfaces, restrained mid-century industrial cues and professional readability. Reject generic SaaS/dashboard styling and decorative cyberpunk excess.

### Existing PLAN[5] implementation

Issues #360/#362/#365/#369 contain useful read-first Working CV, My information, candidature-field and Tag UX work. Retain it where it matches the coherent final product; do not redo it just because PLAN[5] remains active.

Issue #314 is the live integrated UX acceptance umbrella after its obsolete two-state-Focus wording is corrected to current authority.

## Evidence policy

Evidence proves only the premise exercised.

- mocked providers do not prove useful constrained-model behavior;
- AAAAT's own client does not prove a third-party-host journey;
- real external-host evidence remains reusable until the relevant external boundary materially changes;
- real pdfLaTeX proves rendering/portability mechanics, not by itself product ownership/UX;
- component tests do not by themselves prove coherent desktop UX.

Final PLAN[5] acceptance requires real rendered/packaged desktop evidence across the coherent product surfaces at representative constrained and expanded sizes. The orchestrator inspects that evidence; the Product Owner is not routine screenshot QA.

## Execution contract

The orchestrator owns sequence, scope, independent diff/evidence review and PLAN classification.

- Small deterministic corrections may be direct.
- Substantial implementation belongs to one bounded specialist after the residual product gap is concrete.
- Specialists do not edit higher authority to normalize implementation and do not declare PLAN completion.
- Prefer coherent vertical work over issue proliferation.
- Keep dependencies and architecture small.

## PLAN[5] completion

PLAN[5] completed through the integrated UX acceptance umbrella #314.

Accepted final sequence:
- #380 / PR #382 — direct structured and raw-material New application entry;
- #383 / PR #385 — loaded Home as useful local landing console;
- #386 / PR #390 — sparse/raw corpus recognition and Source-aware selected application behavior;
- #393 / PR #394 — constrained shell support surfaces;
- #395 / PR #402 — corpus inspect/collapse/Open model, contextual Tags, selected-application coherence, AI field-action feedback, document-first CV work, wide-screen composition and compact navigation;
- #398 / PR #405 — retained AAAAT visual identity, context-correct artwork, machine/paper material hierarchy and final rendered-product inspection.

Final accepted main: `b4a747832d10c309057d3fe5cfc4217733310bf5`.

The next repository objective is v2 release/deployment readiness, not another PLAN[5] refinement cycle. Reopen completed work only for a concrete release-discovered defect.
