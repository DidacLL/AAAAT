# Active Mission — Cohesive product UX and information architecture

**Mission:** [Issue #204](https://github.com/DidacLL/AAAAT/issues/204) on `agentic/cohesive-ux`, based on accepted alpha main `90b578064030ce863c9eb912f854f08559fd4777`.

**Current bounded Issue:** [#205](https://github.com/DidacLL/AAAAT/issues/205) — audit the current packaged UX and define the interaction architecture before changing production UI.

## Outcome

Replace the additive-development presentation with one coherent product UX and information architecture while preserving accepted product capabilities and hard gates. The intended feel is simple and legible for non-technical users while remaining fully editable, inspectable and auditable for advanced users. Historical owner UI suggestions preserve intent/feel, not mandatory mechanics when a clearer solution exists.

## UX contract

- `docs/UX_EXPECTATIONS.md` — active UX expectations derived from current Owner Intent/SPEC.
- `docs/UX_HISTORY_RECONCILIATION.md` — v1/M6 lineage reconciled as research evidence, with superseded mechanics called out.
- `docs/UX_INFORMATION_ARCHITECTURE.md` — proposed coherent IA grounded in the current renderer source and accepted product semantics.

The proposed primary work destinations are Opportunities, Documents, Career and ToDos. Settings is secondary/global administration. `AI assist` is not a primary destination: assistance moves contextually to the Opportunity/Source/Information/Document/Career task it assists, while connection/host setup remains in Settings. First run centers Create/Open workspace with recovery secondary. Advanced field/Focus/privacy/source/portability controls remain fully reachable through progressive disclosure rather than dominating ordinary work.

## Current-source audit result

The current additive composition is confirmed in production source: the shell presents Candidatures, ToDos, Profile, Documents, AI assist and Settings with equal top-level weight; Candidatures appends optional AI comparison/extraction below the ordinary workspace; Profile stacks Career Context above the canonical/variant editor; Documents combines writing, profile differences, retained artifacts, source ownership and assistant-access controls; Settings stacks environment status, free-chat guidance, backup/recovery and AI connection administration.

These are placement/hierarchy findings, not requests to remove the underlying capabilities.

## Evidence to reuse

Integrated alpha acceptance PR #203 is merged at `90b578064030ce863c9eb912f854f08559fd4777`; Issue #202 is closed. Existing package/runtime, security, backup/recovery, VS Code, Source retrieval, dirty-draft and TeX evidence remains authoritative unless this Mission changes the affected surface. The prior first-run screenshots remain evidence of the current additive layout problem rather than a request for an isolated CSS patch.

## Remaining #205 gate

Perform one bounded packaged visual challenge of `docs/UX_INFORMATION_ARCHITECTURE.md` at the normal/default window and declared minimum `720×600`.

Walk only enough of first run, Opportunities/Sources/Focus, ToDos, Career/Profile, Documents, contextual AI surfaces and Settings/setup/recovery to answer whether the proposed hierarchy misses a real user need or creates a contradiction. Record screenshots/brief observations, including keyboard/reflow concerns. Do not modify production UI and do not rediscover already-reconciled product history.

If no material contradiction is found, close #205 with the IA note and runtime evidence, then open the first bounded renderer-recomposition Issue under #204. The implementation is Class C and requires independent Reviewer plus Skeptical Simplifier assessment before integration. Do not add a UI framework, state framework, generic navigation abstraction or dependency without demonstrated need.