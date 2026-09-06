# Recovery — Owner-approved v2 direction

**Active:** [Issue #158](https://github.com/DidacLL/AAAAT/issues/158), based on the owner's accepted recovery plan. [OWNER_INTENT](../docs/OWNER_INTENT.md) defines meaning; [SPEC](../docs/SPEC.md) is the master architecture.

## Outcome and boundary

Reconcile the product definition, SPEC, skill and harness; retire the contradictory M6 journey. Correct verified external/provider identifier disclosure, inaccurate host-access guidance, raw-source retrieval and silent draft loss. Align the document engine contract with the owner's LaTeX2e/expl3/pdfTeX target.

Keep the useful desktop, service, sparse-information and portable-document foundations. Do not add compatibility machinery for pre-use development data. Required later capabilities remain in SPEC; this recovery does not declare the full document system, external-assistant context, configuration or information experience complete. Detailed blueprint/language design remains a later owner collaboration.

## Resume checkpoint — candidate ready for independent review

The recovery changes are on `agentic/masterplan-recovery`, originally implemented at `07954f0`; `881c531` added durable research rationale to SPEC and `faf0f3c` preserved the continuity rules in AGENTS, SPEC, this Mission and the Integrator role. These refs identify evidence, not a requirement to repeat product research.

**Implemented, awaiting independent acceptance:** owner definition/master architecture and harness reconciliation; separated provider/MCP wire identifiers and operation-scoped round trips; truthful host-access disclosure; full retained-Source local search; raw-only external creation; dirty-editor navigation and adjacent-action guards; pdfLaTeX-only controls; and the Windows `.cmd` fake-compiler fixture. Later feeder/package API, artifact capture, broader external-assistant operations/setup and detailed LaTeX blueprint/language work remain SPEC destinations rather than recovery scope.

**Historical failures are resolved or isolated.** At `07954f0`, local Vitest reported failures in `test/latex-runner.test.ts` and `test/preload-api.test.ts`, then did not complete. The preload fixture was stale after `sourceSearchText` became part of the local record and was corrected. The fake compiler gained a Windows `.cmd` form. A later CI run showed those tests green but Vitest still failed to exit; the remaining non-completion was traced to `CandidatureFieldValueEditor` dirty reporting, where an inline parent callback changed identity on each render and the effect cleanup repeatedly cleared/re-added dirty state. `fdf4890` made dirty reporting depend on dirty state rather than callback identity while preserving unmount cleanup. Adjacent draft replacement gaps were also closed for AI cover-letter drafts, profile items, candidature add-value editors, managed field editors and concept editors.

**Verified runtime candidate:** `a4be30f670c2ebab0d21a4754b24e0076594708a`, GitHub Actions Verify run `34002279122`.

- Fast verification completed normally: typecheck and lint passed; Vitest reported 31 passed files plus 1 intentionally skipped portability file, 110 passed tests plus 1 skipped. `test/CandidaturesWorkspace.test.tsx` completed with all 7 tests, `test/preload-api.test.ts` with both tests, and `test/latex-runner.test.ts` with all 4 tests.
- Real LaTeX portability passed using pdfLaTeX tooling and the unrelated-directory portability test.
- Native package/build inspection and packaged runtime smoke passed on Windows, macOS and Linux. The Windows job also passed the demonstrated VS Code host setup contract; the Linux job passed the packaged Chromium sandbox setup.

These checks are execution evidence, not independent review. The automated package smoke exercises the packaged application but is not a substitute for a human visual inspection. The Windows-specific `.cmd` unit-fixture path was introduced to correct the original local Windows fake-compiler ambiguity; the cross-platform package matrix is green, while a focused local Windows unit run remains useful if integration requires direct evidence for that exact branch of the test fixture.

**Next bounded outcome:** obtain fresh independent Reviewer and proportional Skeptical Simplifier assessment of PR #159. A narrow local execution pass may separately cover human visual behavior and the Windows-specific fake-compiler test path; it must not broaden into product redesign or routine duplicate QA. Do not start later SPEC capabilities until this recovery is independently accepted and integrated.

Review must challenge the actual implementation and evidence, especially durable-ID absence and stale/out-of-scope reference rejection; raw-only external creation; complete retained-source search without new provider disclosure; dirty edits across top-level and adjacent actions; the pdfLaTeX-only contract; and whether the dirty-reporting fix is the smallest complete correction. Green CI does not replace that review.

Before replacing this Mission, carry any still-required unfinished capability into SPEC/current Mission; a new Issue cannot silently erase it. Keep enduring rationale in SPEC/ADRs and detailed execution evidence in GitHub.

## Evidence and continuation

Work starts from `84222de` on `agentic/masterplan-recovery`. GitHub records detailed execution and live integration state; checked-in authority retains the product direction, essential rationale, remaining gaps and current continuation so a fresh agent does not require this conversation.

The former M6 product journey is superseded. M0–M5 remain evidence of their stated technical foundations only. [ToDo Issue #156](https://github.com/DidacLL/AAAAT/issues/156) is a future capability proposal while this recovery is active; cached branches do not activate it.

After this capability is integrated, an orchestrator may activate one next bounded outcome from SPEC using actual implementation, evidence and live GitHub state. Routine activation needs no owner approval. Escalate consequential unresolved product meaning or Class D decisions only. Update this file to the active capability instead of appending a history or future Mission catalogue.
