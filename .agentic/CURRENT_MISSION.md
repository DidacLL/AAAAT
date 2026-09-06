# Recovery — Owner-approved v2 direction

**Active:** [Issue #158](https://github.com/DidacLL/AAAAT/issues/158), based on the owner's accepted recovery plan. [OWNER_INTENT](../docs/OWNER_INTENT.md) defines meaning; [SPEC](../docs/SPEC.md) is the master architecture.

## Outcome and boundary

Reconcile the product definition, SPEC, skill and harness; retire the contradictory M6 journey. Correct verified external/provider identifier disclosure, inaccurate host-access guidance, raw-source retrieval and silent draft loss. Align the document engine contract with the owner's LaTeX2e/expl3/pdfTeX target.

Keep the useful desktop, service, sparse-information and portable-document foundations. Do not add compatibility machinery for pre-use development data. Required later capabilities remain in SPEC; this recovery does not declare the full document system, external-assistant context, configuration or information experience complete. Detailed blueprint/language design remains a later owner collaboration.

## Resume checkpoint — targeted re-review pending

The recovery changes are on `agentic/masterplan-recovery`, based on `84222de`. Historical refs such as `07954f0`, `881c531` and `faf0f3c` identify implementation or continuity evidence; they are not a requirement to repeat product research or unaffected verification.

The first independent review of candidate `b55eda7` found one blocker and no others in the challenged recovery areas: MCP still retained an obsolete structured candidature-create path through `candidature_fields_list`, operation-scoped field/choice references and `values`. Provider-side operation references for actual AI discovery/variant/item round trips, retained-Source retrieval, dirty-editor guards, the Vitest non-completion fix, the pdfLaTeX-only contract and continuity documentation passed that review.

That blocker is corrected. MCP now exposes only source-only `candidature_create`, using the same strict source-only external contract as the one-shot command and calling the ordinary candidature service with no structured values. The MCP field catalogue, operation-scope cache/TTL/cap, field/choice reference conversion, structured-create schemas and corresponding fixtures/claims were removed. VS Code setup knowledge and ADRs 0007/0008 now describe only the source-only capability. Future structured external contributions remain separate named SPEC operations; provider-side operation references remain unchanged.

The recovery also includes truthful host-access disclosure, full retained-Source local search, dirty-editor navigation and adjacent-action guards, pdfLaTeX-only controls and the Windows `.cmd` fake-compiler fixture. The former Vitest non-completion was traced to `CandidatureFieldValueEditor` dirty reporting reacting to parent callback identity; `fdf4890` made reporting depend on dirty state while preserving unmount cleanup.

**Reusable broad evidence:** candidate `b55eda7fc90b9f8223d52e52082033d25d14a240`, Verify run `34002556407` (#361), completed successfully with Fast verification, real pdfLaTeX portability, and Windows/macOS/Linux package/build/runtime smoke. Those results remain applicable to surfaces not changed by the later MCP correction.

**Focused correction evidence:** `9d96c3962431f639b0f2e9789f066f8d9e2d4091`, Verify run `34003881519` (#380), completed successfully. Impact classification selected Fast verification plus one Ubuntu packaged integration lane for the platform-neutral MCP contract change; LaTeX and the full cross-platform package matrix were intentionally skipped as unaffected reusable evidence. Typecheck, lint and Vitest passed; `test/mcp-server.test.ts`, `test/vscode-mcp-setup.test.ts` and the source-only external-command coverage pass. Ubuntu packaged build/runtime smoke also passed. Run #379 had failed only because the new MCP test asserted a nonexistent list projection property; the assertion was corrected to inspect the persisted Source through the database without changing product behavior.

Verification evidence is impact-scoped rather than commit-SHA-scoped. Do not request owner/Codex/local repetition of #361 or #380 merely for exact-head parity. Fresh execution is required only when later changes affect the behavior, platform path, fixture contract, environment assumption or other premise the prior evidence proves.

**Next bounded outcome:** targeted independent Reviewer and proportional Skeptical Simplifier re-review of only the corrected MCP/source-only area and its documentation/tests. Do not restart review of already-passed recovery areas unless the correction creates a concrete interaction. If the correction receives ACCEPT/PASS, proceed to Integrator evaluation; do not start later SPEC capabilities before recovery integration.

Before replacing this Mission, carry any still-required unfinished capability into SPEC/current Mission; a new Issue cannot silently erase it. Keep enduring rationale in SPEC/ADRs and detailed execution evidence in GitHub.

## Evidence and continuation

GitHub records detailed execution and live integration state; checked-in authority retains the product direction, essential rationale, remaining gaps and current continuation so a fresh agent does not require this conversation.

The former M6 product journey is superseded. M0–M5 remain evidence of their stated technical foundations only. [ToDo Issue #156](https://github.com/DidacLL/AAAAT/issues/156) is a future capability proposal while this recovery is active; cached branches do not activate it.

After this capability is integrated, an orchestrator may activate one next bounded outcome from SPEC using actual implementation, evidence and live GitHub state. Routine activation needs no owner approval. Escalate consequential unresolved product meaning or Class D decisions only. Update this file to the active capability instead of appending a history or future Mission catalogue.
