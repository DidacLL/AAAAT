# Decision Policy

Decision classes describe the minimum review required by the decision being made, not the apparent size of its implementation.

## Class A — Implementation detail

Examples: names, local component structure, query formulation, fixtures, and small implementation choices.

Builder and Reviewer resolve. No ADR. No owner involvement.

## Class B — Local design choice

Examples: two reasonable bounded APIs, local UX behavior, or a small internal contract that does not cross a Class C lower bound.

Integrator resolves. No ADR or owner involvement unless the decision grows beyond the local scope.

## Class C — Architectural but bounded and reversible

The following are Class C when introduced or materially changed:

- durable schema or storage representation;
- shared desktop/preload contracts;
- production runtime dependencies;
- process or privilege boundaries;
- material build or packaging integration.

A small patch does not downgrade one of these decisions. An accepted ADR may already cover the exact decision; implementation that stays inside it does not need a duplicate ADR.

Class C requires a deliberate review pass, a Skeptical Simplifier pass, and a short ADR when a new architectural decision is being made. In this single-maintainer project these passes may be performed by the same maintainer or agent in sequence; a separate identity or reasoning context is not required.

## Class D — Constitutional

Examples: replacing Electron or SQLite; making AI or cloud infrastructure mandatory; abandoning local ownership or portable LaTeX; dropping the pdfLaTeX baseline; weakening renderer isolation; introducing a general plugin/workflow/agent platform; changing canonical-profile semantics; or sending previously local private data remotely by default.

Requires an owner decision. Create an `owner-decision` Issue containing the concrete problem, evidence, alternatives, simplest viable option, consequences, and proposed ADR. Do not ask a vague architectural question.
