# Active Mission — Validated AI operation capabilities

**Active:** [Issue #179](https://github.com/DidacLL/AAAAT/issues/179) on `feature/ai-operation-capabilities`, based on integrated named local AI connections `bca548e3d1ff1c25a228e93c5baf9cabc29314f0`.

## Outcome

Route each existing AAAAT AI operation only through a configured connection that has been explicitly validated for that operation. Allow an explicit per-operation default while retaining the existing general default only as a convenience fallback when it is validated for the requested operation.

## Boundaries

Keep the existing local/keyless loopback OpenAI-compatible provider, operation prompts, privacy projection, typed result validation and mutation/conflict policies unchanged. Capability validation uses synthetic non-user context and records contract compatibility, not model quality. Do not add remote authentication, provider registries, model catalogues, benchmarking, automatic routing/fallback, research, new AI operations, setup wizards, config import/export redesign, database migrations or dependencies. There is no real-user v2 compatibility baseline, so correct the development connection configuration directly to version 3 rather than adding migration machinery.

This is Class C because it changes durable AI connection capability configuration and privileged routing semantics shared by all current AI operations. ADR 0018 records the validation/default boundary. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if material new abstraction appears.

## Evidence and continuation

Issue #175 / PR #178 is integrated at `bca548e3d1ff1c25a228e93c5baf9cabc29314f0`. The reviewed duplicate single-connection mutation path was removed before merge. Verify #422 passed Fast verification with 49 test files / 151 active tests, Windows/macOS/Linux packaged release/runtime smoke and the aggregate Verification gate; LaTeX portability was correctly not selected.

Next: finish Issue #179, run focused capability/default/routing/API/settings tests plus existing AI privacy/provider tests and impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
