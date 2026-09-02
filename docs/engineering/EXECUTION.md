# Execution and delegation guide

This file is advisory and non-authoritative. It records reproducible execution quirks and the minimum handoff format for changing engineering surfaces. It may not change the SPEC, Constitution, Mission, Issue boundary, product contract, or decision class.

## Current execution split

For the current M0 launch:

- **Codex desktop:** repository inspection and editing, shell commands, dependency installation, tests, Electron startup, packaging, browser/visual checks, and recoverable local Git operations.
- **ChatGPT Classic with the full-permissions GitHub connector:** GitHub Issue and Pull Request administration, independent review publication, required-check inspection, merge, and optional repository metadata that the current Codex connector cannot manage.

The split describes current tool access, not AAAAT architecture. A later capable surface may complete either lane without changing the product or harness.

## Standard handoff contract

Do not create a new handoff file for each task. Pass one bounded message containing:

```text
Repository: owner/name
Authority: SPEC, current Mission, accepted ADRs, and Issue URL
Goal: one observable outcome
Base and branch: exact refs; never rewrite protected or recovery history
In scope: smallest complete work
Out of scope: explicit exclusions
Evidence already produced: commands, commits, and artifacts
Remaining actions: exact GitHub or review operations
Required checks: named checks and runtime evidence
Return: URLs, commit SHA, check conclusions, review findings, merge SHA, blockers
Recovery rule: preserve main, tags, and reachable commits; no force-push or history deletion
```

The recipient must inspect the named Issue and branch rather than infer state from the handoff. It must not broaden scope, create a repository task database, or commit prompts, transcripts, acceptance ledgers, or coordination reports.

## Windows mapped-drive working directory

- **Applies to:** the 2026-09-02 Codex desktop sandbox with this repository on `V:`.
- **Symptom:** shell commands supplied with the repository `workdir` started in `C:\`.
- **Safe workaround:** use exact absolute paths, PowerShell `-LiteralPath`, and `git -C <exact-repository>`; verify location before a relative mutation.
- **Avoid:** recursive relative search or mutation before location is confirmed.
- **Retire when:** the execution host reliably honors the mapped-drive working directory.

## Patch helper on the mapped drive

- **Evidence date:** 2026-09-02.
- **Symptom:** the patch helper refused the repository because its path crosses the mapped-drive reparse boundary; `git apply` also could not match LF worktree content through PowerShell's CRLF pipeline.
- **Safe workaround:** stage the bounded path, create the desired blob through `git hash-object`, update that exact index entry, and materialize it with `git checkout-index`; inspect the staged diff immediately.
- **Avoid:** broad recursive rewrites, untracked temporary source copies, or bypassing Git recovery.
- **Retire when:** the patch helper accepts the mapped workspace directly.

## Git ownership under the managed sandbox identity

- **Applies to:** Git commands executed as a sandbox identity different from the desktop owner.
- **Symptom:** Git reports dubious repository ownership.
- **Safe workaround:** use `git -c safe.directory=<exact-repository> -C <exact-repository> ...` per invocation.
- **Verification:** the command succeeds without changing global configuration.
- **Avoid:** a global wildcard `safe.directory` exception.
- **Retire when:** repository ownership and execution identity match or the host handles the boundary safely.

## GitHub coordination tools

- **Evidence date:** 2026-09-02.
- **Observed:** `gh` is not installed. The current Codex GitHub connector does not expose every repository-administration operation.
- **Safe workaround:** send the standard handoff to ChatGPT Classic with the full-permissions GitHub connector for unsupported lifecycle and metadata operations.
- **Avoid:** duplicating Issues or milestones in `.agentic/STATE.json` or another local task database.
- **Retire when:** the active execution surface exposes all required GitHub operations.

## Mapped-drive Playwright command shim

- **Evidence date:** 2026-09-02.
- **Symptom:** an npm script that invokes the Playwright command shim may fail before discovery with a Windows filename or volume-label error on the mapped workspace, while the same CLI and config succeed with absolute paths.
- **Safe workaround:** invoke the project Playwright CLI with the active Node executable and absolute CLI/config paths. Keep the portable npm script unchanged for ordinary shells and GitHub Actions.
- **Avoid:** weakening packaged Electron fuses to make Playwright's Node-inspector launcher work; the packaged smoke attaches to a temporary Chromium debugging endpoint instead.
- **Retire when:** package scripts reliably inherit the mapped workspace as their process directory.

## npm version identity

- **Evidence date:** 2026-09-02.
- **Observed:** the exact npm executable reports npm 11.12.1, while inherited user-agent metadata makes npm engine diagnostics and Forge display npm 8.13.1.
- **Safe workaround:** trust the invoked executable plus the lockfile, use `npm ci`, and let CI provision Node/npm independently. Do not relax the repository engine range to match stale metadata.
- **Retire when:** the host no longer injects stale npm user-agent metadata.

## PowerShell npm wrapper

- **Applies when:** the `npm.ps1` wrapper touches inaccessible user-scoped paths or script policy blocks it.
- **Safe workaround:** invoke `npm.cmd` directly and verify the same package-lock-based command.
- **Avoid:** disabling system-wide PowerShell security policy for one repository.
- **Retire when:** the wrapper executes normally in the active host.

## Bundled skill validator dependency

- **Evidence date:** 2026-09-02.
- **Symptom:** `skill-creator/scripts/quick_validate.py` is available, but its bundled Python runtime may not include PyYAML and fails with `ModuleNotFoundError: yaml`.
- **Safe workaround:** install a pinned PyYAML wheel into an ignored workspace-temporary target, add that target to `sys.path` only for the validator process, run validation, verify the result, then remove the temporary target.
- **Avoid:** changing global Python packages or silently skipping validation.
- **Retire when:** the active validator runtime includes its declared dependency.
