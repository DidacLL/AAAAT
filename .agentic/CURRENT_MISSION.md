# Current mission — authority recovery checkpoint

Current explicit Product Owner instruction remains highest authority.

This is a bounded recovery checkpoint after the Product Owner identified that PLAN[0]–PLAN[4] were advanced using mechanism proofs and derived-document rewrites that flattened broader product requirements.

Do not implement PLAN[5]. Do not start a broad replacement implementation in this mission.

## Outcome

Restore trustworthy planning authority before further product work.

The checkpoint must produce a trace from current owner authority to the actual implementation for the affected capabilities and classify each one as:

- **implemented and actually demonstrated**;
- **implemented but only synthetically demonstrated**;
- **partial/scaffold**;
- **removed during drift**;
- **missing**; or
- **superseded by explicit Product Owner decision**.

The immediate affected areas are:

1. direct AAAAT AI usefulness with real affordable/resource-constrained models;
2. external-AI-originated journeys in real third-party environments with and without local-computer access;
3. setup/integration behavior, including whether prior host-configuration work should be recovered, replaced or remain superseded;
4. `installer.ai` / `configurator.ai` as actual setup capabilities rather than status/transport vocabulary;
5. external-AI domain capabilities capable of carrying useful completed work rather than only raw opportunity text plus requested output kinds;
6. the owner-approved document/LaTeX package design preserved by ADR 0015.

## Known state to preserve

Do not discard useful engineering merely because sequence acceptance drifted.

Preserve unless directly contradicted by recovered authority:

- accepted PLAN[0] candidature/domain/UI behavior;
- PLAN[1] test-basis cleanup;
- PLAN[3] explicit IPC composition, readability and dependency-health work;
- PLAN[4] real pdfLaTeX rendering, portable projects, immutable artifacts, cover-letter rendering and packet infrastructure;
- local workspace ownership, bounded mutation authority, validation and privacy boundaries.

## Known gaps already verified

- PR #319 removed the demonstrated VS Code MCP configuration path and external CV description/content/render capabilities. Their deletion does not prove they were wrong product concepts; recover the intended journey before deciding whether to restore, replace or leave them removed.
- Current direct-AI evidence relies on synthetic OpenAI-compatible HTTP tests; this does not prove useful operation with an actual lightweight/constrained model.
- PLAN[2] accepted AAAAT's own MCP SDK client and a strict JSON application handoff as if they demonstrated third-party-AI journeys. They prove carriers/contracts, not the required user journeys.
- The current `application_documents_create` / application-handoff intention carries raw opportunity text and output kinds, not the useful analysed/tailored work an external AI may already have completed.
- PLAN[4] proves real portable rendering infrastructure but does not complete the LaTeX2e + expl3 + editable blueprint/package-source design preserved by ADR 0015.
- The current rendering self-test claims an actual temporary render while only checking for `latexmk` and `pdflatex`; this checkpoint corrects that factual defect.

## Required recovery work

1. Correct the repository authority/plan state so no agent may treat PLAN[2] or PLAN[4] as closed.
2. Correct derived SPEC claims that normalize the current MCP/JSON carriers or current macro facade as final product architecture.
3. Correct the false rendering self-test so the named action actually creates, renders, verifies and removes a temporary document.
4. Build the capability classification from current owner authority, accepted ADRs, implementation and real evidence.
5. Define one concrete PLAN[2] acceptance set based on representative real user environments. Choose the journey first; choose a carrier only after that journey is understood.
6. Stop. Do not implement the reopened PLAN[2]/PLAN[4] capabilities inside this recovery checkpoint.

## PLAN status

- PLAN[0]: accepted domain/UI baseline; bounded AI/setup/interoperability foundations under recovery.
- PLAN[1]: retained.
- PLAN[2]: **reopened**.
- PLAN[3]: implementation retained.
- PLAN[4]: **reopened** after PLAN[2].
- PLAN[5]: not started; blocked.

## Verification

For the recovery-branch correctness changes, use ordinary `npm run verify`.

The rendering self-test correction needs evidence that the service creates a temporary TeX project, calls the production rendering path, requires the resulting PDF, and removes the temporary project. Do not require a full cross-platform package run for coordination-only changes.

## Exit

This recovery checkpoint ends when the authority/derived-document state is corrected, the false self-test is truthful, the affected capability map is explicit, and the master orchestrator can issue one bounded PLAN[2] run prompt without silently preselecting MCP, JSON or another transport as the product.
