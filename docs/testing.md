# Testing AAAAT

AAAAT tests protect behavior, persistence, privacy, authority, state transitions, packaging, and runtime boundaries.

## Test layers

1. **Domain and storage** — real temporary SQLite databases; persisted results, idempotence, rollback, and failure behavior.
2. **Application commands** — validation, normalization, mutation allowlists, not-found behavior, and durable writes.
3. **Projection and state** — toolkit-neutral data selection, permissions, selection fallback, column state, and view transitions.
4. **Desktop adapter** — minimal wx smoke tests for construction, events, save/reload, selection preservation, and read-only controls.
5. **Agent contract** — opaque handles, least-privilege context, forbidden data absence, narrow acknowledgements, and internal write binding.
6. **Release engineering** — executable CLI smoke tests, built-package resources, optional dependency isolation, and privacy guards.

## Prohibited substitutes for software tests

Do not test ordinary behavior by asserting:

- production source line counts;
- private method or class names;
- exact user-interface prose;
- widget hierarchy or sizer implementation;
- literal source imports when runtime import tests are possible;
- exact whole dictionaries for extensible internal payloads;
- documentation wording as evidence that a feature works.

Source inspection is reserved for repository privacy/security scanning where execution cannot prove the property directly.

## Contract style

For extensible internal payloads, assert required and forbidden subsets:

```python
assert REQUIRED_FIELDS <= payload.keys()
assert FORBIDDEN_FIELDS.isdisjoint(payload)
```

Use exact equality only for deliberately closed, versioned wire formats.

## UI policy

The current canonical UI is the local wx desktop dashboard. Browser renderer tests are compatibility smoke tests only until a browser UI is deliberately implemented again.

Desktop behavior should be tested primarily through pure state, projections, application commands, and persisted storage. wx-specific tests should verify observable event outcomes rather than private implementation structure.

## Quality gate

A new or rewritten suite is credible only when representative faults are caught, including:

- forbidden agent identifiers leaking;
- read-only writes succeeding;
- note or field updates not persisting;
- selected candidature being lost after refresh;
- unsafe fields being written;
- package resources being absent;
- core imports requiring wxPython;
- static output containing private paths or contact data.
