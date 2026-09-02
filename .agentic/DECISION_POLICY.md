# Decision Policy

Decision classes describe the minimum review required by the decision being made, not the apparent size of its implementation. A small patch does not lower the class of a decision whose representation or boundary is Class C.

## Class A — Implementation detail

Examples: names, local component structure, query formulation, fixtures, and small implementation choices.

Builder and Reviewer resolve. No ADR. No owner involvement.

## Class B — Local design choice

Examples: two reasonable bounded APIs, local UX behavior, or a small internal contract that does not cross a Class C lower bound.

Integrator resolves. Use a temporary expert committee only when disagreement remains materially unresolved. No owner involvement.

## Class C — Architectural but bounded and reversible

Examples include a significant runtime dependency, meaningful shared-contract or database-representation change, a demonstrated module/process boundary, or a material build-integration change.

The following are Class C lower bounds when introduced or materially changed:

- durable schema or storage representation;
- shared desktop/preload contracts;
- production runtime dependencies;
- process or privilege boundaries;
- material build or packaging integration.

A change matching one of these lower bounds cannot be downgraded merely because the code is small, reuses the approved architecture, or appears easy to reverse. An accepted ADR may pre-authorize the exact representation or boundary; ordinary implementation that stays wholly inside that accepted decision need not create a duplicate ADR. Changing the accepted decision remains Class C.

Class C requires a Reviewer pass from a reasoning context separate from the Builder, a Skeptical Simplifier pass, a short ADR for the bounded decision, and Integrator approval. Satisfy those requirements with the simplest adequate existing execution surface; they do not justify additional process machinery or ceremony that the bounded Issue does not require. Class C may be resolved autonomously.

## Class D — Constitutional

Examples: replacing Electron or SQLite; making AI or cloud infrastructure mandatory; abandoning local ownership or portable LaTeX; dropping the pdfLaTeX baseline; weakening renderer isolation; introducing a general plugin/workflow/agent platform; changing canonical-profile semantics; or sending previously local private data remotely by default.

Requires an owner decision. Create an `owner-decision` Issue containing the concrete problem, evidence, alternatives, committee recommendations, simplest viable option, consequences, and proposed ADR. Do not ask a vague architectural question.
