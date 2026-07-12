# Testing AAAAT

AAAAT tests protect behavior, persistence, privacy, authority, state transitions, packaging, and runtime boundaries.

## Test layers

1. **Domain and storage** — real temporary SQLite databases; persisted results, idempotence, rollback, and failure behavior.
2. **Application commands** — validation, normalization, mutation allowlists, not-found behavior, and durable writes.
3. **Projection and state** — toolkit-neutral data selection, permissions, selection fallback, column state, and view transitions.
4. **Desktop adapter** — minimal wx smoke tests for construction, events, save/reload, selection preservation, and read-only controls.
5. **Agent contract** — opaque handles, least-privilege context, narrow acknowledgements, and internal write binding.
6. **Release engineering** — executable CLI workflows, built-package resources, optional dependency isolation, and privacy guards.

## Evidence rule

A test must execute a supported workflow or a public/application contract and observe a meaningful result.

Good examples:

- create a task, export its packet, submit an external result, verify suggested review state, apply it, and verify the bound candidature changed;
- block an optional dependency, execute the core workflow that must remain available, and verify the workflow succeeds;
- run a user-configured command backend and verify success and failure affect durable task state correctly;
- build a projection from persisted data and verify user-relevant values and selection state.

Insufficient evidence:

- asserting that a declaration says a feature is optional;
- testing a compatibility descriptor against rules defined by the same descriptor;
- scanning dictionaries for suspicious words instead of constructing a bounded schema;
- checking that a module is absent from `sys.modules` without executing the workflow that depends on the boundary;
- asserting production source line counts, private names, UI prose, or widget hierarchy;
- checking a callable exists without invoking it.

## Contract style

For extensible internal payloads, assert the fields required by the workflow and the resulting behavior. Use exact equality only for deliberately closed, versioned wire formats.

For privacy and authority, prefer causal tests:

```text
external result contains content
→ AAAAT stores it as suggested
→ candidature remains unchanged
→ explicit apply uses stored task binding
→ candidature changes
```

This is stronger than testing a blacklist of possible identifier names.

## UI policy

The current canonical UI is the local wx desktop dashboard. Browser renderer tests are compatibility smoke tests only until a browser UI is deliberately implemented again.

Desktop behavior should be tested primarily through pure state, projections, application commands, and persisted storage. wx-specific tests should verify observable event outcomes rather than private implementation structure.

## Quality gate

A new or rewritten suite is credible only when representative implementation faults would break the tested workflow, including:

- a task result being applied before review;
- a result being applied to the wrong candidature;
- a command backend failure still creating a result;
- a note or field update not persisting;
- selected candidature being lost after refresh;
- package resources being absent;
- an optional UI dependency preventing core projection or agent-runtime workflows.
