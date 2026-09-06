# Active Mission — Shared setup environment capabilities

**Active:** [Issue #181](https://github.com/DidacLL/AAAAT/issues/181) on `feature/setup-environment-capabilities`, based on integrated validated AI operation routing `fbd43708367c04885eeb7b4e39bbd7993a08ca5c`.

## Outcome

Expose one read-only structured setup-environment snapshot for the configured workspace so graphical Settings can honestly show current workspace, local TeX and validated AI-operation readiness. Reuse the existing authoritative AI routing state and detect existing TeX tools rather than introducing another configuration store or installer engine.

## Boundaries

This slice is status/projection only. Probe only the fixed known `latexmk` and `pdflatex` executables with fixed bounded version arguments and no shell interpolation. Do not install or replace software, edit PATH, expose command/filesystem primitives, generate `installer.ai` / `configurator.ai` artifacts, add remote authentication/provider registries/research, implement configuration import/export, redesign backup/host integration/document rendering, migrate the database or add dependencies.

This is Class C because it establishes the shared setup/environment contract across renderer, preload and privileged main-process software detection. ADR 0019 records the read-only snapshot boundary. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if material generic setup abstraction appears.

## Evidence and continuation

Issue #179 / PR #180 is integrated at `fbd43708367c04885eeb7b4e39bbd7993a08ca5c`. Verify #431 passed typecheck, lint, 49 test files / 153 active tests, selected Linux packaged build/runtime smoke and the aggregate Verification gate; LaTeX and the broader platform matrix were correctly not selected by impact policy.

Next: finish Issue #181, run focused environment service/API/Settings tests plus existing AI connection and LaTeX runner tests and impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
