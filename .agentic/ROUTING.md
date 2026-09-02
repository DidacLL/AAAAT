# Engineering Routing

Use the cheapest adequate execution surface that can produce the evidence required by the current Issue.

## Normal route

Default to a GitHub-backed reasoning/repository surface for requirements interpretation, bounded implementation, source review, documentation, dependency analysis, architecture reasoning, Pull Request work, and GitHub Actions evidence when no local or interactive execution is required.

Being capable of local execution is not by itself a reason to select or remain on an execution-heavy surface. Existing session state, convenience, or already-open tooling do not override the cost-aware routing rule.

GitHub Issues, branches, Pull Requests, reviews, and Actions remain the shared coordination and evidence plane.

## Execution-heavy route

Use a local or interactive execution-capable environment only when the Issue materially requires evidence or iteration that the normal route cannot provide efficiently, including:

- Electron startup and packaged runtime behavior;
- OS-specific packaging or local installer behavior;
- iterative shell/build/environment failures;
- filesystem and process integration;
- browser and visual rendering;
- Playwright interaction;
- TeX installation, compilation, and PDF inspection;
- difficult performance or environment-specific failures.

Select this route because the required evidence is local, interactive, native, or visual—not merely because the execution-capable surface is already active and can also perform repository work.

Delegate the bounded execution task, return its commits/evidence to the same Issue/branch/PR where practical, then resume normal GitHub-backed review and CI.

Provider names describe current tool mappings; they do not define AAAAT architecture or authority.

## Escalation rule

Do not change route after one ordinary CI failure. Read the failure, diagnose it in the normal lane when possible, correct the same Issue/branch/PR, and rerun CI.

Escalate to the execution-heavy route when CI evidence is insufficient, interactive reproduction is required, visual/runtime behavior must be observed, local/native state is part of the contract, or CI-only iteration has become materially inefficient.

Record exactly why the execution-heavy surface was required and what evidence it produced. Do not duplicate coordination into repository state files, task databases, transcripts, or handoff ledgers.

See `../docs/engineering/EXECUTION.md` for the current advisory tool mapping, host workarounds, and standardized delegation contract.
