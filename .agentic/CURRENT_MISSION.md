# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204) on `agentic/cohesive-ux`, based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#205](https://github.com/DidacLL/AAAAT/issues/205) — audit the current packaged UX and define the interaction architecture before changing production UI.

## Outcome

Replace the additive-development presentation with one coherent product UX and information architecture. Define what the user should see, where it belongs, when it appears, and how primary work differs from setup/recovery/optional-AI concerns. Preserve the accepted product capabilities and hard gates.

## Execution order

Issue #205 is audit/design only. Inspect the real packaged application at default and minimum supported window sizes; walk first-run/workspace choice, Candidatures/Sources, ToDos, Profile, Documents, AI assist and Settings/setup/recovery; map current hierarchy and user journeys; then define the proposed navigation, destination boundaries, progressive-disclosure rules and first-run/empty/ready/error states. Do not start with isolated CSS or component fixes.

Only after #205 establishes the interaction contract should a separate bounded implementation Issue reorganize renderer composition/styles. The broad implementation is Class C and requires independent Reviewer plus Skeptical Simplifier assessment before integration. Do not introduce a UI framework, state framework, generic navigation abstraction or dependency without a demonstrated need.

## Evidence to reuse

Integrated alpha acceptance PR #203 is merged at `90b578064030ce863c9eb912f854f08559fd4777`; Issue #202 is closed. Existing package/runtime, security, backup/recovery, VS Code, Source retrieval, dirty-draft and TeX evidence remains authoritative unless this Mission changes the affected surface. The acceptance screenshots are evidence of the current additive UX problem, not a request for a local first-run patch.

## Next

Complete #205 with a concise repository UX/IA design note grounded in the packaged application and current product semantics. If local graphical inspection is needed, use the runtime/computer lane; do not modify production UI in #205.