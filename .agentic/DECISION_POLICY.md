# Decision Policy

Decision class follows the architectural significance of the decision actually made, not patch size or the mere presence of a particular file type. Builder classification is provisional; Reviewer or Integrator raises it when the final design materially changes an architectural boundary.

## Class A — Implementation detail

Examples: names, local component structure, query formulation, fixtures, and small implementation choices.

Builder and Reviewer resolve. No ADR. No owner involvement.

## Class B — Local design choice

Examples: two reasonable bounded APIs, local UX behavior, or a small internal contract.

Integrator resolves. Use a temporary expert committee only when disagreement remains materially unresolved. No owner involvement.

## Class C — Architectural but bounded and reversible

Examples: a significant runtime dependency, meaningful shared-contract or database-representation change, a demonstrated module/process boundary, or a material build-integration change.

Class C requires independent review and Integrator approval. Add an ADR when the change introduces or changes a durable architectural decision. Invoke the Skeptical Simplifier when material complexity is introduced. Class C may be resolved autonomously.

## Class D — Constitutional

Examples: replacing Electron or SQLite; making AI or cloud infrastructure mandatory; abandoning local ownership or portable LaTeX; dropping the pdfLaTeX baseline; weakening renderer isolation; introducing a general plugin/workflow/agent platform; changing canonical-profile semantics; or sending previously local private data remotely by default.

Requires an owner decision. Create an `owner-decision` Issue containing the concrete problem, evidence, alternatives, committee recommendations, simplest viable option, consequences, and proposed ADR. Do not ask a vague architectural question.
