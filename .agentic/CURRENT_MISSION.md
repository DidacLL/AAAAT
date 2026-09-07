# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204) on `agentic/cohesive-ux`, based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#205](https://github.com/DidacLL/AAAAT/issues/205) — audit the current packaged UX and define the interaction architecture before changing production UI.

## Outcome

Replace the additive-development presentation with one coherent product UX and information architecture. Define what the user should see, where it belongs, when it appears, and how primary work differs from setup/recovery/optional-AI concerns. Preserve the accepted product capabilities and hard gates.

The intended feel is simple and legible for non-technical users while remaining fully editable, inspectable and auditable for advanced users. Treat historical owner UI suggestions as evidence of the underlying problem and desired feel, not as mandatory mechanics when a clearer solution exists.

## UX authority and recovered history

`docs/UX_EXPECTATIONS.md` now translates current `OWNER_INTENT` / `SPEC` into the active UX expectations for this Mission. `docs/UX_HISTORY_RECONCILIATION.md` records the useful v1 lineage and explicitly separates durable lessons from superseded Smart/Detailed/User modes, wx layouts, task queues, fixed field catalogues and other historical mechanics.

Historical sources reviewed include v1 `BasicAppRequirements`, `AAAAT Product Summary`, the approved Smart View and Detailed View planning/requirements trace from PR #37, the v1 drift audit, and the later M6 #127 Focus/progressive-disclosure research. Current owner authority supersedes all of them where they conflict.

## Execution order

Issue #205 is audit/design only. Inspect the real packaged application at default and minimum supported window sizes; walk first-run/workspace choice, Candidatures/Sources, ToDos, Profile, Documents, AI assist and Settings/setup/recovery; map current hierarchy and user journeys; then define the proposed navigation, destination boundaries, progressive-disclosure rules and first-run/empty/ready/error states. Do not start with isolated CSS or component fixes.

For each screen ask what the user is trying to accomplish, what currently dominates attention, what is primary/secondary/contextual/advanced, whether implementation terminology is leaking, whether ordinary users can proceed without technical knowledge, and whether advanced users can reach the complete authoritative information and controls without leaving the graphical product.

Only after #205 establishes the interaction contract should a separate bounded implementation Issue reorganize renderer composition/styles. The broad implementation is Class C and requires independent Reviewer plus Skeptical Simplifier assessment before integration. Do not introduce a UI framework, state framework, generic navigation abstraction or dependency without a demonstrated need.

## Evidence to reuse

Integrated alpha acceptance PR #203 is merged at `90b578064030ce863c9eb912f854f08559fd4777`; Issue #202 is closed. Existing package/runtime, security, backup/recovery, VS Code, Source retrieval, dirty-draft and TeX evidence remains authoritative unless this Mission changes the affected surface. The acceptance screenshots are evidence of the current additive UX problem, not a request for a local first-run patch.

## Next

Run the packaged UX audit from the current `agentic/cohesive-ux` head using `docs/UX_EXPECTATIONS.md` as the current contract and `docs/UX_HISTORY_RECONCILIATION.md` as historical context. Capture representative screenshots/observations at default and declared minimum window sizes, then write the concise proposed information architecture/design note on this same branch. Do not modify production UI in #205.