# Active Mission — Several named local AI connections

**Active:** [Issue #175](https://github.com/DidacLL/AAAAT/issues/175) on `feature/named-ai-connections`, based on integrated local candidature corpus search `a5c4bd1ffb01f14b0711e05592b6ec15803402c9`.

## Outcome

Allow a workspace to retain several named local, keyless, loopback OpenAI-compatible AI connections and one explicit nullable default. Existing AI operations continue to use exactly one connection at a time: the selected default. Manual AAAAT remains fully usable with no connection or no default.

## Boundaries

Keep the existing provider, privacy projection, operation contracts and mutation rules unchanged. Use the existing machine-local `ai-connection.json` boundary, still excluded from workspace backup. Do not add remote authentication, API keys, OAuth, credential storage, provider registries, capability-discovery frameworks, automatic routing/fallback, per-operation defaults, new AI operations, config import/export redesign, database migrations or new dependencies. There is no real-user v2 compatibility baseline, so correct the development-era single-connection file format directly rather than adding compatibility machinery.

This is Class C because it changes durable AI-connection configuration and the privileged default-selection semantics shared by current AI operations. ADR 0017 records the plural named-connection and no-fallback boundary. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if material new abstraction appears.

## Evidence and continuation

Issue #172 / PR #174 is integrated at `a5c4bd1ffb01f14b0711e05592b6ec15803402c9`; Verify #417 passed Fast verification with 46 test files / 145 active tests, Windows/macOS/Linux packaged release/runtime smoke and the aggregate Verification gate. LaTeX portability was correctly not selected for that search-only change.

Next: finish Issue #175, run focused connection service/API/settings and existing AI privacy/provider tests plus impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
