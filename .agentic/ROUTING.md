# Engineering Routing

Use the cheapest adequate execution surface that can produce the evidence required by the current Issue.

## Normal route

Any capable GitHub-backed development surface may perform requirements interpretation, implementation, tests, documentation, source review, dependency analysis, and bounded architecture reasoning. GitHub Issues, branches, Pull Requests, reviews, and Actions remain the shared coordination and evidence plane.

## Local and interactive route

Use an execution-capable environment when local or interactive evidence materially improves the result, including:

- Electron startup and packaged runtime behavior;
- OS-specific packaging;
- iterative shell/build failures;
- filesystem and process integration;
- browser and visual rendering;
- Playwright interaction;
- TeX installation, compilation, and PDF inspection;
- difficult performance or environment-specific failures.

When one execution surface provides several of these capabilities, it may perform the bounded work directly. Delegate only when another available surface has materially better authority or evidence for the remaining task.

Provider names describe available tools; they do not define AAAAT architecture or authority.

## Escalation rule

Do not change route after one ordinary CI failure. Read the failure, diagnose, correct the same Issue/branch/PR, and rerun CI. Change route when CI evidence is insufficient, interactive reproduction is required, visual/runtime behavior must be observed, or CI-only iteration has become materially inefficient.

Keep the same Issue, branch, and PR where practical. Record exactly why the added execution surface was needed and return the result to normal CI and review.

See `../docs/engineering/EXECUTION.md` for advisory host workarounds and the standardized delegation contract.
