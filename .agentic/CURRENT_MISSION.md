# Current mission — recover AAAAT northstar before further PLAN execution

Current explicit Product Owner instruction is highest authority.

Current main at recovery start: `3873e3e164874a79c7690490fcd892b901917c53`.
Recovery coordination: PR #378.

The September 28 authority audits became over-scoped. They mixed legitimate implementation review with new product interpretations, changed derived PLAN state from those interpretations, and in PR #375 promoted some audit conclusions into `PRODUCT_DEFINITION.md` itself. Do not continue implementation from that audit state.

## AAAAT northstar

AAAAT is an **open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them**.

The application is local-first and user-owned, but “local workspace” is an implementation/product boundary beneath the larger identity, not the whole product definition.

AAAAT supports three peer operating directions:

1. **Human → AAAAT** — every essential capability is usable through a coherent GUI without JSON, shell commands, protocol knowledge or mandatory AI.
2. **AAAAT → AI** — the user may request bounded AI assistance from inside AAAAT; AAAAT prepares allowed context, invokes a configured route, validates the result and keeps the interaction coherent in AAAAT.
3. **AI → AAAAT** — an external AI/tool may initiate bounded AAAAT capabilities through an appropriate integration when that produces a useful reliable experience.

Manual/no-AI operation remains complete. Provider, model, host, protocol and carrier choices are interoperability mechanisms, not product identity. MCP, skills/plugins, commands, APIs, browser/desktop bridges, files and copy/paste may all be valid carriers for a concrete journey; none defines AAAAT.

VCVGenerator/document work is independently core. CVs, cover letters and related application artifacts must remain usable without a candidature and without AI, while also integrating naturally with candidature context.

AAAAT optimizes for low friction: less typing, repeated organization, searching and tool switching. Sparse information is normal. Ordinary users should not need to understand schemas, protocols or integration mechanics.

The authoritative local data, professional information, Sources, Tags, document content, generated source and rendered artifacts belong to the user. External disclosure is bounded and understandable.

AAAAT is not an ATS lifecycle/workflow product, job-discovery engine, generic AI/chat platform, agent orchestrator, generic database, knowledge-management system or enterprise framework.

Architecture must stay clean and maintainable by one developer: small explicit abstractions, minimal dependencies, no speculative provider/plugin/policy/workflow framework, and no compatibility ceremony before a real user baseline exists.

## Recovery rule

Recover product meaning before PLAN status.

Use this order:

1. current explicit Product Owner instruction;
2. `AGENTS.md` authority rules;
3. owner-preserved product evidence, especially `docs/owner-source/RedesignOwnerNotes.md`, `docs/owner-source/Background.md` and the clean-redesign specification, to recover intent where the current canonical definition was changed by the audit being reviewed;
4. the last uncontaminated canonical `PRODUCT_DEFINITION.md` plus later explicit Product Owner corrections;
5. `PRODUCT_CONTEXT.md` only for rationale;
6. `OWNER_DEVELOPMENT_PRINCIPLES.md`;
7. derived SPEC / MASTER_PLAN / Mission / Issues;
8. tests and implementation evidence.

Historical owner-source material does not normally create requirements. In this recovery it is needed to reconstruct the higher-authority intent that the audit itself altered. Do not copy obsolete implementation contracts from it.

## Known audit contamination to re-evaluate

Do not treat the following PR #375 conclusions as owner authority merely because they were written into canonical/derived docs:

- that ADR 0015 requires **direct** `pdflatex` rather than pdfTeX/pdfLaTeX with any particular safe wrapper;
- that the already owner-corrected application-level Blueprint/source configuration scope became unresolved again;
- that PLAN[0] acceptance must be reopened because later UX/product work remains;
- that PLAN[2] acceptance must be reopened because its accepted `Send to my AI` implementation retained an internal selected-candidature transport mechanism;
- that `AI may use this information` initial defaults must be inferred from content kind;
- that a durable internal selection mechanism is inherently forbidden rather than an implementation detail to judge against the bounded user journey.

PR #377's direct-`pdflatex` implementation has real evidence and may remain if technically sound. Its existence does not convert the audit interpretation into product authority.

## Document-source question

There is genuine pre-audit PLAN[4] evidence that reusable user-owned modified package source remained deferred work: ADR 0015 preserves ownership of modified package sources and Issue #344 explicitly recorded persistent reuse/selection of modified Blueprint/package sources as later PLAN[4] debt.

There is also explicit Product Owner correction in PR #350 / Issue #351 that advanced-user Blueprint configuration is application-level under Electron `userData`, with one shared AAAAT package/library and render-time Blueprint choice rather than Blueprint ownership on editable CV records.

Issue #373 has been corrected to stop asking the Product Owner to repeat that application-level decision. Its remaining implementation scope must still be rechecked against the recovered northstar before dispatch.

## PLAN state during recovery

Do **not** mechanically use either the pre-audit PLAN flags or the audit-reopened flags as authority.

- PLAN[0]–PLAN[5] classification is temporarily under authority recovery.
- Proven implementation and real-environment evidence remain evidence; do not discard them.
- No substantial new product implementation is dispatched until the canonical product definition and derived coordination docs agree on the recovered northstar.
- A PLAN is reclassified only after comparing its actual acceptance boundary and evidence to the recovered Product Owner intent.

## Next execution

1. Repair `PRODUCT_DEFINITION.md` so the northstar is explicit and audit-created semantics without owner support are removed.
2. Reconcile `docs/SPEC.md` only where the audits converted implementation interpretations into architecture authority.
3. Rewrite `MASTER_PLAN.md` from the recovered product/PLAN boundaries instead of preserving audit status by inertia.
4. Re-evaluate Issues #314 and #373 plus accepted PLAN[0]–PLAN[5] evidence against that repaired authority.
5. Only then choose the next coherent implementation outcome and give one bounded specialist prompt.

The Product Owner is not the recovery analyst or routine QA layer. Do not ask them to repeat decisions already preserved; the orchestrator owns this repair and independent reclassification.