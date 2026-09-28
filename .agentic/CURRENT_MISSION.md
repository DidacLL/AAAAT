# Current mission — authority recovery before further PLAN execution

Current explicit Product Owner instruction remains highest authority.

Audit target main: `1f68eb5dfdc1e4c78d8d179e993d63798738ebca` (PR #374 recovery merge).

The 2026-09-28 authority audit found additional contradictions after PR #374. This mission supersedes its stale statements where they conflict with the current Product Definition, SPEC or direct Product Owner instruction.

## Current PLAN state

- **PLAN[0] — useful baseline retained, acceptance qualification reopened.** The core local candidature/domain model remains useful, including flexible fields, explicit AI proposal review, no field-derived candidature identity and no lifecycle requirement. However, the current New application path still combines raw capture and direct fields and its legacy background preparation helper directly persists AI-extracted values, CV ordering and cover-letter content. That contradicts the current two-entrance creation model and deliberate AI acceptance boundary. Do not treat that path as accepted baseline behavior.
- **PLAN[1] — retained.** The real-behavior test-basis cleanup remains compatible with current authority.
- **PLAN[2] — real-host evidence retained; current product interaction not fully accepted.** The prior local-computer and no-local external-host demonstrations remain valid evidence for the boundaries they exercised. The later Product Owner model makes `Send to my AI` a contextual action whose task explicitly carries bounded context. The live `opportunity_research_selected` candidature state and selector-free MCP context/source tools are superseded transport scaffolding, so the old selected-candidature implementation is not current product authority.
- **PLAN[3] — retained.** Main-process composition, dependency health and sandboxed renderer boundaries remain sound.
- **PLAN[4] — ACTIVE / NOT ACCEPTED.** Useful document infrastructure remains, but production/setup incorrectly require `latexmk`, reusable modified `aaaat.sty` is not consumed by later renders, and packet-letter generation does not yet prove the exact retained package source from the selected Rendered CV. Issue #373 owns the final package/source boundary.
- **PLAN[5] — BLOCKED / NOT ACCEPTED.** Existing renderer slices are salvageable material only. Coherent visual/interaction acceptance remains blocked until PLAN[4] is accepted and the earlier domain/AI contradictions are corrected.

## Product rules recovered in this audit

### AI-use visibility

Every reusable professional-information item and candidature field owns one persisted `AI may use this information` choice.

A sensible starting value may be chosen from an item's **initial** content kind, and shipped candidature fields may have explicit starting values. Those are initialization choices only. Kind, label, `system_key`, value type, description and retained content are mutable user data and never become privacy semantics. Renaming or repurposing an item/field must preserve the stored choice until the user deliberately changes it.

The current blanket database defaults of `ai_use_allowed = 1` for new profile items and user-created candidature fields are implementation convenience, not accepted product behavior.

### Contextual `Send to my AI`

`Send to my AI` is an action on the candidature, Source, information item, document or other meaningful object currently in context. The produced task explicitly binds the bounded context.

Clipboard, file, MCP or another integration may carry that task. Transport convenience does not justify a durable exclusive “selected candidature/document/item for AI” mode. Preserve useful task editing, reusable task instructions, copy/export, pasted/imported result retention and bounded disclosure while removing transport-only selection state.

The independently bounded `candidature_create`, `application_documents_create` and privacy-filtered `career_context_read` capabilities are not invalidated merely because the selected-candidature research mechanism is superseded.

### AI output acceptance

Field-level candidature AI already follows the right pattern: proposals remain transient until `Use this value`, `Create and use`, Tag acceptance or an equivalent deliberate action. Direct document AI also keeps suggestions in editable draft state until Save.

The legacy `application-document-preparation.ts` path is the exception and is not accepted: it background-writes extracted candidature values, CV ordering and cover-letter content after New application save. Remove/replace that behavior when the New application interaction is recovered.

## PLAN[4] corrected boundary

ADR 0015 fixes the document engine to pdfTeX through **direct `pdflatex`**. `latexmk` is not a product prerequisite.

Therefore:

- production rendering must invoke `pdflatex` directly with bounded noninteractive arguments and existing timeout/process-tree safety;
- setup readiness depends on `pdflatex`, not `latexmk && pdflatex`;
- the rendering self-test must exercise the same direct-`pdflatex` production premise;
- ordinary setup guidance must not tell users `latexmk` is required.

The retained source project must contain the exact Blueprint and exact shared `aaaat.sty` actually consumed. Application-packet letter rendering must reuse both exact sources retained by the selected Rendered CV.

ADR 0015 requires reusable user-owned editable Blueprints and modified package sources, but it does **not** settle whether those reusable sources are application-level configuration, workspace-owned, or another portable scope. The current `userData/blueprints` implementation is evidence, not product authority. Do not hard-code the final source location until the Product Owner settles this one consequential ownership/portability question.

Issue #373 has been corrected to this boundary.

## Proven foundations to preserve

Unless a directly affected correction proves otherwise, retain:

- local authoritative workspace and current-schema direct correction model;
- sandboxed/context-isolated renderer, no Node integration/webviews and no forced BrowserWindow minimum;
- normal application-service mutation paths and typed validation;
- flexible candidature fields without semantic identity from labels/system keys;
- favourite/order/presentation state as local presentation choices;
- no ATS lifecycle/status/priority/stage architecture;
- Sources, Tags, reusable professional information and document-domain separation;
- explicit field-level AI proposal review and partial-result salvage;
- direct document AI draft/review-before-Save behavior;
- minimal runtime dependency set;
- workspace backup/recovery integrity model and separate AI-configuration portability;
- LaTeX2e public API, expl3 internals, TypeScript `data.tex`, semantic `main`/`secondary` roles, bounded Babel languages, immutable render snapshots and portable retained projects where unaffected.

## PLAN[5] acceptance boundary remains

Do not resume narrow PLAN[5] patches. Final coherent visible work still has to cover:

- first-run Create/Open with recovery secondary;
- loaded Home as branded landing console, not another workspace launcher;
- retrieval/capture-first Applications composition;
- two direct New application approaches;
- raw Source retention followed by peer `Send to AI` and `Fill manually` continuations;
- coherent selected-candidature information with configuration progressive;
- read-first My information and document work;
- contextual AI-use controls;
- Tags as bounded glossary/retrieval aid;
- intentional sparse/empty states;
- practical Settings language rather than setup-harness/protocol vocabulary;
- productive constrained/expanded layouts and mandatory AAAAT visual direction;
- real packaged/rendered visual evidence, not component tests alone.

## Next execution

1. Correct the direct-`pdflatex` production/setup/self-test boundary as an independent bounded PLAN[4] slice. This does not depend on reusable-source placement.
2. Obtain the single Product Owner decision for reusable Blueprint/shared-package ownership scope.
3. Complete the remaining Issue #373 source boundary and independently re-evaluate PLAN[4].
4. Correct the reopened PLAN[0]/PLAN[2] product contradictions (New application background persistence, contextual external-AI state, AI-use initialization) before final coherent PLAN[5] visual acceptance.

The Product Owner is not a routine QA layer. Real-host/TeX/visual evidence is rerun only where the corrected boundary materially changes the premise previously demonstrated.