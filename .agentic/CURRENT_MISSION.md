# Active Mission — Integrated real-use acceptance

**Active:** [Issue #202](https://github.com/DidacLL/AAAAT/issues/202) on `agentic/real-use-acceptance`, based on integrated external CV render authority `bfb6533aceb56133a2555f783efe51fa65256487`.

## Outcome

Establish whether the current integrated AAAAT alpha actually satisfies the required SPEC destinations through observable user behavior rather than treating foundations, isolated tests or merged slices as completion. Prove the manual/local, context-boundary, external-assistant, reusable-document, and accessible-setup/recovery scenarios; surface and correct only concrete blockers.

## Boundaries

This Mission is an acceptance audit first, not a redesign or a new feature programme. Reuse still-applicable verification evidence under the impact-scoped evidence policy. Use focused repository/CI evidence for deterministic contracts and local/Codex execution only where interactive desktop, packaged-runtime, filesystem/process, TeX/PDF or visual proof is genuinely required.

Do not add a generic acceptance framework, workflow engine, test DSL, browser-automation platform, provider/research expansion, compatibility layer, dependency, generic external authority or speculative product feature merely to make the acceptance exercise convenient. If one concrete defect blocks acceptance, correct the smallest bounded defect on this Issue or split exactly one independently reviewable implementation Issue when the correction is materially different in scope.

Hard gates remain local ownership, full human operation without AI, renderer/process isolation, purpose-bounded disclosure and mutation authority, portable user-owned LaTeX/output, ordinary application-service mutation paths, and usable backup/recovery.

The acceptance audit itself is Class B execution inside established product meaning. Any discovered durable Class C architectural correction requires the normal ADR and independent review; unresolved product meaning or Class D still goes to the owner.

## Evidence and continuation

PR #201 is integrated at `bfb6533aceb56133a2555f783efe51fa65256487`; Issue #200 is closed. Production Verify #452 on `208bf406f64e3766e6528383ce24f598a92abe56` passed Fast plus Windows/macOS/Linux packaged runtime, Windows demonstrated VS Code host-contract installation, Linux package/sandbox/runtime smoke and the aggregate Verification gate. Final-head Verify #453 on `e7079f69cdd9672673b8d45c11c9962be7268ebf` passed typecheck/lint, 70 passed test files / 205 active tests and the aggregate gate; its only change from the production head was renderer-failure test evidence.

Repository-side acceptance evidence is reconciled. Local candidature search proves retained Source full-text retrieval, including edited source text. Top-level renderer tests prove cancelled navigation and workspace switching retain dirty drafts. Existing packaged tests prove no-AI workspace creation/reopen, sparse candidature persistence, configured Focus/Source retrieval, renderer/preload security boundaries, bounded packaged MCP contribution, packaged recovery integrity and packaged live VS Code setup. Existing focused MCP/direct-AI tests prove the current purpose-specific disclosure/mutation boundaries. Document source-ownership, optional-variant, combined-output and immutable-artifact tests prove the reusable-document ownership model.

Verify #455 on `fa8b4fd4aa9b405b28db6be12db721a6eae92594` passed Fast, real pdfLaTeX portability and the aggregate gate after the existing unrelated-directory portability scenario was strengthened with Spanish/French Latin content (`Currículum`, `Ingeniería`, `Diseñé`, `España`, `Montréal`). No production language or TeX framework change was required. Verify #456 on `b14c061c4e4e15ea72a2c1127f0e7a70d5224db8` also passed; PR #203 still contains no production-code change.

A Windows x64 packaged run at `b14c061c4e4e15ea72a2c1127f0e7a70d5224db8` built the real application and observed through visible UI: creation of an isolated no-AI workspace; a sparse candidature with a retained Source whose unique phrase `GLASS-CEDAR-ORBITAL-987` existed only in Source material; successful visible candidature search by that full-text-only phrase; and dirty-Source protection where attempted top-level navigation to Settings followed by cancelling the discard confirmation kept the Source editor and unsaved draft intact. No AAAAT defect or production change was produced.

The same run could inspect but not operate the native Windows folder picker because the available computer-input driver lacked usable pointer geometry and keyboard focus remained trapped in the picker search box. Therefore graphical Settings backup/restore, post-restore workspace switching/usability, and restored full-text Source retrieval remain **unproven**, not failed. Existing packaged recovery service evidence remains valid but does not substitute for this explicit graphical acceptance step.

Next: use a runtime lane with functioning native Windows folder-dialog input to perform only the remaining Settings backup/restore journey and confirm the restored workspace is immediately usable and can again find `GLASS-CEDAR-ORBITAL-987`. Do not repeat already-proven Source creation/search, dirty-draft behavior, package matrices, VS Code setup, or TeX portability unless new evidence contradicts them. If that final graphical proof passes, reconcile the acceptance result and integrate this evidence-only Mission. If it exposes a concrete AAAAT defect, correct only the smallest blocker before declaring real-use acceptance.
