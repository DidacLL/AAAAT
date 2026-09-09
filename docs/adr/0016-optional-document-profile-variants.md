# ADR 0016 — Optional document profile variants

- Status: Accepted for Issue #165
- Date: 2026-09-06
- Decision class: C
- Issue: [#165](https://github.com/DidacLL/AAAAT/issues/165)

## Context

`PRODUCT_DEFINITION.md` establishes reusable professional information and independently usable document production. This ADR applies that product meaning to the technical variant architecture; it does not define product meaning. The current development document schema and contracts instead require a saved variation for every CV or cover letter, which blocks ordinary document creation from professional information alone.

AAAAT has no real-user v2 compatibility baseline, so the obsolete development representation should be corrected directly rather than preserved through a migration chain or hidden compatibility object.

## Decision

`documents.variant_id` is nullable. A null relation means the document resolves directly from stored professional information. A non-null relation means the named saved variation supplies its existing difference layer. Document-specific selection, ordering and content overrides remain the final difference layer in both cases.

The shared document contract represents this explicitly as `variantId: string | null`. AAAAT does not create an invisible, default or synthetic profile variant. Existing named variants remain explicit domain objects and retain the existing foreign-key restriction while referenced by a document.

Document rendering, AI document assistance, candidature association and retained-artifact capture consume the same resolved document/professional-information basis and do not gain a second document model.

## Consequences

- A user can create, edit and render a CV or cover letter with professional information and zero saved variations.
- Named saved variations remain optional and preserve their current difference semantics.
- Document-specific rules work identically over either direct or variation-resolved items.
- The development migration defining `documents` is corrected in place; no pre-baseline compatibility machinery is introduced.
- No new abstraction or dependency is required.
