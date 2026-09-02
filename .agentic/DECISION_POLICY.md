# Decision Policy

## Class A — Implementation detail

Examples: names, local component structure, query formulation, fixtures, and small implementation choices.

Builder and Reviewer resolve. No ADR. No owner involvement.

## Class B — Local design choice

Examples: two reasonable bounded APIs, local UX behavior, or a small internal contract.

Integrator resolves. Use a temporary expert committee only when disagreement remains materially unresolved. No owner involvement.

## Class C — Architectural but bounded and reversible

Examples: a significant runtime dependency, meaningful shared-contract or database-representation change, a demonstrated module/process boundary, or a material build-integration change.

Requires independent expert review, Skeptical Simplifier review, a short ADR, and Integrator approval. It may be resolved autonomously.

## Class D — Constitutional

Examples: replacing Electron or SQLite; making AI or cloud infrastructure mandatory; abandoning local ownership or portable LaTeX; dropping the pdfLaTeX baseline; weakening renderer isolation; introducing a general plugin/workflow/agent platform; changing canonical-profile semantics; or sending previously local private data remotely by default.

Requires an owner decision. Create an `owner-decision` Issue containing the concrete problem, evidence, alternatives, committee recommendations, simplest viable option, consequences, and proposed ADR. Do not ask a vague architectural question.
