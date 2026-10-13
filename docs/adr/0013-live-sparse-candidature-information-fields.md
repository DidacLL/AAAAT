# ADR 0013 — Sparse user-maintainable application information

Status: accepted technical boundary, updated for current application and AI interaction. Historical fixed working briefs and lifecycle columns are discarded development representations.

## Decision

The application root stores structural identity, archive state and timestamps. Ordinary information uses domain-specific field definitions, independent presentation/AI preferences and sparse field values. Missing values are normal.

Shipped definitions are editable defaults. A field's stable local identity preserves its values when labels change; neither labels nor system keys create hidden semantic identity. Adding legitimate user information does not require a code/schema change for each profession.

Built-in and custom values use the same typed set/clear services. Definitions validate value shape and choices. Unsafe type/cardinality/choice changes are rejected while affected values exist; retirement is distinct from clearing a value. User-controlled favourites, order and prominence form local presentation rather than a second application model.

Sources are an explicit first-class collection. Tags are shared glossary objects with application associations, not duplicated definitions. Fixed priorities, preparation blocks, lifecycle stages and next actions are not privileged domain architecture.

AI extraction is scoped to the currently requested enabled fields and their permissions. Provider references are operation-local; returned values resolve through the current field contract and normal services. Valid untouched empty values can be applied by the requested action; existing/newer manual edits preserve precedence. A focused request remains separate from permission to use information.

Privacy projection precedes disclosure. It can expose, omit or locally substitute information as supported by the operation. Local restoration and validation must preserve the intended data without disclosing authoritative private values. Token spelling and intermediate identifiers are implementation, not product meaning.

Current schemas are corrected directly. There is no development-migration history, compatibility projection or generic entity/attribute framework. Contracts and service validation protect domain shape; historical tests and arbitrary old fixture limits do not establish product requirements.

## Consequences

Applications can remain sparse or Source-only. Different professions share one understandable information model. The same retained content drives recognition covers and ordinary editing. Manual use is complete; optional AI assists the current task without gaining field-definition, corpus-query or generic mutation authority.
