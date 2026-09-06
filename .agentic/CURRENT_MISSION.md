# Active Mission — Portable local AI setup

**Active:** [Issue #185](https://github.com/DidacLL/AAAAT/issues/185) on `feature/portable-ai-setup`, based on integrated free-chat setup guidance `3ff1088e2d398d7853fb43071550bf946bb5bc64`.

## Outcome

Provide ordinary Settings controls to export and import a small portable local-AI setup file. Preserve named loopback connection definitions and the general default preference while treating local IDs, validated operation capabilities and per-operation defaults as machine-specific state that must be recreated/revalidated after import.

## Boundaries

This slice is AI-setup portability only. It does not claim the entire Accessible setup/recovery destination complete. Do not add a generic configuration framework, workspace-data backup changes, Focus/field preference portability, host-artifact portability, remote authentication/API keys, provider registries, research setup, arbitrary file access, dependencies or database migrations. Renderer calls carry no filesystem paths; main owns fixed save/open dialogs and bounded file handling.

This is Class C because it establishes a durable portable configuration format and two new privileged renderer → preload → main intentions. ADR 0020 records the portability boundary. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if material generic configuration abstraction appears.

## Evidence and continuation

Issue #183 / PR #184 is integrated at `3ff1088e2d398d7853fb43071550bf946bb5bc64`. Verify #436 passed typecheck, lint, 53 test files / 162 active tests, selected Linux packaged-runtime smoke and the aggregate Verification gate; Windows/macOS and LaTeX were correctly skipped by impact policy.

Next: finish Issue #185, run focused portable-setup service/API/Settings tests plus existing AI routing tests and impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
