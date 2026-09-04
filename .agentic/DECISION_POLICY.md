# Decision Policy

## Product Meaning check

Before Class A/B/C/D classification, ask:

> Does this introduce, remove, privilege, prohibit or redefine user-facing product meaning?

If **no**, classify the technical/architectural decision normally below.

If **yes**, the product meaning must trace to `docs/OWNER_INTENT.md` or to an unambiguous derived requirement in `docs/SPEC.md`. If no such authority exists, the agent must not invent the product decision. It is a Product Owner question regardless of patch size, reversibility, or apparent implementation simplicity.

This check does not create another decision class. Once product meaning is established, Class A/B/C/D still describes the architectural significance of the implementation decision.

Within established product meaning, the concrete syntax, generator, collision strategy, and restoration implementation for privacy replacement/tokenization are normally Class A implementation details. Do not elevate them into an architectural security decision merely because an AI operation uses them. The durable implementation boundary is normal local persistence, disclosure projection, typed validation, and operation-specific mutation/conflict policy; it does not make an AI result authoritative over the user. Likewise, using explicitly scoped retained Source material is an operation-level product decision, not a mandate for a generic Source-selection or AI-security framework.

Decision class follows the architectural significance of the decision actually made, not patch size or the mere presence of a particular file type. Builder classification is provisional; Reviewer or Integrator raises it when the final design materially changes an architectural boundary.

## Class A — Implementation detail

Examples: names, local component structure, query formulation, fixtures, and small implementation choices inside already-established product meaning.

Builder and Reviewer resolve. No ADR. No owner involvement unless the Product Meaning check is unresolved.

## Class B — Local design choice

Examples: two reasonable bounded APIs, local UX composition that implements established product meaning, or a small internal contract.

Integrator resolves. Use a temporary expert committee only when disagreement remains materially unresolved. No owner involvement unless the Product Meaning check is unresolved.

## Class C — Architectural but bounded and reversible

Examples: a significant runtime dependency, meaningful shared-contract or database-representation change, a demonstrated module/process boundary, or a material build-integration change.

Class C requires independent review and Integrator approval. Add an ADR when the change introduces or changes a durable architectural decision. Invoke the Skeptical Simplifier when material complexity is introduced. Class C may be resolved autonomously only after product meaning is already authoritative.

## Class D — Constitutional

Examples: replacing Electron or SQLite; making AI or cloud infrastructure mandatory; abandoning local ownership or portable LaTeX; dropping the pdfLaTeX baseline; weakening renderer isolation; introducing a general plugin/workflow/agent platform; changing canonical-profile semantics; or sending previously local private data remotely by default.

Requires an owner decision. Create an `owner-decision` Issue containing the concrete problem, evidence, alternatives, committee recommendations, simplest viable option, consequences, and proposed ADR. Do not ask a vague architectural question.
