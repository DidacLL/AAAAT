# ADR 0016 — Optional document profile variants

- Status: Accepted for Issue #165
- Date: 2026-09-06
- Decision class: C
- Issue: [#165](https://github.com/DidacLL/AAAAT/issues/165)

## Context

Owner Intent and the SPEC define document production as canonical professional information plus optional variant differences plus document-specific differences. The current development document schema and contracts instead require a profile variant for every CV or cover letter, which blocks ordinary document creation from canonical information alone.

AAAAT has no real-user v2 compatibility baseline, so the obsolete development representation should be corrected directly rather than preserved through a migration chain or hidden compatibility object.

## Decision

`documents.variant_id` is nullable. A null relation means the document resolves directly from the canonical profile. A non-null relation means the named profile variant supplies its existing difference layer over canonical information. Document-specific selection, ordering and content overrides remain the final difference layer in both cases.

The shared document contract represents this explicitly as `variantId: string | null`. AAAAT does not create an invisible, default or synthetic profile variant. Existing named variants remain explicit domain objects and retain the existing foreign-key restriction while referenced by a document.

Document rendering, AI document assistance, candidature association and retained-artifact capture consume the same resolved document/profile basis and do not gain a second document model.

## Consequences

- A user can create, edit and render a CV or cover letter with canonical profile information and zero variants.
- Named variants remain optional and preserve their current difference semantics.
- Document-specific rules work identically over either canonical or variant-resolved items.
- The development migration defining `documents` is corrected in place; no pre-baseline compatibility machinery is introduced.
- No new abstraction or dependency is required.
