# Guardrails audit

## Problem

Repository hygiene and PR actions were handled too loosely. A checklist is not a control, and direct writes to `main` are not acceptable for normal development.

## Enforceable controls added in this branch

- `tools/repo_guard.py` checks tracked files and required `.gitignore` rules.
- CI runs the guard before compile/tests/MCP validation.
- `tests/test_repo_guard.py` protects guard behavior.
- `.github/pull_request_template.md` is removed because it was a weak cosmetic patch.
- The accidental `dummy` file is removed through this branch, not by another direct `main` write.

## Still required in GitHub settings

Protect `main` with required pull requests and required status check `contract`.

## Operating rule

No assistant or agent should mutate PR state or write to `main` without explicit approval for the exact operation.
