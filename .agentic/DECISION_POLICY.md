# Decision Policy

## Product Meaning check

Before classification ask: does this introduce, remove, privilege, prohibit, or redefine user-facing product meaning?

If yes, trace it to docs/OWNER_INTENT.md or an unambiguous requirement in docs/SPEC.md. If neither establishes it, do not invent it. Prepare one brief owner question with the concern, viable options, and recommended smallest solution.

Once meaning is established, decision class follows architectural significance, not patch size or file type. Reviewer/Integrator may raise Builder classification. Privacy replacement syntax, collision handling, and local restoration are normally Class A details inside the established disclosure boundary. Explicitly scoped Sources are operation-level context when their purpose permits them; neither requires a generic security or Source-selection framework.

## A — implementation detail
Names, local components, queries, fixtures, and equivalent choices inside established meaning. Builder and Reviewer resolve.

## B — local design choice
Two reasonable bounded APIs, local UX composition, or a small internal contract. Integrator resolves; use minimal technical consultation only when material disagreement remains.

## C — architectural, bounded, reversible
A significant dependency, shared contract/database representation, module/process boundary, or material build integration. Requires independent review, Integrator approval, and an ADR for a durable architectural change. Use Simplifier for material complexity. Resolve autonomously after meaning is established.

## D — constitutional
Replacing Electron/SQLite; making AI/cloud mandatory; abandoning local ownership, portable LaTeX, or pdfLaTeX; weakening renderer isolation; introducing a general plugin/workflow/agent platform; changing canonical-profile semantics; or sharing formerly local private data by default. Requires an owner decision with evidence, options, simplest recommendation, consequences, and proposed ADR.
