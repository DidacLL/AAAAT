# Active Mission — Free-chat setup guidance

**Active:** [Issue #183](https://github.com/DidacLL/AAAAT/issues/183) on `feature/setup-free-chat-guidance`, based on integrated shared setup/environment capabilities `160e2ff4e7ffe3b385e1fe30919608da72d0898b`.

## Outcome

Generate copyable `installer.ai` and `configurator.ai` free-chat guidance directly from the existing read-only setup snapshot. Keep the guidance understandable to a non-developer, preserve working local software, preserve complete no-AI use, and make every configuration change remain an explicit user action in normal AAAAT Settings.

## Boundaries

This slice is pure guidance/UX inside the existing ADR 0019 environment boundary. It adds no preload/main IPC, filesystem/process/shell authority, installation or configuration mutation, PATH editing, provider/host integration, configuration import/export, research capability, migration or dependency. Generated guidance contains setup readiness/routing facts only: no workspace path, TeX version string, connection name, endpoint/model, durable local ID, or career/application content.

This is Class B because it is a local UX/pure-transformation choice inside already-established OWNER_INTENT/SPEC meaning. No new ADR or independent Class C review is required unless implementation expands into a shared or privileged architectural boundary.

## Evidence and continuation

Issue #181 / PR #182 is integrated at `160e2ff4e7ffe3b385e1fe30919608da72d0898b`. Verify #434 passed typecheck, lint, 52 test files / 159 active tests, Windows/macOS/Linux packaged runtime smoke and the aggregate Verification gate; LaTeX portability was correctly not selected.

Next: finish Issue #183, run focused guidance/UI tests plus normal Verify, correct concrete findings, perform bounded Integrator review, and integrate when accepted.
