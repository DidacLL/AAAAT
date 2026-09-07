# Completing Mission — Integrated real-use acceptance

**Issue:** [#202](https://github.com/DidacLL/AAAAT/issues/202) on `agentic/real-use-acceptance`, based on integrated main `bfb6533aceb56133a2555f783efe51fa65256487`.

## Acceptance conclusion

The current integrated alpha has sufficient evidence for the five required SPEC destinations without an unresolved hard-gate defect. PR #203 contains no production-code change; it reconciles the acceptance state and strengthens the existing real pdfLaTeX portability scenario with Spanish/French Latin content.

Reliable local information/retrieval is covered by focused repository tests plus the Windows packaged UI run: an isolated no-AI workspace, sparse candidature, retained Source, visible full-text-only search using `GLASS-CEDAR-ORBITAL-987`, and cancelled dirty navigation preserving the unsaved Source draft. Context/mutation boundaries and external-assistance authority remain covered by the existing focused direct-AI/MCP tests and the packaged live VS Code evidence from Verify #452. Reusable documents remain covered by source-ownership, optional-variant, combined-output, immutable-artifact and unrelated-directory pdfLaTeX evidence; Verify #455 passed the strengthened multilingual portability scenario.

Accessible setup/recovery has layered evidence: existing renderer tests cover the recovery controls and state-transition semantics, while the packaged recovery suite proves backup/restore integrity, exclusions and restored workspace data through the real packaged runtime. The additional Windows acceptance run could inspect but not operate the native folder picker because the available computer-input driver lacked usable input geometry. That is an automation-evidence limitation, not a reproduced AAAAT recovery defect. No production change was justified by it.

Verify #457 passed at `c0fc2569b6e89674841ef25ac3fa4c97c7f003bd`. Existing #452 packaged/platform/VS Code evidence and #455 real TeX portability evidence remain reusable under impact-scoped verification.

## UX finding

The acceptance screenshots exposed a broader product UX/information-architecture problem: visible capabilities have accumulated in implementation order without a coherent hierarchy for what belongs where, what should dominate, or how the shell should behave across window sizes. The owner explicitly directed that this must **not** be addressed by a local first-run/CSS patch because it requires a full product UX run.

That work is captured separately as [Issue #204](https://github.com/DidacLL/AAAAT/issues/204), **Run cohesive product UX and information-architecture redesign**. No UI fix is part of #202/#203.

## Next

Integrate PR #203 once its final impact-scoped check is green, close #202 as completed with the native-picker automation limitation stated explicitly, then activate #204 as the next Mission on a fresh branch. Do not repeat unaffected package, VS Code, TeX or already-observed Source/dirty-draft evidence solely for SHA parity.